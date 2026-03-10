# Stateless AI Guidance Service
# This service processes AI requests without persisting chat data
# Chat history is managed by frontend localStorage

import logging
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from models.ai_guidance import (
    ChatRequest, ChatResponse, ContextResponse, 
    ProjectContext, GuidanceRequest, GuidanceResponse,
    MessageSender, ChatMessage, Task, TaskStatus, TaskPriority
)

logger = logging.getLogger(__name__)


class StatelessAIGuidanceService:
    """
    Stateless AI service that processes requests without database persistence
    Frontend handles all chat history via localStorage
    """
    
    def __init__(self):
        # Initialize without OpenRouter client - it will be set by server.py after initialization
        self.openrouter_client = None
        self.openrouter_config = None
        logger.info("StatelessAIGuidanceService initialized - OpenRouter client will be set by server")
    
    async def process_chat_request(self, project_id: str, request: ChatRequest) -> ChatResponse:
        """
        Process a chat request and generate AI response without persisting data
        
        Args:
            project_id: ID of the project
            request: Chat request with message and optional session ID and project context
            
        Returns:
            Chat response with AI-generated content
        """
        try:
            logger.info(f"Processing stateless chat request for project {project_id}")
            
            # Generate session ID if not provided (for frontend use)
            session_id = request.session_id or str(uuid.uuid4())
            
            # Use project context from request if provided, otherwise try to get from database
            project_context = None
            if request.project_context:
                # Convert frontend project data to ProjectContext
                project_data = request.project_context
                
                # Convert string tasks to Task objects if needed
                tasks = []
                if project_data.get('steps'):
                    for i, step in enumerate(project_data.get('steps', [])[:10]):
                        if isinstance(step, str):
                            tasks.append(Task(
                                id=f"task-{i}",
                                title=step,
                                description=step,
                                status=TaskStatus.PENDING,
                                priority=TaskPriority.MEDIUM,
                                estimated_hours=1.0,
                                dependencies=[]
                            ))
                
                project_context = ProjectContext(
                    project_id=project_data.get('id', project_id),
                    title=project_data.get('title', 'Untitled Project'),
                    description=project_data.get('description', ''),
                    current_phase=project_data.get('status', 'planning'),
                    progress=project_data.get('progress', 0),
                    goals=project_data.get('components', [])[:5] if project_data.get('components') else [],
                    tasks=tasks,
                    milestones=[],
                    deadlines=[]
                )
                logger.info(f"Using project context from request: {project_context.title}")
            else:
                # Fallback to database lookup (will return None in stateless mode)
                project_context = await self.get_project_context(project_id)
            
            # Convert conversation history from request if provided
            conversation_history = []
            if request.conversation_history:
                for msg in request.conversation_history:
                    try:
                        conversation_history.append(ChatMessage(
                            message_id=msg.get('messageId', str(uuid.uuid4())),
                            session_id=msg.get('sessionId', session_id),
                            content=msg.get('content', ''),
                            sender=MessageSender(msg.get('sender', 'user')),
                            timestamp=datetime.fromisoformat(msg.get('timestamp')) if isinstance(msg.get('timestamp'), str) else msg.get('timestamp', datetime.now(timezone.utc)),
                            metadata=msg.get('metadata', {})
                        ))
                    except Exception as e:
                        logger.warning(f"Failed to parse conversation history message: {e}")
                        continue
                logger.info(f"Loaded {len(conversation_history)} messages from conversation history")
            
            # Generate AI response with conversation history
            ai_response = await self.generate_ai_response(
                user_message=request.message,
                project_context=project_context,
                conversation_history=conversation_history
            )
            
            # Create response without persisting anything
            response = ChatResponse(
                response=ai_response.get("response", "I'm here to help with your project."),
                session_id=session_id,
                suggestions=ai_response.get("suggestions", []),
                next_steps=ai_response.get("next_steps", []),
                requires_clarification=False,
                ambiguity_analysis=None
            )
            
            logger.info(f"Generated stateless AI response for project {project_id}")
            return response
            
        except Exception as e:
            logger.error(f"Error processing stateless chat request for project {project_id}: {e}")
            
            # Return a helpful error response instead of raising
            return ChatResponse(
                response="I'm experiencing some technical difficulties. Please try again in a moment.",
                session_id=request.session_id or str(uuid.uuid4()),
                suggestions=["Check your internet connection", "Try rephrasing your question"],
                next_steps=["Wait a moment and try again"],
                requires_clarification=False,
                ambiguity_analysis=None
            )
    
    async def get_project_context(self, project_id: str) -> Optional[ProjectContext]:
        """
        Get project context from Supabase database if available
        
        Args:
            project_id: ID of the project
            
        Returns:
            ProjectContext if project found, None otherwise
        """
        try:
            # Import database connection
            from database.connection import get_db_client
            
            # Get database client
            client = await get_db_client()
            
            # Fetch project from Supabase
            result = client.table('projects').select('*').eq('id', project_id).execute()
            
            if not result.data or len(result.data) == 0:
                logger.info(f"No project found in database for ID: {project_id}")
                return None
            
            project_data = result.data[0]
            
            # Convert database record to ProjectContext
            # Convert string steps to Task objects
            tasks = []
            if project_data.get('steps'):
                for i, step in enumerate(project_data.get('steps', [])[:10]):
                    if isinstance(step, str):
                        # Check if step is completed
                        completed_steps = project_data.get('completed_steps', [])
                        status = TaskStatus.COMPLETED if i in completed_steps else TaskStatus.PENDING
                        
                        tasks.append(Task(
                            id=f"task-{i}",
                            title=step,
                            description=step,
                            status=status,
                            priority=TaskPriority.MEDIUM,
                            estimated_hours=1.0,
                            dependencies=[]
                        ))
            
            project_context = ProjectContext(
                project_id=project_data.get('id', project_id),
                title=project_data.get('title', 'Untitled Project'),
                description=project_data.get('description', ''),
                current_phase=project_data.get('status', 'planning'),
                progress=project_data.get('progress', 0),
                goals=project_data.get('components', [])[:5] if project_data.get('components') else [],
                tasks=tasks,
                milestones=[],
                deadlines=[]
            )
            
            logger.info(f"Retrieved project context from database: {project_context.title} (Progress: {project_context.progress}%)")
            return project_context
            
        except Exception as e:
            logger.warning(f"Failed to get project context from database for {project_id}: {e}")
            return None
    
    async def generate_ai_response(self, user_message: str, project_context: Optional[ProjectContext], conversation_history: List[ChatMessage]) -> Dict[str, Any]:
        """
        Generate AI response using OpenRouter or fallback
        
        Args:
            user_message: User's message
            project_context: Project context if available
            conversation_history: Previous messages from localStorage
            
        Returns:
            Dictionary with AI response, suggestions, and next steps
        """
        try:
            # Format context for AI
            formatted_context = self.format_context_for_ai(project_context, conversation_history)
            
            # Generate AI response with conversation history
            if self.openrouter_client:
                ai_response = await self._generate_ai_response_with_openrouter(
                    formatted_context, 
                    user_message,
                    project_context,
                    conversation_history
                )
            else:
                # Fallback response when AI service is unavailable
                ai_response = self._generate_fallback_response(user_message, project_context)
            
            return ai_response
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return self._generate_fallback_response(user_message, project_context)
    
    def format_context_for_ai(self, project_context: Optional[ProjectContext], conversation_history: List[ChatMessage]) -> str:
        """
        Format project context for AI processing with comprehensive STEM education guidelines
        
        Args:
            project_context: Current project context
            conversation_history: Recent conversation messages
            
        Returns:
            Formatted context string for AI prompt with complete project summary and guidelines
        """
        try:
            context_parts = []
            
            # === CORE SYSTEM INSTRUCTION ===
            context_parts.append("=== CORE SYSTEM INSTRUCTION ===")
            context_parts.append("You are an AI STEM Mentor for school and early-college students.")
            context_parts.append("")
            context_parts.append("Your role:")
            context_parts.append("- Help students generate realistic STEM project ideas")
            context_parts.append("- Break ideas into clear, actionable, beginner-friendly steps")
            context_parts.append("- Explain concepts simply, like a teacher or mentor")
            context_parts.append("- Focus on learning, reasoning, and execution — not showing off code knowledge")
            context_parts.append("")
            context_parts.append("STRICT RULES:")
            context_parts.append("- DO NOT overuse technical jargon")
            context_parts.append("- DO NOT write large code blocks unless explicitly asked")
            context_parts.append("- DO NOT assume the user is an expert")
            context_parts.append("- Prefer explanations, diagrams-in-words, and examples")
            context_parts.append("")
            context_parts.append("OUTPUT STYLE:")
            context_parts.append("- Clear headings")
            context_parts.append("- Bullet points where useful")
            context_parts.append("- Short paragraphs")
            context_parts.append("- Simple language")
            context_parts.append("- Encouraging, mentor-like tone")
            context_parts.append("")
            context_parts.append("PRIORITY ORDER:")
            context_parts.append("1. Clarity")
            context_parts.append("2. Structure")
            context_parts.append("3. Learning value")
            context_parts.append("4. Technical accuracy")
            context_parts.append("5. Optimization (last)")
            context_parts.append("")
            context_parts.append("Think step-by-step internally, but show only the final clean explanation.")
            context_parts.append("")
            
            # === PROJECT GENERATION FORMAT ===
            context_parts.append("=== PROJECT GENERATION FORMAT ===")
            context_parts.append("When generating a STEM project, ALWAYS follow this exact structure:")
            context_parts.append("")
            context_parts.append("Title:")
            context_parts.append("- One clear project title")
            context_parts.append("")
            context_parts.append("Overview:")
            context_parts.append("- 2–3 lines explaining what the project does and why it is useful")
            context_parts.append("")
            context_parts.append("Difficulty:")
            context_parts.append("- Beginner / Intermediate / Advanced")
            context_parts.append("")
            context_parts.append("Estimated Time:")
            context_parts.append("- Total time in days or weeks")
            context_parts.append("")
            context_parts.append("Estimated Cost:")
            context_parts.append("- Approximate cost range")
            context_parts.append("")
            context_parts.append("Required Components:")
            context_parts.append("- Bullet list of components with simple purpose")
            context_parts.append("")
            context_parts.append("Skills You Will Learn:")
            context_parts.append("- Bullet list (no more than 6)")
            context_parts.append("")
            context_parts.append("Project Steps:")
            context_parts.append("- Numbered steps (Step 1, Step 2, ...)")
            context_parts.append("- Each step must be:")
            context_parts.append("  - Small")
            context_parts.append("  - Actionable")
            context_parts.append("  - Verifiable (can be marked as done)")
            context_parts.append("- Avoid combining multiple actions in one step")
            context_parts.append("")
            context_parts.append("Final Outcome:")
            context_parts.append("- What the student will have at the end")
            context_parts.append("")
            
            # === STEP MARKING GUIDELINES ===
            context_parts.append("=== STEP MARKING GUIDELINES ===")
            context_parts.append("For Project Steps:")
            context_parts.append("- Each step must represent ONE clear action")
            context_parts.append("- Steps must be independent")
            context_parts.append("- A step should be completable in 30–90 minutes")
            context_parts.append("- Avoid words like 'etc.', 'and more', or 'continue'")
            context_parts.append("- Each step should start with a verb (Connect, Build, Test, Write, Measure, Upload)")
            context_parts.append("")
            context_parts.append("✅ Example GOOD step:")
            context_parts.append("Step 3: Connect the DHT11 sensor to the Arduino using jumper wires")
            context_parts.append("")
            context_parts.append("❌ Bad step:")
            context_parts.append("Step 3: Connect all sensors and test everything")
            context_parts.append("")
            
            # === DEBUG / EXPLANATION MODE ===
            context_parts.append("=== DEBUG / EXPLANATION MODE ===")
            context_parts.append("When explaining errors or concepts:")
            context_parts.append("- Start with a simple explanation")
            context_parts.append("- Then explain the technical reason")
            context_parts.append("- End with a clear fix or next action")
            context_parts.append("")
            
            # Add project context if available
            if project_context:
                context_parts.append("=== CURRENT PROJECT SUMMARY ===")
                context_parts.append(f"Project: {project_context.title}")
                context_parts.append(f"Description: {project_context.description}")
                context_parts.append(f"Current Phase: {project_context.current_phase}")
                context_parts.append(f"Progress: {project_context.progress}%")
                context_parts.append("")
                
                # Add components/goals
                if project_context.goals:
                    context_parts.append("Components/Requirements:")
                    for goal in project_context.goals[:10]:  # Show up to 10 components
                        context_parts.append(f"  - {goal}")
                    context_parts.append("")
                
                # Add ALL project steps with completion status
                if project_context.tasks:
                    context_parts.append("Project Steps:")
                    for i, task in enumerate(project_context.tasks, 1):
                        status_indicator = "✓" if task.status == TaskStatus.COMPLETED else "○"
                        context_parts.append(f"  {status_indicator} Step {i}: {task.title}")
                    context_parts.append("")
                    
                    # Add progress summary
                    completed_count = sum(1 for task in project_context.tasks if task.status == TaskStatus.COMPLETED)
                    total_count = len(project_context.tasks)
                    context_parts.append(f"Steps Completed: {completed_count} of {total_count}")
                    context_parts.append("")
            
            # Add final guidance reminders
            context_parts.append("=== YOUR RESPONSE GUIDELINES ===")
            context_parts.append("- Provide specific, actionable advice based on the project summary above")
            context_parts.append("- Reference specific project steps when relevant")
            context_parts.append("- Suggest concrete next steps based on current progress")
            context_parts.append("- Keep responses helpful, encouraging, and student-friendly")
            context_parts.append("- Focus on STEM education and learning outcomes")
            context_parts.append("- Use simple language appropriate for students")
            context_parts.append("- Break down complex concepts into digestible parts")
            context_parts.append("")
            
            formatted_context = "\n".join(context_parts)
            
            logger.debug(f"Formatted context for AI processing ({len(formatted_context)} characters)")
            return formatted_context
            
        except Exception as e:
            logger.error(f"Error formatting context for AI: {e}")
            # Return comprehensive context even on error
            return """You are an AI STEM Mentor for students. 
Help them with their STEM project using clear, simple language.
Focus on learning and practical steps. Avoid jargon unless necessary."""
    
    async def _generate_ai_response_with_openrouter(self, formatted_context: str, user_message: str, project_context: Optional[ProjectContext], conversation_history: List[ChatMessage]) -> Dict[str, Any]:
        """
        Generate AI response using OpenRouter API
        
        Args:
            formatted_context: Formatted context for AI
            user_message: User's message
            project_context: Project context for additional analysis
            conversation_history: Recent conversation messages for context
            
        Returns:
            Dictionary with AI response, suggestions, and next steps
        """
        try:
            # Prepare messages for OpenRouter - include conversation history
            messages = [
                {
                    "role": "system",
                    "content": formatted_context
                }
            ]
            
            # Add conversation history (last 10 messages to keep context manageable)
            # This allows the AI to remember what was discussed previously
            for msg in conversation_history[-10:]:
                messages.append({
                    "role": "user" if msg.sender == MessageSender.USER else "assistant",
                    "content": msg.content
                })
            
            # Add the current user message
            messages.append({
                "role": "user", 
                "content": f"Please help me with this question about my project: {user_message}"
            })
            
            logger.info(f"Sending {len(messages)} messages to OpenRouter (including {len(conversation_history[-10:])} history messages)")
            
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
            
            logger.info("Generated AI response using OpenRouter with conversation context")
            return parsed_response
            
        except Exception as e:
            logger.error(f"Error generating AI response with OpenRouter: {e}")
            # Fall back to simple response
            return self._generate_fallback_response(user_message, project_context)
    
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
                "Research similar projects for inspiration",
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
                "Gather necessary materials",
                "Start with a simple prototype"
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
                suggestions.append("You're in the home stretch - focus on testing and refinement")
            else:
                suggestions.append("Great progress! Consider documentation and sharing your results")
            
            # Add project-type specific suggestions
            if "robot" in project_context.title.lower() or "robot" in project_context.description.lower():
                suggestions.append("Test individual components before integrating the full system")
            elif "iot" in project_context.title.lower() or "sensor" in project_context.description.lower():
                suggestions.append("Ensure reliable data collection before adding complex features")
            elif "app" in project_context.title.lower() or "software" in project_context.description.lower():
                suggestions.append("Start with core functionality before adding advanced features")
            
        except Exception as e:
            logger.error(f"Error generating context-based suggestions: {e}")
        
        return suggestions
    
    def _generate_fallback_response(self, user_message: str, project_context: Optional[ProjectContext]) -> Dict[str, Any]:
        """
        Generate a fallback response when AI service is unavailable
        
        Args:
            user_message: User's message
            project_context: Project context if available
            
        Returns:
            Dictionary with fallback response
        """
        # Analyze the user message for keywords
        message_lower = user_message.lower()
        
        # Handle step guidance requests specifically
        if any(word in message_lower for word in ["guide", "steps", "step-by-step", "how to", "step 1", "step1"]) or "project details:" in message_lower:
            if project_context:
                response = f"Perfect! I can see you're working on **'{project_context.title}'** - {project_context.description}\n\n"
                response += f"**Current Status:** {project_context.current_phase} phase ({project_context.progress}% complete)\n\n"
                
                # Generate project-specific steps based on context
                if project_context.current_phase == "planning":
                    response += "Since you're in the **planning phase**, here's your step-by-step roadmap:\n\n"
                    response += "## 🎯 **Phase 1: Foundation & Planning (Current)**\n"
                    suggestions = [
                        "Define clear project objectives and requirements",
                        "Research components and materials needed", 
                        "Create a detailed timeline with milestones",
                        "Set up your workspace and tools"
                    ]
                    next_steps = [
                        "List all required components and materials",
                        "Research suppliers and costs",
                        "Create a project timeline", 
                        "Set up development environment"
                    ]
                elif project_context.current_phase == "development" or project_context.current_phase == "in-progress":
                    response += "Great! You're in the **development phase**. Here's what to focus on:\n\n"
                    response += "## 🔧 **Phase 2: Development & Implementation**\n"
                    suggestions = [
                        "Start with basic functionality first",
                        "Test each component individually",
                        "Document your progress regularly",
                        "Keep backups of working versions"
                    ]
                    next_steps = [
                        "Implement core functionality",
                        "Test individual components", 
                        "Integrate components step by step",
                        "Debug and troubleshoot issues"
                    ]
                else:
                    response += f"You're in the **{project_context.current_phase}** phase. Here's your guidance:\n\n"
                    suggestions = [
                        "Focus on completing current tasks",
                        "Test thoroughly before moving forward",
                        "Document your work for future reference",
                        "Consider optimization opportunities"
                    ]
                    next_steps = [
                        "Complete current milestone",
                        "Test all functionality",
                        "Optimize performance",
                        "Prepare for next phase"
                    ]
                
                # Add component-specific guidance if available
                if project_context.goals:
                    response += f"**Key Components:** {', '.join(project_context.goals[:5])}\n\n"
                    
                # Add task-specific guidance if available
                if project_context.tasks:
                    response += f"**Your Project Steps:**\n"
                    for i, task in enumerate(project_context.tasks[:8], 1):
                        status_emoji = "✅" if task.status == TaskStatus.COMPLETED else "🔄" if task.status == TaskStatus.IN_PROGRESS else "⏳"
                        response += f"{i}. {status_emoji} {task.title}\n"
                    response += "\n**Let's focus on your next step!** What specific area would you like help with?"
                else:
                    response += "**Next Actions:**\n"
                    response += "1. Break down your project into smaller, manageable tasks\n"
                    response += "2. Start with the most critical component\n"
                    response += "3. Test each part before moving to the next\n\n"
                    response += "What specific aspect would you like to work on first?"
                
            # Handle detailed project information in the message
            elif "project title:" in message_lower or "description:" in message_lower:
                response = "Excellent! Thank you for providing your detailed project information. Let me analyze this and give you a comprehensive step-by-step plan.\n\n"
                
                # Extract project info from the message if possible
                lines = user_message.split('\n')
                project_title = "your project"
                project_status = "planning"
                
                for line in lines:
                    if "project title:" in line.lower():
                        project_title = line.split(':', 1)[1].strip() if ':' in line else project_title
                    elif "current status:" in line.lower():
                        if "planning" in line.lower():
                            project_status = "planning"
                        elif "progress" in line.lower() or "development" in line.lower():
                            project_status = "development"
                
                response += f"Based on your **{project_title}** project details, here's your personalized guidance:\n\n"
                
                if "planning" in project_status.lower():
                    response += "## 🎯 **Phase 1: Planning & Preparation**\n"
                    response += "Since you're in the planning phase, let's establish a solid foundation:\n\n"
                    response += "**Immediate Next Steps:**\n"
                    response += "1. **Define Success Criteria** - What does 'done' look like?\n"
                    response += "2. **Component Research** - Verify all parts are available and compatible\n"
                    response += "3. **Timeline Creation** - Set realistic milestones\n"
                    response += "4. **Risk Assessment** - Identify potential challenges early\n\n"
                else:
                    response += "## 🔧 **Development Phase Guidance**\n"
                    response += "**Focus Areas:**\n"
                    response += "1. **Start Small** - Build and test one component at a time\n"
                    response += "2. **Document Everything** - Keep notes on what works and what doesn't\n"
                    response += "3. **Test Frequently** - Don't wait until the end to test\n"
                    response += "4. **Iterate Quickly** - Make small improvements continuously\n\n"
                
                response += "**What specific area would you like to dive deeper into?**\n"
                response += "- Component selection and sourcing\n"
                response += "- Technical implementation details\n"
                response += "- Project timeline and milestones\n"
                response += "- Troubleshooting and testing strategies"
                
                suggestions = [
                    "Help me choose the right components",
                    "Create a detailed project timeline",
                    "Explain the technical implementation",
                    "Set up testing and validation procedures"
                ]
                next_steps = [
                    "Research component specifications",
                    "Create project milestone timeline",
                    "Start with basic prototype",
                    "Set up development environment"
                ]
            else:
                response = "I'd love to help you with step-by-step guidance! However, I don't have access to your specific project details right now. "
                response += "This might be because:\n\n"
                response += "• The project data isn't loaded in your browser's local storage\n"
                response += "• There's a connection issue between the interface and your project data\n\n"
                response += "**To get personalized step guidance, please:**\n"
                response += "1. Make sure you're on the project detail page\n"
                response += "2. Try refreshing the page and opening guidance again\n"
                response += "3. Or tell me about your project manually\n\n"
                response += "**General Step 1 guidance for any STEM project:**"
                
                suggestions = [
                    "Start by clearly defining your project goals",
                    "Break your project into smaller, manageable tasks", 
                    "Research the components and tools you'll need",
                    "Create a timeline with realistic milestones"
                ]
                next_steps = [
                    "Define your project objectives",
                    "List required materials and tools",
                    "Create a project timeline",
                    "Start with the first milestone"
                ]
        
        # Generate contextual response based on other keywords
        elif any(word in message_lower for word in ["help", "stuck", "problem", "issue"]):
            response = "I understand you're facing a challenge with your project. "
            suggestions = [
                "Break the problem down into smaller parts",
                "Research similar solutions online",
                "Ask for help from teachers or peers",
                "Try a different approach"
            ]
            next_steps = [
                "Identify the specific issue you're facing",
                "Look for similar problems and solutions",
                "Test one small change at a time"
            ]
        elif any(word in message_lower for word in ["how", "what", "when", "where", "why"]):
            response = "That's a great question! Let me help you think through this step by step."
            suggestions = [
                "Start with research and planning",
                "Look for examples and tutorials",
                "Consider the resources you have available"
            ]
            next_steps = [
                "Define what you want to achieve",
                "Research the best approaches",
                "Create a step-by-step plan"
            ]
        else:
            response = "I'm here to help with your project! "
            suggestions = [
                "Feel free to ask specific questions",
                "Share what you're working on",
                "Let me know if you need guidance"
            ]
            next_steps = [
                "Think about what you need help with",
                "Ask specific questions",
                "Share your current progress"
            ]
        
        # Add project-specific context if available and not already added
        if project_context and "guide" not in message_lower:
            response += f"I can see you're working on '{project_context.title}' which is at {project_context.progress}% completion. "
        
        return {
            "response": response,
            "suggestions": suggestions,
            "next_steps": next_steps,
            "confidence": 0.6
        }