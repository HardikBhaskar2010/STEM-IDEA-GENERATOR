# AI Guidance Service Layer
# Requirements: 3.1, 3.2, 4.4, 7.1, 7.2
# Task: 3.1 Create AIGuidanceService class with basic structure

import logging
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from models.ai_guidance import (
    ChatSession, ChatMessage, ProjectContext, GuidanceRequest, GuidanceResponse,
    ChatRequest, ChatResponse, ContextResponse, HistoryResponse, MessageSender,
    ProjectAnalysis, AIResponseMetadata, AmbiguityAnalysis, FollowUpQuestion, ClarificationRequest,
    TaskStatus, TaskPriority
)
from database.ai_guidance_crud import (
    ChatSessionCRUD, ChatMessageCRUD, AIContextCacheCRUD,
    CreateSessionParams, CreateMessageParams, UpdateSessionParams
)
from services.project_context_service import ProjectContextService

logger = logging.getLogger(__name__)


class AIGuidanceService:
    """
    Main service class for AI Project Guidance functionality
    Coordinates between database operations and AI processing
    Implements generateResponse, analyzeProjectContext, and formatContextForAI methods
    """
    
    def __init__(self):
        self.session_crud = ChatSessionCRUD()
        self.message_crud = ChatMessageCRUD()
        self.context_crud = AIContextCacheCRUD()
        self.project_context_service = ProjectContextService()
        
        # Import OpenRouter client here to avoid circular imports
        try:
            from server import openrouter_client, openrouter_config
            self.openrouter_client = openrouter_client
            self.openrouter_config = openrouter_config
            
            if not self.openrouter_client:
                logger.warning("OpenRouter client not available - AI responses will use fallback mode")
        except ImportError as e:
            logger.error(f"Failed to import OpenRouter client: {e}")
            self.openrouter_client = None
            self.openrouter_config = None
    
    async def generateResponse(self, request: GuidanceRequest) -> GuidanceResponse:
        """
        Generate AI response based on project context and user message
        
        Args:
            request: Guidance request with project ID, user message, and conversation history
            
        Returns:
            AI-generated guidance response with suggestions and next steps
            
        Raises:
            ValueError: If request parameters are invalid
            Exception: If AI service fails
        """
        try:
            # Validate input
            if not request.project_id or not request.user_message:
                raise ValueError("project_id and user_message are required")
            
            # Check cache for similar queries first
            cached_response = await self._checkResponseCache(request.project_id, request.user_message)
            if cached_response:
                logger.info(f"Returning cached response for project {request.project_id}")
                return cached_response
            
            # Get project context
            project_context = await self.analyzeProjectContext(request.project_id)
            
            # Analyze query for ambiguity
            ambiguity_analysis = await self.analyzeQueryAmbiguity(
                request.user_message, 
                project_context, 
                request.conversation_history
            )
            
            # If query is ambiguous, generate clarification request
            if ambiguity_analysis.is_ambiguous and ambiguity_analysis.clarification_needed:
                clarification_request = await self.generateClarificationRequest(
                    request.user_message,
                    ambiguity_analysis,
                    project_context
                )
                
                return GuidanceResponse(
                    response=clarification_request.clarification_prompt,
                    suggestions=ambiguity_analysis.follow_up_questions,
                    next_steps=[f"Please clarify: {q}" for q in ambiguity_analysis.follow_up_questions[:3]],
                    confidence=0.6,  # Lower confidence for ambiguous queries
                    ambiguity_analysis=ambiguity_analysis,
                    clarification_request=clarification_request,
                    requires_clarification=True
                )
            
            # Identify project blockers and generate resource-aware recommendations
            blockers = []
            resource_recommendations = []
            task_prioritization_guidance = None
            
            if project_context:
                # Identify potential blockers (Requirement 6.1)
                blockers = await self.identifyProjectBlockers(project_context)
                
                # Generate resource-aware recommendations (Requirement 6.4)
                resource_recommendations = await self.generateResourceAwareRecommendations(
                    project_context, 
                    request.user_message
                )
                
                # Check if user is asking about task prioritization (Requirement 6.3)
                message_lower = request.user_message.lower()
                prioritization_keywords = [
                    "prioritize", "priority", "what should i do first", "what next", "order",
                    "most important", "urgent", "critical", "schedule", "plan"
                ]
                
                if any(keyword in message_lower for keyword in prioritization_keywords):
                    task_prioritization_guidance = await self.generateTaskPrioritizationGuidance(
                        project_context, 
                        request.user_message
                    )
            
            # Format context for AI
            formatted_context = self.formatContextForAI(project_context, request.conversation_history)
            
            # Enhance context with blocker, recommendation, and prioritization analysis
            if blockers or resource_recommendations or task_prioritization_guidance:
                context_enhancement = "\n=== PROJECT ANALYSIS ===\n"
                
                if blockers:
                    context_enhancement += "Identified Potential Blockers:\n"
                    for blocker in blockers[:5]:  # Limit to 5 most important blockers
                        context_enhancement += f"  - {blocker}\n"
                    context_enhancement += "\n"
                
                if resource_recommendations:
                    context_enhancement += "Resource-Aware Recommendations:\n"
                    for rec in resource_recommendations[:5]:  # Limit to 5 most relevant recommendations
                        context_enhancement += f"  - {rec}\n"
                    context_enhancement += "\n"
                
                if task_prioritization_guidance:
                    context_enhancement += "Task Prioritization Analysis:\n"
                    context_enhancement += f"{task_prioritization_guidance['guidance']}\n\n"
                    
                    if task_prioritization_guidance['prioritized_tasks']:
                        context_enhancement += "Top Priority Tasks:\n"
                        for task_info in task_prioritization_guidance['prioritized_tasks'][:3]:
                            context_enhancement += f"  - {task_info['task'].title} ({task_info['priority_level']}) - {task_info['recommendation']}\n"
                        context_enhancement += "\n"
                
                formatted_context += context_enhancement
            
            # Generate AI response
            if self.openrouter_client:
                ai_response = await self._generate_ai_response_with_openrouter(
                    formatted_context, 
                    request.user_message,
                    project_context
                )
            else:
                # Fallback response when AI service is unavailable
                ai_response = self._generate_fallback_response(request.user_message, project_context)
            
            # Enhance AI response with blocker, recommendation, and prioritization insights
            enhanced_suggestions = ai_response.get("suggestions", [])
            enhanced_next_steps = ai_response.get("next_steps", [])
            
            # Add blocker-related suggestions
            if blockers:
                blocker_suggestions = [
                    "Address identified project blockers to improve progress",
                    "Review overdue tasks and milestones for potential issues"
                ]
                enhanced_suggestions.extend(blocker_suggestions[:2])
            
            # Add resource-aware recommendations to suggestions
            if resource_recommendations:
                enhanced_suggestions.extend(resource_recommendations[:3])
            
            # Add task prioritization suggestions and next steps
            if task_prioritization_guidance:
                if task_prioritization_guidance['recommendations']:
                    enhanced_suggestions.extend(task_prioritization_guidance['recommendations'][:2])
                
                # Add prioritized tasks as next steps
                if task_prioritization_guidance['prioritized_tasks']:
                    priority_next_steps = []
                    for task_info in task_prioritization_guidance['prioritized_tasks'][:3]:
                        if task_info['priority_level'] in ['Critical', 'High']:
                            priority_next_steps.append(f"Work on: {task_info['task'].title}")
                    enhanced_next_steps.extend(priority_next_steps)
            
            # Create structured response
            response = GuidanceResponse(
                response=ai_response.get("response", "I'm here to help with your project."),
                suggestions=enhanced_suggestions[:8],  # Limit to 8 suggestions
                next_steps=enhanced_next_steps[:5],     # Limit to 5 next steps
                confidence=ai_response.get("confidence", 0.8),
                ambiguity_analysis=ambiguity_analysis if ambiguity_analysis.ambiguity_score > 0.3 else None,
                requires_clarification=False
            )
            
            # Cache the response for future similar queries
            await self._cacheResponse(request.project_id, request.user_message, response)
            
            logger.info(f"Generated AI response for project {request.project_id} with {len(blockers)} blockers and {len(resource_recommendations)} recommendations")
            return response
            
        except ValueError as e:
            logger.error(f"Validation error in generateResponse: {e}")
            raise
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            # Return error response instead of raising to maintain service availability
            return GuidanceResponse(
                response="I'm experiencing some technical difficulties. Please try again in a moment.",
                suggestions=["Check your internet connection", "Try rephrasing your question"],
                next_steps=["Wait a moment and try again"],
                confidence=0.1
            )
    
    async def analyzeProjectContext(self, project_id: str) -> Optional[ProjectContext]:
        """
        Analyze and retrieve comprehensive project context for AI processing
        
        Args:
            project_id: ID of the project to analyze
            
        Returns:
            Analyzed project context with current state, tasks, and milestones
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If context analysis fails
        """
        try:
            # Validate input
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # Get project context from ProjectContextService
            context = await self.project_context_service.getProjectContext(project_id)
            
            if context:
                logger.info(f"Analyzed project context for {project_id}: {context.title}")
            else:
                logger.warning(f"No project context found for {project_id}")
            
            return context
            
        except ValueError as e:
            logger.error(f"Validation error in analyzeProjectContext: {e}")
            raise
        except Exception as e:
            logger.error(f"Error analyzing project context for {project_id}: {e}")
            raise
    
    def formatContextForAI(self, project_context: Optional[ProjectContext], conversation_history: List[ChatMessage]) -> str:
        """
        Format project context and conversation history for AI processing
        
        Args:
            project_context: Current project context
            conversation_history: Recent conversation messages
            
        Returns:
            Formatted context string for AI prompt
        """
        try:
            context_parts = []
            
            # Add system prompt
            context_parts.append("You are an AI project guidance assistant helping users with their projects.")
            context_parts.append("Provide helpful, specific, and actionable advice based on the project context.")
            context_parts.append("")
            
            # Add project context if available
            if project_context:
                context_parts.append("=== PROJECT CONTEXT ===")
                context_parts.append(f"Project: {project_context.title}")
                context_parts.append(f"Description: {project_context.description}")
                context_parts.append(f"Current Phase: {project_context.current_phase}")
                context_parts.append(f"Progress: {project_context.progress:.1f}%")
                
                if project_context.goals:
                    context_parts.append(f"Goals:")
                    for goal in project_context.goals[:5]:  # Limit to 5 goals
                        context_parts.append(f"  - {goal}")
                
                # Add active tasks
                if project_context.tasks:
                    active_tasks = [task for task in project_context.tasks 
                                  if task.status != "completed"]
                    if active_tasks:
                        context_parts.append("Active Tasks:")
                        for task in active_tasks[:5]:  # Limit to 5 tasks
                            context_parts.append(f"  - {task.title} ({task.status}, {task.priority} priority)")
                
                # Add upcoming milestones
                if project_context.milestones:
                    upcoming_milestones = [milestone for milestone in project_context.milestones 
                                         if not milestone.completed]
                    if upcoming_milestones:
                        context_parts.append("Upcoming Milestones:")
                        for milestone in upcoming_milestones[:3]:  # Limit to 3 milestones
                            context_parts.append(f"  - {milestone.title} (due: {milestone.target_date.strftime('%Y-%m-%d')})")
                
                context_parts.append("")
            
            # Add conversation history if available
            if conversation_history:
                context_parts.append("=== RECENT CONVERSATION ===")
                # Get last 10 messages for context
                recent_messages = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history
                
                for message in recent_messages:
                    sender_label = "User" if message.sender == MessageSender.USER else "Assistant"
                    context_parts.append(f"{sender_label}: {message.content}")
                
                context_parts.append("")
            
            # Add guidance instructions
            context_parts.append("=== GUIDANCE INSTRUCTIONS ===")
            context_parts.append("- Provide specific, actionable advice")
            context_parts.append("- Reference the project context when relevant")
            context_parts.append("- Suggest concrete next steps")
            context_parts.append("- Identify potential blockers or challenges (Requirement 6.1)")
            context_parts.append("- Consider user's available resources and constraints (Requirement 6.4)")
            context_parts.append("- Keep responses helpful and encouraging")
            context_parts.append("- Address any identified blockers with practical solutions")
            context_parts.append("- Tailor recommendations to user's resource constraints")
            context_parts.append("")
            
            formatted_context = "\n".join(context_parts)
            
            logger.debug(f"Formatted context for AI processing ({len(formatted_context)} characters)")
            return formatted_context
            
        except Exception as e:
            logger.error(f"Error formatting context for AI: {e}")
            # Return minimal context on error
            return "You are an AI project guidance assistant. Help the user with their project question."
    
    async def _generate_ai_response_with_openrouter(self, formatted_context: str, user_message: str, project_context: Optional[ProjectContext]) -> Dict[str, Any]:
        """
        Generate AI response using OpenRouter API
        
        Args:
            formatted_context: Formatted context for AI
            user_message: User's message
            project_context: Project context for additional analysis
            
        Returns:
            Dictionary with AI response, suggestions, and next steps
            
        Raises:
            Exception: If AI service fails
        """
        try:
            # Prepare messages for OpenRouter
            messages = [
                {
                    "role": "system",
                    "content": formatted_context
                },
                {
                    "role": "user", 
                    "content": f"Please help me with this question about my project: {user_message}"
                }
            ]
            
            # Generate response using OpenRouter with Solar Pro 3 (best for ideas and guidance)
            response = await self.openrouter_client.generate_completion(
                messages=messages,
                max_tokens=2000,
                temperature=0.7,
                top_p=0.9,
                model="stepfun/step-3.5-flash:free"  # Specialized for idea generation and guidance
            )
            
            # Extract response content
            ai_content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            if not ai_content:
                raise Exception("Empty response from AI service")
            
            # Parse structured response or create one
            parsed_response = self._parse_ai_response(ai_content, project_context)
            
            # Add metadata
            parsed_response["metadata"] = {
                "model": self.openrouter_config.model if self.openrouter_config else "unknown",
                "token_usage": response.get("usage", {}),
                "response_time": response.get("response_time", 0.0),
                "confidence": 0.8  # Default confidence for successful responses
            }
            
            logger.info("Generated AI response using OpenRouter")
            return parsed_response
            
        except Exception as e:
            logger.error(f"Error generating AI response with OpenRouter: {e}")
            # Re-raise to be handled by calling method
            raise
    
    def _parse_ai_response(self, ai_content: str, project_context: Optional[ProjectContext]) -> Dict[str, Any]:
        """
        Parse AI response content and extract structured information
        
        Args:
            ai_content: Raw AI response content
            project_context: Project context for additional suggestions
            
        Returns:
            Structured response with suggestions and next steps
        """
        try:
            # Try to parse JSON if the AI returned structured data
            if ai_content.strip().startswith("{") and ai_content.strip().endswith("}"):
                try:
                    parsed = json.loads(ai_content)
                    if isinstance(parsed, dict) and "response" in parsed:
                        return parsed
                except json.JSONDecodeError:
                    pass
            
            # Extract suggestions and next steps from text
            suggestions = self._extract_suggestions_from_text(ai_content)
            next_steps = self._extract_next_steps_from_text(ai_content)
            
            # Generate additional suggestions based on project context
            if project_context:
                context_suggestions = self._generate_context_based_suggestions(project_context)
                suggestions.extend(context_suggestions[:2])  # Add up to 2 context-based suggestions
            
            return {
                "response": ai_content,
                "suggestions": suggestions[:5],  # Limit to 5 suggestions
                "next_steps": next_steps[:5],   # Limit to 5 next steps
                "confidence": 0.8
            }
            
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            return {
                "response": ai_content,
                "suggestions": [],
                "next_steps": [],
                "confidence": 0.6
            }
    
    def _extract_suggestions_from_text(self, text: str) -> List[str]:
        """Extract suggestions from AI response text"""
        suggestions = []
        
        # Look for common suggestion patterns
        suggestion_patterns = [
            "I suggest", "I recommend", "You might want to", "Consider", 
            "You could", "Try", "It would be helpful to"
        ]
        
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if any(pattern in line for pattern in suggestion_patterns):
                # Clean up the suggestion
                for pattern in suggestion_patterns:
                    if pattern in line:
                        suggestion = line.split(pattern, 1)[-1].strip()
                        if suggestion and len(suggestion) > 10:  # Minimum length check
                            suggestions.append(suggestion[:200])  # Limit length
                        break
        
        # If no suggestions found, generate generic ones
        if not suggestions:
            suggestions = [
                "Break down your task into smaller, manageable steps",
                "Review your project timeline and milestones",
                "Consider what resources you might need"
            ]
        
        return suggestions
    
    def _extract_next_steps_from_text(self, text: str) -> List[str]:
        """Extract next steps from AI response text"""
        next_steps = []
        
        # Look for next step patterns
        step_patterns = [
            "Next step", "First", "Then", "After that", "Finally",
            "Start by", "Begin with", "The next thing"
        ]
        
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if any(pattern in line for pattern in step_patterns):
                # Clean up the step
                for pattern in step_patterns:
                    if pattern in line:
                        step = line.split(pattern, 1)[-1].strip()
                        if step and len(step) > 5:  # Minimum length check
                            next_steps.append(step[:200])  # Limit length
                        break
        
        # Look for numbered or bulleted lists
        for line in lines:
            line = line.strip()
            if (line.startswith(('1.', '2.', '3.', '4.', '5.')) or 
                line.startswith(('- ', '* ', '• '))):
                step = line[2:].strip() if line.startswith(('- ', '* ')) else line[3:].strip()
                if step and len(step) > 5:
                    next_steps.append(step[:200])
        
        # If no steps found, generate generic ones
        if not next_steps:
            next_steps = [
                "Define your specific requirements",
                "Create a detailed action plan",
                "Identify necessary resources",
                "Set realistic timelines"
            ]
        
        return next_steps
    
    def _generate_context_based_suggestions(self, project_context: ProjectContext) -> List[str]:
        """Generate suggestions based on project context"""
        suggestions = []
        
        try:
            # Analyze project progress
            if project_context.progress < 25:
                suggestions.append("Focus on completing your initial setup and planning phase")
            elif project_context.progress < 50:
                suggestions.append("You're making good progress - keep momentum on your current tasks")
            elif project_context.progress < 75:
                suggestions.append("You're in the home stretch - focus on quality and testing")
            else:
                suggestions.append("Great progress! Consider final testing and documentation")
            
            # Analyze overdue tasks
            if project_context.tasks:
                overdue_tasks = [
                    task for task in project_context.tasks 
                    if (task.due_date and task.due_date < datetime.now(timezone.utc) 
                        and task.status != "completed")
                ]
                if overdue_tasks:
                    suggestions.append(f"You have {len(overdue_tasks)} overdue task(s) that need attention")
            
            # Analyze upcoming milestones
            if project_context.milestones:
                upcoming_milestones = [
                    milestone for milestone in project_context.milestones
                    if (not milestone.completed and 
                        milestone.target_date > datetime.now(timezone.utc))
                ]
                if upcoming_milestones:
                    next_milestone = min(upcoming_milestones, key=lambda m: m.target_date)
                    days_until = (next_milestone.target_date - datetime.now(timezone.utc)).days
                    if days_until <= 7:
                        suggestions.append(f"Your next milestone '{next_milestone.title}' is due in {days_until} days")
            
        except Exception as e:
            logger.error(f"Error generating context-based suggestions: {e}")
        
        return suggestions
    
    async def analyzeQueryAmbiguity(self, user_message: str, project_context: Optional[ProjectContext], conversation_history: List[ChatMessage]) -> AmbiguityAnalysis:
        """
        Analyze user query for ambiguity and determine if clarification is needed
        
        Args:
            user_message: The user's message to analyze
            project_context: Current project context
            conversation_history: Recent conversation messages
            
        Returns:
            Analysis result indicating ambiguity level and suggested clarifications
        """
        try:
            message_lower = user_message.lower().strip()
            
            # Initialize analysis
            ambiguity_score = 0.0
            ambiguous_aspects = []
            missing_context = []
            follow_up_questions = []
            
            # Check for vague language patterns (be more selective)
            vague_patterns = [
                "help me", "what should i do", "how do i", "i need help", "stuck", "confused",
                "not sure", "don't know", "what next", "any ideas", "suggestions"
            ]
            
            # Separate check for pronouns (these are more context-dependent)
            pronoun_patterns = ["this", "that", "it", "something", "anything", "everything"]
            
            vague_count = sum(1 for pattern in vague_patterns if pattern in message_lower)
            pronoun_count = sum(1 for pattern in pronoun_patterns if pattern in message_lower)
            
            if vague_count > 0:
                ambiguity_score += min(vague_count * 0.25, 0.5)
                ambiguous_aspects.append("Contains vague language")
            
            # Only count pronouns as vague if they appear without context
            if pronoun_count > 0 and len(conversation_history) < 2:
                ambiguity_score += min(pronoun_count * 0.2, 0.4)
                if "Contains vague language" not in ambiguous_aspects:
                    ambiguous_aspects.append("Contains vague language")
            
            # Check for missing specifics (adjust threshold)
            word_count = len(message_lower.split())
            if word_count < 4:
                ambiguity_score += 0.4
                ambiguous_aspects.append("Very short query")
                missing_context.append("More specific details about what you need help with")
            elif word_count < 8:
                ambiguity_score += 0.2
                ambiguous_aspects.append("Short query")
                missing_context.append("More details about your specific question")
            
            # Check for pronouns without clear antecedents (separate from vague language)
            pronouns = ["this", "that", "it", "they", "them", "these", "those"]
            pronoun_count = sum(1 for pronoun in pronouns if f" {pronoun} " in f" {message_lower} ")
            if pronoun_count > 0 and len(conversation_history) < 2:
                ambiguity_score += pronoun_count * 0.15
                ambiguous_aspects.append("Uses pronouns without clear context")
                missing_context.append("What specifically are you referring to?")
            
            # Check for multiple possible interpretations (be more selective)
            multi_topic_indicators = [
                " and ", " or ", " also ", " plus ", " both ", " either ", 
                " different ", " various ", " multiple ", " several "
            ]
            
            multi_count = sum(1 for indicator in multi_topic_indicators if indicator in message_lower)
            if multi_count > 1:  # Only if multiple indicators
                ambiguity_score += 0.25
                ambiguous_aspects.append("Multiple topics mentioned")
            
            # Check for missing project-specific context (be more lenient for specific questions)
            if project_context:
                # Check if query relates to project but lacks specifics
                project_keywords = [
                    project_context.title.lower(), 
                    project_context.current_phase.lower()
                ] + [goal.lower() for goal in project_context.goals[:3]]
                
                has_project_context = any(keyword in message_lower for keyword in project_keywords if keyword)
                
                # Only flag as missing context if it's very generic project language
                generic_project_terms = ["project", "task", "milestone", "deadline"]
                has_generic_terms = any(term in message_lower for term in generic_project_terms)
                
                # Check if the question is specific enough (has technical terms, specific nouns, etc.)
                specific_indicators = [
                    "sensor", "temperature", "monitoring", "calibration", "settings", "configuration",
                    "mobile app", "backend", "database", "api", "interface", "system"
                ]
                has_specific_terms = any(term in message_lower for term in specific_indicators)
                
                if (not has_project_context and has_generic_terms and not has_specific_terms):
                    ambiguity_score += 0.25
                    ambiguous_aspects.append("Mentions project concepts without specifics")
                    missing_context.append("Which specific part of your project are you asking about?")
            
            # Generate follow-up questions based on ambiguous aspects
            if "vague language" in " ".join(ambiguous_aspects).lower():
                follow_up_questions.append("Could you be more specific about what you need help with?")
            
            if "short query" in " ".join(ambiguous_aspects).lower():
                follow_up_questions.append("What specific aspect of your project are you working on?")
            
            if "pronouns without clear context" in " ".join(ambiguous_aspects).lower():
                follow_up_questions.append("What specifically are you referring to when you say 'this' or 'that'?")
            
            if "multiple topics" in " ".join(ambiguous_aspects).lower():
                follow_up_questions.append("Which topic would you like to focus on first?")
            
            if project_context and "project concepts without specifics" in " ".join(ambiguous_aspects).lower():
                if project_context.tasks:
                    follow_up_questions.append(f"Are you asking about a specific task? You have {len([t for t in project_context.tasks if t.status != 'completed'])} active tasks.")
                if project_context.milestones:
                    follow_up_questions.append(f"Is this related to an upcoming milestone? Your next milestone is '{project_context.milestones[0].title}'.")
            
            # Add context-specific follow-up questions
            if not follow_up_questions:
                follow_up_questions = self._generateContextualFollowUpQuestions(user_message, project_context)
            
            # Determine if clarification is needed (adjust threshold)
            clarification_needed = ambiguity_score > 0.6 or len(follow_up_questions) > 2
            
            # Cap ambiguity score at 1.0
            ambiguity_score = min(ambiguity_score, 1.0)
            
            analysis = AmbiguityAnalysis(
                is_ambiguous=ambiguity_score > 0.3,
                ambiguity_score=ambiguity_score,
                ambiguous_aspects=ambiguous_aspects,
                missing_context=missing_context,
                follow_up_questions=follow_up_questions[:5],  # Limit to 5 questions
                clarification_needed=clarification_needed
            )
            
            logger.info(f"Analyzed query ambiguity: score={ambiguity_score:.2f}, clarification_needed={clarification_needed}")
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing query ambiguity: {e}")
            # Return minimal analysis on error
            return AmbiguityAnalysis(
                is_ambiguous=False,
                ambiguity_score=0.0,
                clarification_needed=False
            )
    
    def _generateContextualFollowUpQuestions(self, user_message: str, project_context: Optional[ProjectContext]) -> List[str]:
        """Generate contextual follow-up questions based on message and project context"""
        questions = []
        message_lower = user_message.lower()
        
        try:
            # General clarification questions
            if any(word in message_lower for word in ["help", "stuck", "problem"]):
                questions.append("What specific challenge are you facing?")
                questions.append("What have you tried so far?")
            
            if any(word in message_lower for word in ["how", "what", "when", "where", "why"]):
                if "how" in message_lower:
                    questions.append("What is your current approach or plan?")
                if "what" in message_lower:
                    questions.append("Are you looking for recommendations, information, or step-by-step guidance?")
                if "when" in message_lower:
                    questions.append("What is your target timeline or deadline?")
            
            # Project-specific questions
            if project_context:
                if any(word in message_lower for word in ["task", "work", "do"]):
                    active_tasks = [t for t in project_context.tasks if t.status != "completed"]
                    if active_tasks:
                        questions.append(f"Are you asking about one of your active tasks: {', '.join([t.title for t in active_tasks[:3]])}?")
                
                if any(word in message_lower for word in ["timeline", "schedule", "deadline"]):
                    if project_context.milestones:
                        next_milestone = min([m for m in project_context.milestones if not m.completed], 
                                           key=lambda x: x.target_date, default=None)
                        if next_milestone:
                            questions.append(f"Is this related to your upcoming milestone '{next_milestone.title}'?")
                
                if any(word in message_lower for word in ["resource", "tool", "need"]):
                    questions.append("What type of resources are you looking for (tools, information, people, budget)?")
            
            # Limit to most relevant questions
            return questions[:3]
            
        except Exception as e:
            logger.error(f"Error generating contextual follow-up questions: {e}")
            return ["Could you provide more details about what you need help with?"]
    
    async def generateClarificationRequest(self, original_query: str, ambiguity_analysis: AmbiguityAnalysis, project_context: Optional[ProjectContext]) -> ClarificationRequest:
        """
        Generate a clarification request with follow-up questions
        
        Args:
            original_query: The original user query
            ambiguity_analysis: Analysis of query ambiguity
            project_context: Current project context
            
        Returns:
            Clarification request with suggested questions
        """
        try:
            # Create follow-up question objects
            suggested_questions = []
            
            for i, question in enumerate(ambiguity_analysis.follow_up_questions):
                category = self._categorizeFollowUpQuestion(question)
                priority = i + 1  # First questions have higher priority
                
                follow_up = FollowUpQuestion(
                    question=question,
                    category=category,
                    priority=priority,
                    context_needed=ambiguity_analysis.missing_context
                )
                suggested_questions.append(follow_up)
            
            # Generate clarification prompt
            clarification_prompt = self._generateClarificationPrompt(
                original_query, 
                ambiguity_analysis, 
                project_context
            )
            
            request = ClarificationRequest(
                original_query=original_query,
                ambiguity_analysis=ambiguity_analysis,
                suggested_questions=suggested_questions,
                clarification_prompt=clarification_prompt,
                requires_user_input=True
            )
            
            logger.info(f"Generated clarification request with {len(suggested_questions)} follow-up questions")
            return request
            
        except Exception as e:
            logger.error(f"Error generating clarification request: {e}")
            # Return minimal clarification request
            return ClarificationRequest(
                original_query=original_query,
                ambiguity_analysis=ambiguity_analysis,
                suggested_questions=[],
                clarification_prompt="Could you provide more details about what you need help with?",
                requires_user_input=True
            )
    
    def _categorizeFollowUpQuestion(self, question: str) -> str:
        """Categorize a follow-up question by type"""
        question_lower = question.lower()
        
        if any(word in question_lower for word in ["specific", "which", "what exactly"]):
            return "specificity"
        elif any(word in question_lower for word in ["timeline", "when", "deadline"]):
            return "timeline"
        elif any(word in question_lower for word in ["resource", "tool", "need", "budget"]):
            return "resources"
        elif any(word in question_lower for word in ["task", "milestone", "project"]):
            return "scope"
        elif any(word in question_lower for word in ["approach", "method", "how"]):
            return "methodology"
        else:
            return "general"
    
    def _generateClarificationPrompt(self, original_query: str, ambiguity_analysis: AmbiguityAnalysis, project_context: Optional[ProjectContext]) -> str:
        """Generate a user-friendly clarification prompt"""
        try:
            prompt_parts = []
            
            # Acknowledge the query
            prompt_parts.append(f"I'd like to help you with your question: \"{original_query}\"")
            
            # Explain why clarification is needed
            if ambiguity_analysis.ambiguous_aspects:
                if len(ambiguity_analysis.ambiguous_aspects) == 1:
                    prompt_parts.append(f"To provide the most helpful guidance, I need a bit more information because your question {ambiguity_analysis.ambiguous_aspects[0].lower()}.")
                else:
                    prompt_parts.append("To provide the most helpful guidance, I need a bit more information to better understand what you're looking for.")
            else:
                prompt_parts.append("To provide the most helpful guidance, could you help me understand what you're looking for?")
            
            # Add project context if available
            if project_context:
                prompt_parts.append(f"I can see you're working on '{project_context.title}' which is currently in the {project_context.current_phase} phase.")
            
            # Add follow-up questions
            if ambiguity_analysis.follow_up_questions:
                if len(ambiguity_analysis.follow_up_questions) == 1:
                    prompt_parts.append(f"Specifically: {ambiguity_analysis.follow_up_questions[0]}")
                else:
                    prompt_parts.append("Here are some questions that would help me assist you better:")
                    for i, question in enumerate(ambiguity_analysis.follow_up_questions[:3], 1):
                        prompt_parts.append(f"{i}. {question}")
            
            return " ".join(prompt_parts)
            
        except Exception as e:
            logger.error(f"Error generating clarification prompt: {e}")
            return "Could you provide more details about what you need help with? This will help me give you more specific and useful guidance."
    
    def _generate_fallback_response(self, user_message: str, project_context: Optional[ProjectContext]) -> Dict[str, Any]:
        """
        Generate fallback response when AI service is unavailable
        
        Args:
            user_message: User's message
            project_context: Project context
            
        Returns:
            Fallback response dictionary
        """
        try:
            # Analyze user message for keywords
            message_lower = user_message.lower()
            
            # Generate contextual fallback response
            if any(word in message_lower for word in ["help", "stuck", "problem", "issue"]):
                response = "I understand you're facing a challenge. Let me suggest some general approaches that might help."
                suggestions = [
                    "Break the problem down into smaller parts",
                    "Research similar solutions online",
                    "Ask for help from colleagues or community forums"
                ]
            elif any(word in message_lower for word in ["next", "step", "what", "how"]):
                response = "Here are some general next steps you might consider for your project."
                suggestions = [
                    "Review your current progress and goals",
                    "Identify the most important task to focus on",
                    "Plan your next milestone"
                ]
            else:
                response = "I'm here to help with your project. While I'm experiencing some technical difficulties, I can offer some general guidance."
                suggestions = [
                    "Consider your project's current priorities",
                    "Review your timeline and deadlines",
                    "Focus on one task at a time"
                ]
            
            # Add project-specific suggestions if context is available
            if project_context:
                context_suggestions = self._generate_context_based_suggestions(project_context)
                suggestions.extend(context_suggestions[:2])
            
            next_steps = [
                "Identify your immediate priorities",
                "Create a specific action plan",
                "Set realistic timelines for completion"
            ]
            
            return {
                "response": response,
                "suggestions": suggestions[:5],
                "next_steps": next_steps[:5],
                "confidence": 0.5  # Lower confidence for fallback responses
            }
            
        except Exception as e:
            logger.error(f"Error generating fallback response: {e}")
            return {
                "response": "I'm here to help with your project. Please try again in a moment.",
                "suggestions": ["Try rephrasing your question", "Check back in a few minutes"],
                "next_steps": ["Wait a moment and try again"],
                "confidence": 0.3
            }
    
    # Legacy methods for backward compatibility
    
    async def start_chat_session(self, project_id: str, user_id: str) -> ChatSession:
        """
        Start a new chat session for a project
        
        Args:
            project_id: ID of the project
            user_id: ID of the user
            
        Returns:
            Created chat session
            
        Raises:
            ValueError: If project_id or user_id are invalid
            Exception: If session creation fails
        """
        try:
            # Validate inputs
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            if not user_id or not user_id.strip():
                raise ValueError("user_id cannot be empty")
            
            params = CreateSessionParams(project_id=project_id.strip(), user_id=user_id.strip())
            session = await self.session_crud.create_session(params)
            
            logger.info(f"Started chat session {session.session_id} for project {project_id}")
            return session
            
        except ValueError as e:
            logger.error(f"Validation error starting chat session: {e}")
            raise
        except Exception as e:
            logger.error(f"Error starting chat session for project {project_id}: {e}")
            raise
    
    async def get_or_create_session(self, project_id: str, user_id: str, session_id: Optional[str] = None) -> ChatSession:
        """Get existing session or create a new one"""
        try:
            if session_id:
                # Try to get existing session
                session = await self.session_crud.get_session(session_id)
                if session and session.project_id == project_id and session.user_id == user_id:
                    # Update last activity
                    update_params = UpdateSessionParams(session_id=session_id)
                    await self.session_crud.update_session(update_params)
                    return session
            
            # Create new session if none exists or doesn't match
            return await self.start_chat_session(project_id, user_id)
            
        except Exception as e:
            logger.error(f"Error getting/creating session for project {project_id}: {e}")
            raise
    
    async def send_message(self, session_id: str, content: str, sender: MessageSender, metadata: Optional[Dict[str, Any]] = None) -> ChatMessage:
        """Send a message in a chat session"""
        try:
            params = CreateMessageParams(
                session_id=session_id,
                content=content,
                sender=sender,
                metadata=metadata or {}
            )
            
            message = await self.message_crud.create_message(params)
            
            # Update session last activity
            update_params = UpdateSessionParams(session_id=session_id)
            await self.session_crud.update_session(update_params)
            
            logger.info(f"Sent {sender.value} message in session {session_id}")
            return message
            
        except Exception as e:
            logger.error(f"Error sending message in session {session_id}: {e}")
            raise
    
    async def get_chat_history(self, session_id: str, limit: int = 100) -> List[ChatMessage]:
        """Get chat history for a session"""
        try:
            messages = await self.message_crud.get_session_messages(session_id, limit=limit)
            logger.info(f"Retrieved {len(messages)} messages for session {session_id}")
            return messages
            
        except Exception as e:
            logger.error(f"Error getting chat history for session {session_id}: {e}")
            raise
    
    async def get_recent_messages(self, session_id: str, count: int = 10) -> List[ChatMessage]:
        """Get recent messages for context"""
        try:
            messages = await self.message_crud.get_recent_messages(session_id, count=count)
            logger.info(f"Retrieved {len(messages)} recent messages for session {session_id}")
            return messages
            
        except Exception as e:
            logger.error(f"Error getting recent messages for session {session_id}: {e}")
            raise
    
    async def identifyProjectBlockers(self, project_context: ProjectContext) -> List[str]:
        """
        Identify potential blockers or challenges in the current project state
        
        Args:
            project_context: Current project context with tasks, milestones, and progress
            
        Returns:
            List of identified blockers and challenges
            
        Requirements: 6.1 - THE AI_Guidance_System SHALL identify potential blockers or challenges in the current project state
        """
        try:
            blockers = []
            
            if not project_context:
                return ["Unable to analyze project - no project context available"]
            
            # Analyze overdue tasks
            overdue_tasks = [
                task for task in project_context.tasks 
                if (task.due_date and task.due_date < datetime.now(timezone.utc) 
                    and task.status != TaskStatus.COMPLETED)
            ]
            
            if overdue_tasks:
                if len(overdue_tasks) == 1:
                    blockers.append(f"You have 1 overdue task: '{overdue_tasks[0].title}' - this may be blocking progress")
                else:
                    blockers.append(f"You have {len(overdue_tasks)} overdue tasks - these may be creating a bottleneck")
                    # List the most critical overdue tasks
                    high_priority_overdue = [t for t in overdue_tasks if t.priority == TaskPriority.HIGH]
                    if high_priority_overdue:
                        blockers.append(f"High priority overdue tasks: {', '.join([t.title for t in high_priority_overdue[:3]])}")
            
            # Analyze overdue milestones
            overdue_milestones = [
                milestone for milestone in project_context.milestones
                if (not milestone.completed and 
                    milestone.target_date < datetime.now(timezone.utc))
            ]
            
            if overdue_milestones:
                if len(overdue_milestones) == 1:
                    blockers.append(f"Milestone '{overdue_milestones[0].title}' is overdue - this may indicate scope or timeline issues")
                else:
                    blockers.append(f"{len(overdue_milestones)} milestones are overdue - consider reviewing project timeline and scope")
            
            # Analyze task distribution and potential bottlenecks
            in_progress_tasks = [t for t in project_context.tasks if t.status == TaskStatus.IN_PROGRESS]
            pending_tasks = [t for t in project_context.tasks if t.status == TaskStatus.PENDING]
            
            if len(in_progress_tasks) > 5:
                blockers.append("Too many tasks in progress simultaneously - consider focusing on fewer tasks to improve completion rate")
            
            if len(pending_tasks) > 0 and len(in_progress_tasks) == 0:
                blockers.append("No tasks currently in progress - project momentum may be stalled")
            
            # Analyze progress vs timeline
            if project_context.progress < 25 and project_context.deadlines:
                next_deadline = min(project_context.deadlines)
                days_until_deadline = (next_deadline - datetime.now(timezone.utc)).days
                if days_until_deadline < 7:
                    blockers.append("Low progress with approaching deadline - may need to reassess scope or extend timeline")
            
            # Analyze high priority task accumulation
            high_priority_pending = [t for t in project_context.tasks 
                                   if t.priority == TaskPriority.HIGH and t.status == TaskStatus.PENDING]
            if len(high_priority_pending) > 3:
                blockers.append("Multiple high-priority tasks are pending - prioritization may be needed to avoid overwhelm")
            
            # Analyze milestone gaps
            if project_context.milestones:
                completed_milestones = [m for m in project_context.milestones if m.completed]
                if len(completed_milestones) == 0 and project_context.progress > 30:
                    blockers.append("Significant progress made but no milestones completed - consider breaking work into smaller milestones")
            
            # Analyze task complexity indicators
            long_running_tasks = [
                task for task in project_context.tasks 
                if (task.status == TaskStatus.IN_PROGRESS and 
                    task.due_date and 
                    (datetime.now(timezone.utc) - task.due_date).days > 7)
            ]
            
            if long_running_tasks:
                blockers.append("Some tasks have been in progress for an extended period - they may need to be broken down into smaller subtasks")
            
            # Check for resource constraint indicators
            if project_context.current_phase == "Development" and project_context.progress < 10:
                blockers.append("Development phase started but minimal progress - may indicate resource or technical constraints")
            
            logger.info(f"Identified {len(blockers)} potential blockers for project {project_context.project_id}")
            return blockers
            
        except Exception as e:
            logger.error(f"Error identifying project blockers: {e}")
            return ["Unable to analyze project blockers due to technical issues"]
    
    async def generateResourceAwareRecommendations(self, project_context: ProjectContext, user_message: str) -> List[str]:
        """
        Generate recommendations that consider user's available resources and constraints
        
        Args:
            project_context: Current project context
            user_message: User's message that may contain resource constraints
            
        Returns:
            List of resource-aware recommendations
            
        Requirements: 6.4 - WHEN providing recommendations, THE AI_Guidance_System SHALL consider the user's available resources and constraints
        """
        try:
            recommendations = []
            
            if not project_context:
                return ["Unable to provide recommendations - no project context available"]
            
            message_lower = user_message.lower()
            
            # Analyze resource constraints mentioned in user message
            time_constrained = any(phrase in message_lower for phrase in [
                "no time", "limited time", "tight deadline", "rush", "quickly", "asap", "urgent"
            ])
            
            budget_constrained = any(phrase in message_lower for phrase in [
                "budget", "cost", "expensive", "cheap", "affordable", "money", "price"
            ])
            
            skill_constrained = any(phrase in message_lower for phrase in [
                "don't know", "new to", "beginner", "learning", "unfamiliar", "never done"
            ])
            
            resource_constrained = any(phrase in message_lower for phrase in [
                "limited resources", "no access", "don't have", "can't get", "unavailable"
            ])
            
            # Generate time-aware recommendations
            if time_constrained:
                recommendations.append("Focus on the minimum viable version first - identify the core features that deliver the most value")
                recommendations.append("Consider using existing libraries or frameworks to accelerate development")
                
                # Prioritize high-impact, low-effort tasks
                high_priority_tasks = [t for t in project_context.tasks 
                                     if t.priority == TaskPriority.HIGH and t.status == TaskStatus.PENDING]
                if high_priority_tasks:
                    recommendations.append(f"Prioritize these high-impact tasks: {', '.join([t.title for t in high_priority_tasks[:2]])}")
            
            # Generate budget-aware recommendations
            if budget_constrained:
                recommendations.append("Look for free and open-source alternatives to commercial tools")
                recommendations.append("Consider phased implementation to spread costs over time")
                recommendations.append("Explore community resources, tutorials, and free learning materials")
            
            # Generate skill-aware recommendations
            if skill_constrained:
                recommendations.append("Start with simpler tasks to build confidence and skills gradually")
                recommendations.append("Break complex tasks into smaller learning steps")
                recommendations.append("Look for beginner-friendly tutorials and documentation")
                
                # Suggest starting with easier tasks
                low_priority_tasks = [t for t in project_context.tasks 
                                    if t.priority == TaskPriority.LOW and t.status == TaskStatus.PENDING]
                if low_priority_tasks:
                    recommendations.append(f"Consider starting with these foundational tasks: {low_priority_tasks[0].title}")
            
            # Generate resource-aware recommendations
            if resource_constrained:
                recommendations.append("Focus on tasks that can be completed with currently available resources")
                recommendations.append("Consider alternative approaches that require fewer external dependencies")
                recommendations.append("Look for community support or collaboration opportunities")
            
            # General resource optimization recommendations
            if not any([time_constrained, budget_constrained, skill_constrained, resource_constrained]):
                # Analyze project state for resource optimization
                if project_context.progress < 25:
                    recommendations.append("Establish a clear development environment and workflow early to maximize efficiency")
                    recommendations.append("Create a detailed task breakdown to better estimate resource needs")
                
                if len([t for t in project_context.tasks if t.status == TaskStatus.IN_PROGRESS]) > 3:
                    recommendations.append("Consider limiting work-in-progress to improve focus and completion rate")
                
                # Milestone-based recommendations
                upcoming_milestones = [m for m in project_context.milestones 
                                     if not m.completed and m.target_date > datetime.now(timezone.utc)]
                if upcoming_milestones:
                    next_milestone = min(upcoming_milestones, key=lambda m: m.target_date)
                    days_until = (next_milestone.target_date - datetime.now(timezone.utc)).days
                    if days_until <= 14:
                        recommendations.append(f"Focus resources on completing '{next_milestone.title}' milestone within {days_until} days")
            
            logger.info(f"Generated {len(recommendations)} resource-aware recommendations for project {project_context.project_id}")
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating resource-aware recommendations: {e}")
            return ["Unable to provide resource-aware recommendations due to technical issues"]
    
    async def prioritizeTasks(self, project_context: ProjectContext, user_goals: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Prioritize tasks based on project goals, deadlines, and dependencies
        
        Args:
            project_context: Current project context with tasks and milestones
            user_goals: Optional list of user-specified goals for prioritization
            
        Returns:
            List of tasks with priority scores and reasoning
            
        Requirements: 6.3 - THE AI_Guidance_System SHALL help users prioritize tasks based on project goals and deadlines
        """
        try:
            if not project_context or not project_context.tasks:
                return []
            
            prioritized_tasks = []
            current_time = datetime.now(timezone.utc)
            
            for task in project_context.tasks:
                if task.status == TaskStatus.COMPLETED:
                    continue  # Skip completed tasks
                
                priority_score = 0.0
                priority_factors = []
                
                # Factor 1: Task Priority Level (30% weight)
                if task.priority == TaskPriority.HIGH:
                    priority_score += 30
                    priority_factors.append("High priority task")
                elif task.priority == TaskPriority.MEDIUM:
                    priority_score += 20
                    priority_factors.append("Medium priority task")
                else:
                    priority_score += 10
                    priority_factors.append("Low priority task")
                
                # Factor 2: Deadline Urgency (25% weight)
                if task.due_date:
                    days_until_due = (task.due_date - current_time).days
                    if days_until_due < 0:
                        priority_score += 25  # Overdue tasks get maximum urgency
                        priority_factors.append(f"Overdue by {abs(days_until_due)} days")
                    elif days_until_due <= 3:
                        priority_score += 22
                        priority_factors.append(f"Due in {days_until_due} days")
                    elif days_until_due <= 7:
                        priority_score += 18
                        priority_factors.append(f"Due within a week")
                    elif days_until_due <= 14:
                        priority_score += 12
                        priority_factors.append(f"Due within two weeks")
                    else:
                        priority_score += 5
                        priority_factors.append("Future deadline")
                
                # Factor 3: Milestone Alignment (20% weight)
                milestone_alignment_score = self._calculateMilestoneAlignment(task, project_context.milestones)
                priority_score += milestone_alignment_score
                if milestone_alignment_score > 15:
                    priority_factors.append("Critical for upcoming milestone")
                elif milestone_alignment_score > 10:
                    priority_factors.append("Supports upcoming milestone")
                
                # Factor 4: Goal Alignment (15% weight)
                goal_alignment_score = self._calculateGoalAlignment(task, project_context.goals, user_goals)
                priority_score += goal_alignment_score
                if goal_alignment_score > 10:
                    priority_factors.append("Directly supports project goals")
                elif goal_alignment_score > 5:
                    priority_factors.append("Partially supports project goals")
                
                # Factor 5: Dependency Impact (10% weight)
                dependency_score = self._calculateDependencyImpact(task, project_context.tasks)
                priority_score += dependency_score
                if dependency_score > 7:
                    priority_factors.append("Blocks other tasks")
                elif dependency_score > 3:
                    priority_factors.append("May impact other tasks")
                
                # Determine priority level based on total score
                if priority_score >= 70:
                    priority_level = "Critical"
                elif priority_score >= 50:
                    priority_level = "High"
                elif priority_score >= 30:
                    priority_level = "Medium"
                else:
                    priority_level = "Low"
                
                prioritized_task = {
                    "task": task,
                    "priority_score": priority_score,
                    "priority_level": priority_level,
                    "priority_factors": priority_factors,
                    "recommendation": self._generateTaskRecommendation(task, priority_score, priority_factors)
                }
                
                prioritized_tasks.append(prioritized_task)
            
            # Sort by priority score (highest first)
            prioritized_tasks.sort(key=lambda x: x["priority_score"], reverse=True)
            
            logger.info(f"Prioritized {len(prioritized_tasks)} tasks for project {project_context.project_id}")
            return prioritized_tasks
            
        except Exception as e:
            logger.error(f"Error prioritizing tasks: {e}")
            return []
    
    def _calculateMilestoneAlignment(self, task: Any, milestones: List[Any]) -> float:
        """Calculate how well a task aligns with upcoming milestones"""
        try:
            if not milestones:
                return 0.0
            
            current_time = datetime.now(timezone.utc)
            upcoming_milestones = [m for m in milestones if not m.completed and m.target_date > current_time]
            
            if not upcoming_milestones:
                return 0.0
            
            # Find the nearest milestone
            nearest_milestone = min(upcoming_milestones, key=lambda m: m.target_date)
            days_until_milestone = (nearest_milestone.target_date - current_time).days
            
            # Check if task title or description relates to milestone
            task_text = f"{task.title} {task.description}".lower()
            milestone_text = f"{nearest_milestone.title} {nearest_milestone.description}".lower()
            
            # Simple keyword matching for alignment
            task_words = set(task_text.split())
            milestone_words = set(milestone_text.split())
            common_words = task_words.intersection(milestone_words)
            
            alignment_score = 0.0
            
            # Base alignment score based on keyword overlap
            if len(common_words) > 0:
                alignment_score += min(len(common_words) * 3, 15)
            
            # Boost score if milestone is approaching
            if days_until_milestone <= 7:
                alignment_score += 5
            elif days_until_milestone <= 14:
                alignment_score += 3
            
            return min(alignment_score, 20)  # Cap at 20 points
            
        except Exception as e:
            logger.error(f"Error calculating milestone alignment: {e}")
            return 0.0
    
    def _calculateGoalAlignment(self, task: Any, project_goals: List[str], user_goals: Optional[List[str]]) -> float:
        """Calculate how well a task aligns with project and user goals"""
        try:
            all_goals = project_goals.copy() if project_goals else []
            if user_goals:
                all_goals.extend(user_goals)
            
            if not all_goals:
                return 0.0
            
            task_text = f"{task.title} {task.description}".lower()
            alignment_score = 0.0
            
            for goal in all_goals:
                goal_text = goal.lower()
                
                # Check for keyword overlap
                task_words = set(task_text.split())
                goal_words = set(goal_text.split())
                common_words = task_words.intersection(goal_words)
                
                if len(common_words) > 0:
                    alignment_score += min(len(common_words) * 2, 8)
                
                # Check for partial string matches
                if any(word in task_text for word in goal_words if len(word) > 3):
                    alignment_score += 3
            
            return min(alignment_score, 15)  # Cap at 15 points
            
        except Exception as e:
            logger.error(f"Error calculating goal alignment: {e}")
            return 0.0
    
    def _calculateDependencyImpact(self, task: Any, all_tasks: List[Any]) -> float:
        """Calculate the impact of a task based on dependencies"""
        try:
            # Simple heuristic: tasks with certain keywords might block others
            blocking_keywords = [
                "setup", "configuration", "foundation", "base", "core", "initial",
                "authentication", "database", "api", "framework", "infrastructure"
            ]
            
            task_text = f"{task.title} {task.description}".lower()
            
            dependency_score = 0.0
            
            # Check if this task might block others
            for keyword in blocking_keywords:
                if keyword in task_text:
                    dependency_score += 2
            
            # High priority tasks are more likely to be blockers
            if task.priority == TaskPriority.HIGH:
                dependency_score += 3
            
            # Tasks in progress might be blocking others
            if task.status == TaskStatus.IN_PROGRESS:
                dependency_score += 2
            
            return min(dependency_score, 10)  # Cap at 10 points
            
        except Exception as e:
            logger.error(f"Error calculating dependency impact: {e}")
            return 0.0
    
    def _generateTaskRecommendation(self, task: Any, priority_score: float, priority_factors: List[str]) -> str:
        """Generate a recommendation for how to handle a specific task"""
        try:
            if priority_score >= 70:
                return f"Address immediately - {', '.join(priority_factors[:2])}"
            elif priority_score >= 50:
                return f"Schedule for this week - {', '.join(priority_factors[:2])}"
            elif priority_score >= 30:
                return f"Plan for next sprint - {priority_factors[0] if priority_factors else 'Standard priority'}"
            else:
                return f"Consider for future planning - {priority_factors[0] if priority_factors else 'Low priority'}"
                
        except Exception as e:
            logger.error(f"Error generating task recommendation: {e}")
            return "Review and plan accordingly"
    
    async def generateTaskPrioritizationGuidance(self, project_context: ProjectContext, user_message: str) -> Dict[str, Any]:
        """
        Generate comprehensive task prioritization guidance for the user
        
        Args:
            project_context: Current project context
            user_message: User's message that may contain prioritization requests
            
        Returns:
            Dictionary with prioritized tasks and guidance
            
        Requirements: 6.3, 6.4 - Task prioritization based on goals and deadlines with resource constraints
        """
        try:
            # Extract user goals from message if mentioned
            user_goals = self._extractGoalsFromMessage(user_message)
            
            # Prioritize tasks
            prioritized_tasks = await self.prioritizeTasks(project_context, user_goals)
            
            if not prioritized_tasks:
                return {
                    "guidance": "No active tasks found to prioritize. Consider adding tasks to your project.",
                    "prioritized_tasks": [],
                    "recommendations": ["Add specific tasks to your project", "Define clear milestones and deadlines"]
                }
            
            # Generate overall guidance
            critical_tasks = [t for t in prioritized_tasks if t["priority_level"] == "Critical"]
            high_priority_tasks = [t for t in prioritized_tasks if t["priority_level"] == "High"]
            
            guidance_parts = []
            
            if critical_tasks:
                guidance_parts.append(f"You have {len(critical_tasks)} critical task(s) that need immediate attention:")
                for task in critical_tasks[:3]:  # Show top 3 critical tasks
                    guidance_parts.append(f"  • {task['task'].title} - {task['recommendation']}")
            
            if high_priority_tasks:
                guidance_parts.append(f"Additionally, {len(high_priority_tasks)} high-priority task(s) should be scheduled soon:")
                for task in high_priority_tasks[:2]:  # Show top 2 high priority tasks
                    guidance_parts.append(f"  • {task['task'].title} - {task['recommendation']}")
            
            if not critical_tasks and not high_priority_tasks:
                guidance_parts.append("Your tasks are well-balanced. Focus on the highest-scoring items first:")
                for task in prioritized_tasks[:3]:
                    guidance_parts.append(f"  • {task['task'].title} - {task['recommendation']}")
            
            # Generate actionable recommendations
            recommendations = []
            
            if critical_tasks:
                recommendations.append("Start with critical tasks to unblock project progress")
            
            if len([t for t in prioritized_tasks if t["task"].status == TaskStatus.IN_PROGRESS]) > 3:
                recommendations.append("Consider limiting work-in-progress to improve focus")
            
            overdue_tasks = [t for t in prioritized_tasks if "Overdue" in str(t["priority_factors"])]
            if overdue_tasks:
                recommendations.append(f"Address {len(overdue_tasks)} overdue task(s) to get back on track")
            
            recommendations.append("Review and update task deadlines regularly")
            recommendations.append("Break down large tasks into smaller, manageable subtasks")
            
            return {
                "guidance": "\n".join(guidance_parts),
                "prioritized_tasks": prioritized_tasks[:10],  # Return top 10 prioritized tasks
                "recommendations": recommendations[:5],
                "summary": {
                    "total_tasks": len(prioritized_tasks),
                    "critical_count": len(critical_tasks),
                    "high_priority_count": len(high_priority_tasks),
                    "overdue_count": len(overdue_tasks)
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating task prioritization guidance: {e}")
            return {
                "guidance": "Unable to generate task prioritization guidance due to technical issues.",
                "prioritized_tasks": [],
                "recommendations": ["Try again in a moment", "Review your tasks manually"]
            }
    
    def _extractGoalsFromMessage(self, user_message: str) -> List[str]:
        """Extract user goals from their message"""
        try:
            goals = []
            message_lower = user_message.lower()
            
            # Look for goal-indicating phrases
            goal_patterns = [
                "my goal is", "i want to", "i need to", "trying to", "working towards",
                "objective is", "aim is", "target is", "focus on", "priority is"
            ]
            
            for pattern in goal_patterns:
                if pattern in message_lower:
                    # Extract text after the pattern
                    parts = message_lower.split(pattern, 1)
                    if len(parts) > 1:
                        goal_text = parts[1].strip()
                        # Clean up the goal text
                        goal_text = goal_text.split('.')[0].split(',')[0].strip()
                        if len(goal_text) > 5:  # Minimum length check
                            goals.append(goal_text)
            
            return goals[:3]  # Return up to 3 extracted goals
            
        except Exception as e:
            logger.error(f"Error extracting goals from message: {e}")
            return []
            
            # Project phase-specific recommendations
            if project_context.current_phase == "Planning":
                recommendations.append("Invest time in thorough planning now to save resources during implementation")
                recommendations.append("Validate your approach with small prototypes before full development")
            
            elif project_context.current_phase == "Development":
                recommendations.append("Implement core functionality first, then add enhancements")
                recommendations.append("Test frequently to catch issues early when they're easier to fix")
            
            elif project_context.current_phase == "Testing":
                recommendations.append("Focus testing efforts on the most critical functionality first")
                recommendations.append("Document issues clearly to streamline the fixing process")
            
            # Remove duplicates and limit recommendations
            recommendations = list(dict.fromkeys(recommendations))  # Remove duplicates while preserving order
            
            logger.info(f"Generated {len(recommendations)} resource-aware recommendations for project {project_context.project_id}")
            return recommendations[:8]  # Limit to 8 most relevant recommendations
            
        except Exception as e:
            logger.error(f"Error generating resource-aware recommendations: {e}")
            return ["Focus on one task at a time and use available resources efficiently"]

    async def process_chat_request(self, project_id: str, user_id: str, request: ChatRequest) -> ChatResponse:
        """
        Process a chat request and generate AI response using the new generateResponse method
        
        Args:
            project_id: ID of the project
            user_id: ID of the user
            request: Chat request with message and optional session ID
            
        Returns:
            Chat response with AI-generated content
        """
        try:
            # Get or create session
            session = await self.get_or_create_session(project_id, user_id, request.session_id)
            
            # Save user message
            user_message = await self.send_message(
                session.session_id,
                request.message,
                MessageSender.USER
            )
            
            # Get conversation history for context
            conversation_history = await self.get_recent_messages(session.session_id, count=20)
            
            # Create guidance request
            guidance_request = GuidanceRequest(
                project_id=project_id,
                user_message=request.message,
                conversation_history=conversation_history
            )
            
            # Generate AI response using the new method
            guidance_response = await self.generateResponse(guidance_request)
            
            # Save AI response
            ai_message = await self.send_message(
                session.session_id,
                guidance_response.response,
                MessageSender.AI,
                metadata={
                    "suggestions": guidance_response.suggestions, 
                    "next_steps": guidance_response.next_steps,
                    "confidence": guidance_response.confidence
                }
            )
            
            response = ChatResponse(
                response=guidance_response.response,
                session_id=session.session_id,
                suggestions=guidance_response.suggestions,
                next_steps=guidance_response.next_steps,
                requires_clarification=guidance_response.requires_clarification,
                ambiguity_analysis=guidance_response.ambiguity_analysis
            )
            
            logger.info(f"Processed chat request for project {project_id}")
            return response
            
        except Exception as e:
            logger.error(f"Error processing chat request for project {project_id}: {e}")
            raise
    
    async def _checkResponseCache(self, project_id: str, user_message: str) -> Optional[GuidanceResponse]:
        """
        Check if there's a cached response for similar queries
        
        Args:
            project_id: Project ID
            user_message: User's message
            
        Returns:
            Cached response if found, None otherwise
        """
        try:
            # Get cached project context
            cached_context = await self.context_crud.get_context(project_id)
            if not cached_context:
                return None
            
            # Create a simple cache key based on message similarity
            message_key = self._generateMessageCacheKey(user_message)
            
            # Check if we have a cached response for similar queries
            # For now, we'll use a simple approach - in production, you might want
            # to use more sophisticated similarity matching
            cache_metadata = cached_context.context_data.dict() if hasattr(cached_context.context_data, 'dict') else {}
            
            # Look for cached responses in metadata
            if 'cached_responses' in cache_metadata:
                cached_responses = cache_metadata['cached_responses']
                if message_key in cached_responses:
                    cached_data = cached_responses[message_key]
                    
                    # Check if cache is still valid (within 1 hour)
                    from datetime import datetime, timezone, timedelta
                    cache_time = datetime.fromisoformat(cached_data.get('timestamp', ''))
                    if datetime.now(timezone.utc) - cache_time < timedelta(hours=1):
                        logger.info(f"Found valid cached response for project {project_id}")
                        return GuidanceResponse(**cached_data['response'])
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking response cache: {e}")
            return None
    
    async def _cacheResponse(self, project_id: str, user_message: str, response: GuidanceResponse):
        """
        Cache the AI response for future similar queries
        
        Args:
            project_id: Project ID
            user_message: User's message
            response: Generated response to cache
        """
        try:
            # Get current project context
            project_context = await self.project_context_service.getProjectContext(project_id)
            if not project_context:
                return
            
            # Create cache key
            message_key = self._generateMessageCacheKey(user_message)
            
            # Prepare cached response data
            cached_response_data = {
                'response': response.dict(),
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'message_key': message_key
            }
            
            # Get existing cached context or create new one
            cached_context = await self.context_crud.get_context(project_id)
            
            if cached_context:
                # Update existing cache with new response
                context_dict = cached_context.context_data.dict() if hasattr(cached_context.context_data, 'dict') else cached_context.context_data.__dict__
                if 'cached_responses' not in context_dict:
                    context_dict['cached_responses'] = {}
                
                context_dict['cached_responses'][message_key] = cached_response_data
                
                # Limit cache size (keep only last 10 responses)
                if len(context_dict['cached_responses']) > 10:
                    # Remove oldest entries
                    sorted_responses = sorted(
                        context_dict['cached_responses'].items(),
                        key=lambda x: x[1]['timestamp'],
                        reverse=True
                    )
                    context_dict['cached_responses'] = dict(sorted_responses[:10])
                
                # Update the cached context
                from database.ai_guidance_crud import UpdateContextParams
                update_params = UpdateContextParams(
                    project_id=project_id,
                    context_data=ProjectContext(**context_dict),
                    expiration_hours=24
                )
                await self.context_crud.create_or_update_context(update_params)
            else:
                # Create new cache entry
                context_dict = project_context.dict() if hasattr(project_context, 'dict') else project_context.__dict__
                context_dict['cached_responses'] = {message_key: cached_response_data}
                
                from database.ai_guidance_crud import UpdateContextParams
                update_params = UpdateContextParams(
                    project_id=project_id,
                    context_data=ProjectContext(**context_dict),
                    expiration_hours=24
                )
                await self.context_crud.create_or_update_context(update_params)
            
            logger.info(f"Cached AI response for project {project_id}")
            
        except Exception as e:
            logger.error(f"Error caching response: {e}")
            # Don't fail the main request if caching fails
    
    def _generateMessageCacheKey(self, user_message: str) -> str:
        """
        Generate a cache key for the user message
        
        Args:
            user_message: User's message
            
        Returns:
            Cache key string
        """
        try:
            import hashlib
            
            # Normalize the message for better cache hits
            normalized_message = user_message.lower().strip()
            
            # Remove common variations that shouldn't affect caching
            normalized_message = normalized_message.replace("please", "").replace("can you", "").replace("could you", "")
            normalized_message = " ".join(normalized_message.split())  # Normalize whitespace
            
            # Create hash of normalized message
            cache_key = hashlib.md5(normalized_message.encode()).hexdigest()[:16]
            return cache_key
            
        except Exception as e:
            logger.error(f"Error generating message cache key: {e}")
            return hashlib.md5(user_message.encode()).hexdigest()[:16]