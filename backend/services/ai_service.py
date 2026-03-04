"""
AI Service - Consolidated AI Guidance Service
Consolidates functionality from ai_guidance_service and stateless_ai_guidance_service.

Requirements: 1.3, 1.4
Task: 7.1 Consolidate AI guidance functionality
"""

import logging
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from backend.infrastructure.base_service import BaseService
from backend.models.ai_guidance import (
    ChatSession, ChatMessage, ProjectContext, GuidanceRequest, GuidanceResponse,
    ChatRequest, ChatResponse, MessageSender, Task, TaskStatus, TaskPriority,
    AmbiguityAnalysis, FollowUpQuestion, ClarificationRequest
)
from backend.database.ai_guidance_crud import (
    ChatSessionCRUD, ChatMessageCRUD, AIContextCacheCRUD,
    CreateSessionParams, CreateMessageParams, UpdateSessionParams
)
from backend.services.project_context_service import ProjectContextService

logger = logging.getLogger(__name__)


class AIService(BaseService):
    """
    Unified AI Service consolidating AI guidance functionality.
    
    Supports both stateful (session-based) and stateless (one-off) AI interactions.
    Extends BaseService for caching, logging, and database access.
    
    Requirements:
    - 1.3: Consolidate AI services
    - 1.4: Preserve functionality from legacy services
    """
    
    def __init__(self, cache=None, logger_instance=None, db_client=None):
        """Initialize AI Service with dependencies."""
        super().__init__(cache, logger_instance, db_client)
        
        # Initialize CRUD operations for stateful mode
        self.session_crud = ChatSessionCRUD()
        self.message_crud = ChatMessageCRUD()
        self.context_crud = AIContextCacheCRUD()
        self.project_context_service = ProjectContextService()
        
        # OpenRouter client will be set by server.py after initialization
        self.openrouter_client = None
        self.openrouter_config = None
        
        # Initialize circuit breaker for OpenRouter API calls
        # Requirements: 5.1, 5.2, 5.6
        from backend.infrastructure.circuit_breaker import get_circuit_breaker
        self.circuit_breaker = get_circuit_breaker(
            name="openrouter_api",
            failure_threshold=5,  # Open circuit after 5 consecutive failures
            success_threshold=2,  # Close circuit after 2 consecutive successes
            timeout=timedelta(seconds=60),  # Wait 60 seconds before trying again
            half_open_timeout=timedelta(seconds=30)  # Wait 30 seconds in half-open state
        )
        
        # Cache configuration for AI responses
        # Requirements: 3.2, 3.3, 9.7
        self.ai_cache_ttl = timedelta(hours=1)  # 1 hour TTL for AI responses
        self.common_prompts_cache = {}  # In-memory cache for common prompts
        
        self.logger.info("AIService initialized - supports both stateful and stateless modes with circuit breaker protection and AI response caching")
    
    # ========== AI Response Caching Methods ==========
    
    def _generate_prompt_hash(self, user_message: str, project_context: Optional[ProjectContext] = None) -> str:
        """
        Generate a hash for the prompt to use as cache key.
        
        Uses SHA-256 hash of the user message and relevant project context.
        
        Args:
            user_message: The user's message
            project_context: Optional project context
            
        Returns:
            SHA-256 hash string to use as cache key
            
        Requirements: 3.2, 9.7
        """
        import hashlib
        
        # Create a string representation of the prompt
        prompt_parts = [user_message.strip().lower()]
        
        # Add relevant project context to the hash
        if project_context:
            prompt_parts.append(project_context.project_id)
            prompt_parts.append(project_context.title.lower())
            prompt_parts.append(str(project_context.progress))
        
        # Combine and hash
        prompt_string = "|".join(prompt_parts)
        prompt_hash = hashlib.sha256(prompt_string.encode('utf-8')).hexdigest()
        
        return prompt_hash
    
    async def _get_cached_ai_response(self, prompt_hash: str) -> Optional[Dict[str, Any]]:
        """
        Get cached AI response by prompt hash.
        
        Args:
            prompt_hash: Hash of the prompt
            
        Returns:
            Cached response dict or None if not found
            
        Requirements: 3.2, 9.7
        """
        try:
            cache_key = f"ai_response:{prompt_hash}"
            cached_data = await self.get_cache(cache_key)
            
            if cached_data:
                self.logger.info(f"Cache HIT for AI response: {prompt_hash[:16]}...")
                return cached_data
            
            self.logger.debug(f"Cache MISS for AI response: {prompt_hash[:16]}...")
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting cached AI response: {e}")
            return None
    
    async def _cache_ai_response(self, prompt_hash: str, response: Dict[str, Any]) -> bool:
        """
        Cache AI response with prompt hash as key.
        
        Args:
            prompt_hash: Hash of the prompt
            response: AI response to cache
            
        Returns:
            True if cached successfully, False otherwise
            
        Requirements: 3.2, 3.3, 9.7
        """
        try:
            cache_key = f"ai_response:{prompt_hash}"
            await self.set_cache(cache_key, response, ttl=self.ai_cache_ttl)
            self.logger.info(f"Cached AI response: {prompt_hash[:16]}... (TTL: {self.ai_cache_ttl})")
            return True
            
        except Exception as e:
            self.logger.error(f"Error caching AI response: {e}")
            return False
    
    async def warm_common_prompts(self, common_prompts: List[Dict[str, Any]]) -> int:
        """
        Warm cache with common prompts by pre-generating responses.
        
        This method pre-generates and caches responses for frequently asked questions
        to improve response times for common queries.
        
        Args:
            common_prompts: List of dicts with 'message' and optional 'project_context'
            
        Returns:
            Number of prompts successfully warmed
            
        Requirements: 9.7
        """
        warmed_count = 0
        
        try:
            self.logger.info(f"Starting cache warming for {len(common_prompts)} common prompts")
            
            for prompt_data in common_prompts:
                try:
                    user_message = prompt_data.get('message')
                    project_context = prompt_data.get('project_context')
                    
                    if not user_message:
                        continue
                    
                    # Generate prompt hash
                    prompt_hash = self._generate_prompt_hash(user_message, project_context)
                    
                    # Check if already cached
                    cached = await self._get_cached_ai_response(prompt_hash)
                    if cached:
                        self.logger.debug(f"Prompt already cached: {user_message[:50]}...")
                        warmed_count += 1
                        continue
                    
                    # Generate and cache response
                    self.logger.info(f"Warming cache for: {user_message[:50]}...")
                    response = await self.generate_ai_response(
                        user_message=user_message,
                        project_context=project_context,
                        conversation_history=[]
                    )
                    
                    # Cache the response
                    await self._cache_ai_response(prompt_hash, response)
                    warmed_count += 1
                    
                except Exception as e:
                    self.logger.error(f"Error warming prompt '{user_message[:50]}...': {e}")
                    continue
            
            self.logger.info(f"Cache warming complete: {warmed_count}/{len(common_prompts)} prompts warmed")
            return warmed_count
            
        except Exception as e:
            self.logger.error(f"Error in cache warming: {e}")
            return warmed_count
    
    async def invalidate_ai_cache_on_model_update(self, model_name: Optional[str] = None) -> int:
        """
        Invalidate AI response cache when model is updated.
        
        This ensures users get responses from the new model version.
        
        Args:
            model_name: Optional specific model name to invalidate (invalidates all if None)
            
        Returns:
            Number of cache entries invalidated
            
        Requirements: 3.5, 9.7
        """
        try:
            if model_name:
                # Invalidate specific model responses
                pattern = f"ai_response:*:{model_name}:*"
                self.logger.info(f"Invalidating AI cache for model: {model_name}")
            else:
                # Invalidate all AI responses
                pattern = "ai_response:*"
                self.logger.info("Invalidating all AI response cache entries")
            
            count = await self.invalidate_cache(pattern)
            self.logger.info(f"Invalidated {count} AI response cache entries")
            
            return count
            
        except Exception as e:
            self.logger.error(f"Error invalidating AI cache: {e}")
            return 0
    
    # ========== Stateful Mode Methods (from ai_guidance_service) ==========
    
    async def generateResponse(self, request: GuidanceRequest) -> GuidanceResponse:
        """
        Generate AI response based on project context and user message (stateful mode).
        
        This method maintains conversation history in the database.
        
        Args:
            request: Guidance request with project ID, user message, and conversation history
            
        Returns:
            AI-generated guidance response with suggestions and next steps
            
        Raises:
            ValueError: If request parameters are invalid
        """
        try:
            # Validate input
            if not request.project_id or not request.user_message:
                raise ValueError("project_id and user_message are required")
            
            # Check cache for similar queries first
            cache_key = f"guidance:{request.project_id}:{hash(request.user_message)}"
            cached_response = await self.get_cache(cache_key)
            if cached_response:
                self.logger.info(f"Returning cached response for project {request.project_id}")
                return GuidanceResponse(**cached_response)
            
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
                    confidence=0.6,
                    ambiguity_analysis=ambiguity_analysis,
                    clarification_request=clarification_request,
                    requires_clarification=True
                )
            
            # Format context for AI
            formatted_context = self.formatContextForAI(project_context, request.conversation_history)
            
            # Generate AI response
            if self.openrouter_client:
                ai_response = await self._generate_ai_response_with_openrouter(
                    formatted_context, 
                    request.user_message,
                    project_context,
                    request.conversation_history
                )
            else:
                ai_response = self._generate_fallback_response(request.user_message, project_context)
            
            # Create structured response
            response = GuidanceResponse(
                response=ai_response.get("response", "I'm here to help with your project."),
                suggestions=ai_response.get("suggestions", [])[:8],
                next_steps=ai_response.get("next_steps", [])[:5],
                confidence=ai_response.get("confidence", 0.8),
                ambiguity_analysis=ambiguity_analysis if ambiguity_analysis.ambiguity_score > 0.3 else None,
                requires_clarification=False
            )
            
            # Cache the response
            await self.set_cache(cache_key, response.dict(), ttl=timedelta(hours=1))
            
            self.logger.info(f"Generated AI response for project {request.project_id}")
            return response
            
        except ValueError as e:
            self.logger.error(f"Validation error in generateResponse: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error generating AI response: {e}")
            return GuidanceResponse(
                response="I'm experiencing some technical difficulties. Please try again in a moment.",
                suggestions=["Check your internet connection", "Try rephrasing your question"],
                next_steps=["Wait a moment and try again"],
                confidence=0.1
            )
    
    # ========== Stateless Mode Methods (from stateless_ai_guidance_service) ==========
    
    async def process_chat_request(self, project_id: str, request: ChatRequest) -> ChatResponse:
        """
        Process a chat request without persisting data (stateless mode).
        
        Frontend handles all chat history via localStorage.
        
        Args:
            project_id: ID of the project
            request: Chat request with message and optional session ID and project context
            
        Returns:
            Chat response with AI-generated content
        """
        try:
            self.logger.info(f"Processing stateless chat request for project {project_id}")
            
            # Generate session ID if not provided (for frontend use)
            session_id = request.session_id or str(uuid.uuid4())
            
            # Use project context from request if provided
            project_context = None
            if request.project_context:
                project_context = self._convert_frontend_project_context(
                    request.project_context, 
                    project_id
                )
                self.logger.info(f"Using project context from request: {project_context.title}")
            else:
                # Fallback to database lookup
                project_context = await self.get_project_context(project_id)
            
            # Convert conversation history from request
            conversation_history = self._convert_conversation_history(
                request.conversation_history, 
                session_id
            )
            
            # Generate AI response
            ai_response = await self.generate_ai_response(
                user_message=request.message,
                project_context=project_context,
                conversation_history=conversation_history
            )
            
            # Create response without persisting
            response = ChatResponse(
                response=ai_response.get("response", "I'm here to help with your project."),
                session_id=session_id,
                suggestions=ai_response.get("suggestions", []),
                next_steps=ai_response.get("next_steps", []),
                requires_clarification=False,
                ambiguity_analysis=None
            )
            
            self.logger.info(f"Generated stateless AI response for project {project_id}")
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing stateless chat request: {e}")
            return ChatResponse(
                response="I'm experiencing some technical difficulties. Please try again in a moment.",
                session_id=request.session_id or str(uuid.uuid4()),
                suggestions=["Check your internet connection", "Try rephrasing your question"],
                next_steps=["Wait a moment and try again"],
                requires_clarification=False,
                ambiguity_analysis=None
            )
    
    # ========== Common Methods ==========
    
    async def analyzeProjectContext(self, project_id: str) -> Optional[ProjectContext]:
        """
        Analyze and retrieve comprehensive project context for AI processing.
        
        Args:
            project_id: ID of the project to analyze
            
        Returns:
            Analyzed project context with current state, tasks, and milestones
        """
        try:
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # Try cache first
            cache_key = f"project_context:{project_id}"
            cached_context = await self.get_cache(cache_key)
            if cached_context:
                self.logger.debug(f"Cache hit for project context: {project_id}")
                return ProjectContext(**cached_context)
            
            # Get from service
            context = await self.project_context_service.getProjectContext(project_id)
            
            # Cache for 2 hours
            if context:
                await self.set_cache(cache_key, context.dict(), ttl=timedelta(hours=2))
                self.logger.info(f"Analyzed project context for {project_id}: {context.title}")
            else:
                self.logger.warning(f"No project context found for {project_id}")
            
            return context
            
        except ValueError as e:
            self.logger.error(f"Validation error in analyzeProjectContext: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error analyzing project context: {e}")
            raise
    
    async def get_project_context(self, project_id: str) -> Optional[ProjectContext]:
        """
        Get project context from database (for stateless mode).
        
        Args:
            project_id: ID of the project
            
        Returns:
            ProjectContext if project found, None otherwise
        """
        try:
            from database.connection import get_db_client
            
            client = await get_db_client()
            result = client.table('projects').select('*').eq('id', project_id).execute()
            
            if not result.data or len(result.data) == 0:
                self.logger.info(f"No project found in database for ID: {project_id}")
                return None
            
            project_data = result.data[0]
            
            # Convert to ProjectContext
            tasks = []
            if project_data.get('steps'):
                completed_steps = project_data.get('completed_steps', [])
                for i, step in enumerate(project_data.get('steps', [])[:10]):
                    if isinstance(step, str):
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
            
            self.logger.info(f"Retrieved project context: {project_context.title}")
            return project_context
            
        except Exception as e:
            self.logger.warning(f"Failed to get project context: {e}")
            return None
    
    def formatContextForAI(self, project_context: Optional[ProjectContext], conversation_history: List[ChatMessage]) -> str:
        """
        Format project context and conversation history for AI processing.
        
        Args:
            project_context: Current project context
            conversation_history: Recent conversation messages
            
        Returns:
            Formatted context string for AI prompt
        """
        try:
            context_parts = []
            
            # Core system instruction
            context_parts.append("=== CORE SYSTEM INSTRUCTION ===")
            context_parts.append("You are an AI STEM Mentor for school and early-college students.")
            context_parts.append("")
            context_parts.append("Your role:")
            context_parts.append("- Help students with STEM project ideas and execution")
            context_parts.append("- Break ideas into clear, actionable, beginner-friendly steps")
            context_parts.append("- Explain concepts simply, like a teacher or mentor")
            context_parts.append("- Focus on learning, reasoning, and execution")
            context_parts.append("")
            context_parts.append("STRICT RULES:")
            context_parts.append("- DO NOT overuse technical jargon")
            context_parts.append("- DO NOT write large code blocks unless explicitly asked")
            context_parts.append("- DO NOT assume the user is an expert")
            context_parts.append("- Prefer explanations and examples")
            context_parts.append("")
            
            # Add project context if available
            if project_context:
                context_parts.append("=== CURRENT PROJECT SUMMARY ===")
                context_parts.append(f"Project: {project_context.title}")
                context_parts.append(f"Description: {project_context.description}")
                context_parts.append(f"Current Phase: {project_context.current_phase}")
                context_parts.append(f"Progress: {project_context.progress}%")
                context_parts.append("")
                
                if project_context.goals:
                    context_parts.append("Components/Requirements:")
                    for goal in project_context.goals[:10]:
                        context_parts.append(f"  - {goal}")
                    context_parts.append("")
                
                if project_context.tasks:
                    context_parts.append("Project Steps:")
                    for i, task in enumerate(project_context.tasks, 1):
                        status_indicator = "✓" if task.status == TaskStatus.COMPLETED else "○"
                        context_parts.append(f"  {status_indicator} Step {i}: {task.title}")
                    context_parts.append("")
                    
                    completed_count = sum(1 for task in project_context.tasks if task.status == TaskStatus.COMPLETED)
                    total_count = len(project_context.tasks)
                    context_parts.append(f"Steps Completed: {completed_count} of {total_count}")
                    context_parts.append("")
            
            # Add conversation history if available
            if conversation_history:
                context_parts.append("=== RECENT CONVERSATION ===")
                recent_messages = conversation_history[-10:]
                
                for message in recent_messages:
                    sender_label = "User" if message.sender == MessageSender.USER else "Assistant"
                    context_parts.append(f"{sender_label}: {message.content}")
                
                context_parts.append("")
            
            # Final guidance
            context_parts.append("=== YOUR RESPONSE GUIDELINES ===")
            context_parts.append("- Provide specific, actionable advice")
            context_parts.append("- Reference project context when relevant")
            context_parts.append("- Suggest concrete next steps")
            context_parts.append("- Keep responses helpful and encouraging")
            context_parts.append("")
            
            formatted_context = "\n".join(context_parts)
            self.logger.debug(f"Formatted context ({len(formatted_context)} characters)")
            return formatted_context
            
        except Exception as e:
            self.logger.error(f"Error formatting context: {e}")
            return "You are an AI STEM Mentor. Help the student with their project question."
    
    async def generate_ai_response(self, user_message: str, project_context: Optional[ProjectContext], conversation_history: List[ChatMessage]) -> Dict[str, Any]:
        """
        Generate AI response using OpenRouter or fallback with prompt hash-based caching.
        
        Implements:
        - Prompt hash-based caching with 1 hour TTL
        - Cache check before generating response
        - Automatic cache storage after generation
        
        Args:
            user_message: User's message
            project_context: Project context if available
            conversation_history: Previous messages
            
        Returns:
            Dictionary with AI response, suggestions, and next steps
            
        Requirements: 3.2, 3.3, 9.7
        """
        try:
            # Generate prompt hash for caching
            # Requirements: 3.2, 9.7
            prompt_hash = self._generate_prompt_hash(user_message, project_context)
            
            # Check cache first
            cached_response = await self._get_cached_ai_response(prompt_hash)
            if cached_response:
                self.logger.info(f"Returning cached AI response for prompt: {user_message[:50]}...")
                return cached_response
            
            # Cache miss - generate new response
            formatted_context = self.formatContextForAI(project_context, conversation_history)
            
            if self.openrouter_client:
                ai_response = await self._generate_ai_response_with_openrouter(
                    formatted_context, 
                    user_message,
                    project_context,
                    conversation_history
                )
            else:
                ai_response = self._generate_fallback_response(user_message, project_context)
            
            # Cache the response
            # Requirements: 3.2, 3.3, 9.7
            await self._cache_ai_response(prompt_hash, ai_response)
            
            return ai_response
            
        except Exception as e:
            self.logger.error(f"Error generating AI response: {e}")
            return self._generate_fallback_response(user_message, project_context)
    
    async def _generate_ai_response_with_openrouter(
        self, 
        formatted_context: str, 
        user_message: str, 
        project_context: Optional[ProjectContext],
        conversation_history: List[ChatMessage]
    ) -> Dict[str, Any]:
        """
        Generate AI response using OpenRouter API with circuit breaker protection.
        
        Implements:
        - Circuit breaker pattern to prevent cascading failures
        - Retry logic with exponential backoff
        - Fallback responses when circuit is open
        
        Args:
            formatted_context: Formatted context for AI
            user_message: User's message
            project_context: Project context for additional analysis
            conversation_history: Recent conversation messages
            
        Returns:
            Dictionary with AI response, suggestions, and next steps
            
        Requirements:
        - 5.1: Circuit breaker for external API calls
        - 5.2: Reject requests when circuit is open
        - 5.6: Fallback responses when circuit is open
        """
        import asyncio
        
        # Prepare messages with conversation history
        messages = [{"role": "system", "content": formatted_context}]
        
        # Add conversation history (last 10 messages)
        for msg in conversation_history[-10:]:
            messages.append({
                "role": "user" if msg.sender == MessageSender.USER else "assistant",
                "content": msg.content
            })
        
        # Add current message
        messages.append({
            "role": "user", 
            "content": f"Please help me with this question about my project: {user_message}"
        })
        
        self.logger.info(f"Sending {len(messages)} messages to OpenRouter with circuit breaker protection")
        
        # Define the OpenRouter API call function
        async def make_openrouter_call():
            """Make the actual OpenRouter API call with retry logic."""
            max_retries = 3
            base_delay = 1.0  # Start with 1 second
            
            for attempt in range(max_retries):
                try:
                    self.logger.info(f"OpenRouter API call attempt {attempt + 1}/{max_retries}")
                    
                    # Generate response using OpenRouter
                    response = await self.openrouter_client.generate_completion(
                        messages=messages,
                        max_tokens=2000,
                        temperature=0.7,
                        top_p=0.9,
                        model="upstage/solar-pro-3:free"
                    )
                    
                    ai_content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
                    
                    if not ai_content:
                        raise Exception("Empty response from AI service")
                    
                    # Parse structured response
                    parsed_response = self._parse_ai_response(ai_content, project_context)
                    
                    self.logger.info("Generated AI response using OpenRouter")
                    return parsed_response
                    
                except Exception as e:
                    self.logger.warning(f"OpenRouter API call attempt {attempt + 1} failed: {e}")
                    
                    # If this is the last attempt, raise the exception
                    if attempt == max_retries - 1:
                        self.logger.error(f"All {max_retries} OpenRouter API call attempts failed")
                        raise
                    
                    # Exponential backoff: 1s, 2s, 4s
                    delay = base_delay * (2 ** attempt)
                    self.logger.info(f"Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
        
        # Define fallback function for when circuit is open
        def fallback_response():
            """Generate fallback response when circuit breaker is open."""
            self.logger.warning("Circuit breaker is OPEN - using fallback response")
            return self._generate_fallback_response(user_message, project_context)
        
        try:
            # Execute OpenRouter call with circuit breaker protection
            # Requirements: 5.1, 5.2, 5.6
            result = await self.circuit_breaker.call(
                make_openrouter_call,
                fallback=fallback_response
            )
            return result
            
        except Exception as e:
            self.logger.error(f"Error with OpenRouter (after circuit breaker): {e}")
            # If circuit breaker call fails, use fallback
            return self._generate_fallback_response(user_message, project_context)
    
    def _parse_ai_response(self, ai_content: str, project_context: Optional[ProjectContext]) -> Dict[str, Any]:
        """
        Parse AI response content and extract structured information.
        
        Args:
            ai_content: Raw AI response content
            project_context: Project context for additional suggestions
            
        Returns:
            Structured response with suggestions and next steps
        """
        try:
            # Try to parse JSON if structured
            if ai_content.strip().startswith("{") and ai_content.strip().endswith("}"):
                try:
                    parsed = json.loads(ai_content)
                    if isinstance(parsed, dict) and "response" in parsed:
                        return parsed
                except json.JSONDecodeError:
                    pass
            
            # Extract suggestions and next steps
            suggestions = self._extract_suggestions_from_text(ai_content)
            next_steps = self._extract_next_steps_from_text(ai_content)
            
            # Add context-based suggestions
            if project_context:
                context_suggestions = self._generate_context_based_suggestions(project_context)
                suggestions.extend(context_suggestions[:2])
            
            return {
                "response": ai_content,
                "suggestions": suggestions[:5],
                "next_steps": next_steps[:5],
                "confidence": 0.8
            }
            
        except Exception as e:
            self.logger.error(f"Error parsing AI response: {e}")
            return {
                "response": ai_content,
                "suggestions": [],
                "next_steps": [],
                "confidence": 0.6
            }
    
    def _extract_suggestions_from_text(self, text: str) -> List[str]:
        """Extract suggestions from AI response text."""
        suggestions = []
        
        suggestion_patterns = [
            "I suggest", "I recommend", "You might want to", "Consider", 
            "You could", "Try", "It would be helpful to"
        ]
        
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if any(pattern in line for pattern in suggestion_patterns):
                for pattern in suggestion_patterns:
                    if pattern in line:
                        suggestion = line.split(pattern, 1)[-1].strip()
                        if suggestion and len(suggestion) > 10:
                            suggestions.append(suggestion[:200])
                        break
        
        if not suggestions:
            suggestions = [
                "Break down your task into smaller steps",
                "Research similar projects for inspiration",
                "Consider what resources you might need"
            ]
        
        return suggestions
    
    def _extract_next_steps_from_text(self, text: str) -> List[str]:
        """Extract next steps from AI response text."""
        next_steps = []
        
        step_patterns = [
            "Next step", "First", "Then", "After that", "Finally",
            "Start by", "Begin with", "The next thing"
        ]
        
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if any(pattern in line for pattern in step_patterns):
                for pattern in step_patterns:
                    if pattern in line:
                        step = line.split(pattern, 1)[-1].strip()
                        if step and len(step) > 5:
                            next_steps.append(step[:200])
                        break
        
        # Look for numbered or bulleted lists
        for line in lines:
            line = line.strip()
            if (line.startswith(('1.', '2.', '3.', '4.', '5.')) or 
                line.startswith(('- ', '* ', '• '))):
                step = line[2:].strip() if line.startswith(('- ', '* ')) else line[3:].strip()
                if step and len(step) > 5:
                    next_steps.append(step[:200])
        
        if not next_steps:
            next_steps = [
                "Define your specific requirements",
                "Create a detailed action plan",
                "Gather necessary materials",
                "Start with a simple prototype"
            ]
        
        return next_steps
    
    def _generate_context_based_suggestions(self, project_context: ProjectContext) -> List[str]:
        """Generate suggestions based on project context."""
        suggestions = []
        
        try:
            if project_context.progress < 25:
                suggestions.append("Focus on completing your initial setup and planning phase")
            elif project_context.progress < 50:
                suggestions.append("You're making good progress - keep momentum on your current tasks")
            elif project_context.progress < 75:
                suggestions.append("You're in the home stretch - focus on testing and refinement")
            else:
                suggestions.append("Great progress! Consider documentation and sharing your results")
            
            # Project-type specific suggestions
            if "robot" in project_context.title.lower() or "robot" in project_context.description.lower():
                suggestions.append("Test individual components before integrating the full system")
            elif "iot" in project_context.title.lower() or "sensor" in project_context.description.lower():
                suggestions.append("Ensure reliable data collection before adding complex features")
            elif "app" in project_context.title.lower() or "software" in project_context.description.lower():
                suggestions.append("Start with core functionality before adding advanced features")
            
        except Exception as e:
            self.logger.error(f"Error generating context-based suggestions: {e}")
        
        return suggestions
    
    def _generate_fallback_response(self, user_message: str, project_context: Optional[ProjectContext]) -> Dict[str, Any]:
        """
        Generate a fallback response when AI service is unavailable.
        
        Args:
            user_message: User's message
            project_context: Project context if available
            
        Returns:
            Dictionary with fallback response
        """
        message_lower = user_message.lower()
        
        # Default response
        response = "I'm here to help with your STEM project. Could you provide more details about what you need?"
        suggestions = [
            "Break down your project into smaller steps",
            "Research similar projects for inspiration",
            "Consider what materials and tools you'll need"
        ]
        next_steps = [
            "Define your project goals clearly",
            "Create a list of required components",
            "Start with a simple prototype"
        ]
        
        # Context-specific responses
        if any(word in message_lower for word in ["help", "stuck", "problem", "issue"]):
            response = "I understand you're facing a challenge. Let's work through this step by step."
            suggestions = [
                "Identify the specific problem you're encountering",
                "Check if all components are properly connected",
                "Review the project steps you've completed so far"
            ]
        
        if any(word in message_lower for word in ["start", "begin", "first"]):
            response = "Great! Let's get started with your project. The first step is to understand your goals."
            next_steps = [
                "Define what you want to achieve",
                "List the materials you'll need",
                "Create a timeline for your project"
            ]
        
        # Add project-specific context
        if project_context:
            context_suggestions = self._generate_context_based_suggestions(project_context)
            suggestions.extend(context_suggestions[:2])
        
        return {
            "response": response,
            "suggestions": suggestions[:5],
            "next_steps": next_steps[:5],
            "confidence": 0.5
        }
    
    # ========== Helper Methods ==========
    
    def _convert_frontend_project_context(self, project_data: Dict[str, Any], project_id: str) -> ProjectContext:
        """Convert frontend project data to ProjectContext."""
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
        
        return ProjectContext(
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
    
    def _convert_conversation_history(self, history: Optional[List[Dict]], session_id: str) -> List[ChatMessage]:
        """Convert conversation history from frontend format."""
        conversation_history = []
        
        if history:
            for msg in history:
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
                    self.logger.warning(f"Failed to parse conversation history message: {e}")
                    continue
            
            self.logger.info(f"Loaded {len(conversation_history)} messages from conversation history")
        
        return conversation_history
    
    async def analyzeQueryAmbiguity(
        self, 
        user_message: str, 
        project_context: Optional[ProjectContext], 
        conversation_history: List[ChatMessage]
    ) -> AmbiguityAnalysis:
        """
        Analyze user query for ambiguity and determine if clarification is needed.
        
        Args:
            user_message: The user's message to analyze
            project_context: Current project context
            conversation_history: Recent conversation messages
            
        Returns:
            Analysis result indicating ambiguity level and suggested clarifications
        """
        try:
            message_lower = user_message.lower().strip()
            
            ambiguity_score = 0.0
            ambiguous_aspects = []
            missing_context = []
            follow_up_questions = []
            
            # Check for vague language
            vague_patterns = [
                "help me", "what should i do", "how do i", "i need help", "stuck", "confused",
                "not sure", "don't know", "what next", "any ideas", "suggestions"
            ]
            
            vague_count = sum(1 for pattern in vague_patterns if pattern in message_lower)
            
            if vague_count > 0:
                ambiguity_score += min(vague_count * 0.25, 0.5)
                ambiguous_aspects.append("Contains vague language")
            
            # Check for short queries
            word_count = len(message_lower.split())
            if word_count < 4:
                ambiguity_score += 0.4
                ambiguous_aspects.append("Very short query")
                missing_context.append("More specific details about what you need help with")
            elif word_count < 8:
                ambiguity_score += 0.2
                ambiguous_aspects.append("Short query")
                missing_context.append("More details about your specific question")
            
            # Determine if clarification is needed
            clarification_needed = ambiguity_score > 0.6
            is_ambiguous = ambiguity_score > 0.3
            
            # Generate follow-up questions if ambiguous
            if is_ambiguous:
                if "help" in message_lower or "stuck" in message_lower:
                    follow_up_questions.append("What specific part of your project are you working on?")
                    follow_up_questions.append("What have you tried so far?")
                
                if word_count < 5:
                    follow_up_questions.append("Could you provide more details about your question?")
            
            return AmbiguityAnalysis(
                is_ambiguous=is_ambiguous,
                ambiguity_score=ambiguity_score,
                ambiguous_aspects=ambiguous_aspects,
                missing_context=missing_context,
                follow_up_questions=follow_up_questions,
                clarification_needed=clarification_needed
            )
            
        except Exception as e:
            self.logger.error(f"Error analyzing query ambiguity: {e}")
            return AmbiguityAnalysis(
                is_ambiguous=False,
                ambiguity_score=0.0,
                ambiguous_aspects=[],
                missing_context=[],
                follow_up_questions=[],
                clarification_needed=False
            )
    
    async def generateClarificationRequest(
        self,
        user_message: str,
        ambiguity_analysis: AmbiguityAnalysis,
        project_context: Optional[ProjectContext]
    ) -> ClarificationRequest:
        """
        Generate a clarification request for ambiguous queries.
        
        Args:
            user_message: The user's original message
            ambiguity_analysis: Analysis of the query's ambiguity
            project_context: Current project context
            
        Returns:
            Clarification request with prompt and suggested questions
        """
        try:
            clarification_prompt = "I'd like to help you better. "
            
            if ambiguity_analysis.missing_context:
                clarification_prompt += "Could you provide more details about: "
                clarification_prompt += ", ".join(ambiguity_analysis.missing_context[:2])
                clarification_prompt += "?"
            else:
                clarification_prompt += "Could you clarify what specific aspect you need help with?"
            
            return ClarificationRequest(
                original_query=user_message,
                clarification_prompt=clarification_prompt,
                suggested_questions=ambiguity_analysis.follow_up_questions[:3],
                ambiguity_score=ambiguity_analysis.ambiguity_score
            )
            
        except Exception as e:
            self.logger.error(f"Error generating clarification request: {e}")
            return ClarificationRequest(
                original_query=user_message,
                clarification_prompt="Could you provide more details about your question?",
                suggested_questions=["What specific part are you working on?"],
                ambiguity_score=ambiguity_analysis.ambiguity_score
            )
    
    # ========== Health Check ==========
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Service-specific health check.
        
        Returns:
            Dict with health status information
        """
        base_health = await self.base_health_check()
        
        # Add AI service specific checks
        base_health["openrouter_client"] = {
            "configured": self.openrouter_client is not None
        }
        
        base_health["project_context_service"] = {
            "initialized": self.project_context_service is not None
        }
        
        return base_health
