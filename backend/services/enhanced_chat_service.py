# Enhanced Chat Service with Code Generation Support
# Requirements: 4.1
# Task: 2.5 Enhance existing chat service to handle code generation requests

import logging
import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

from services.chat_service import ChatService
from services.code_generation_service import (
    VeronicaAIService, GenerationParams, Platform, ComplexityLevel
)
from services.project_context_service import ProjectContextService
from models.ai_guidance import ChatMessage, MessageSender

logger = logging.getLogger(__name__)


class CodeGenerationIntent:
    """Represents a detected code generation intent from chat"""
    def __init__(
        self,
        intent_type: str,
        platform: Optional[Platform] = None,
        complexity_level: Optional[ComplexityLevel] = None,
        custom_requirements: Optional[str] = None,
        confidence: float = 0.0
    ):
        self.intent_type = intent_type  # generate, modify, explain, download
        self.platform = platform
        self.complexity_level = complexity_level
        self.custom_requirements = custom_requirements
        self.confidence = confidence


class EnhancedChatService(ChatService):
    """
    Enhanced chat service that can detect and handle code generation requests
    Extends the base ChatService with code generation capabilities
    """
    
    def __init__(self):
        super().__init__()
        self.code_generation_service = VeronicaAIService()
        self.project_context_service = ProjectContextService()
        
        # Code generation intent patterns
        self.generation_patterns = [
            # Direct generation requests
            (r"generate\s+(?:code|program|script)\s+for", "generate", 0.9),
            (r"create\s+(?:code|program|application)\s+for", "generate", 0.9),
            (r"build\s+(?:a|an)?\s*(?:program|app|application)", "generate", 0.8),
            (r"write\s+(?:code|program|script)\s+(?:for|to)", "generate", 0.8),
            (r"develop\s+(?:a|an)?\s*(?:program|application)", "generate", 0.7),
            
            # Platform-specific requests
            (r"(?:arduino|microcontroller)\s+code", "generate", 0.8),
            (r"raspberry\s+pi\s+(?:code|program|script)", "generate", 0.8),
            (r"web\s+(?:app|application|site)", "generate", 0.8),
            (r"mobile\s+(?:app|application)", "generate", 0.8),
            
            # Modification requests
            (r"modify\s+(?:the\s+)?code", "modify", 0.8),
            (r"change\s+(?:the\s+)?(?:code|program)", "modify", 0.7),
            (r"update\s+(?:the\s+)?(?:code|program)", "modify", 0.7),
            (r"edit\s+(?:the\s+)?(?:code|file)", "modify", 0.7),
            
            # Explanation requests
            (r"explain\s+(?:the\s+)?code", "explain", 0.8),
            (r"how\s+does\s+(?:this|the)\s+code\s+work", "explain", 0.8),
            (r"what\s+does\s+(?:this|the)\s+code\s+do", "explain", 0.7),
            
            # Download requests
            (r"download\s+(?:the\s+)?(?:code|files)", "download", 0.9),
            (r"get\s+(?:the\s+)?(?:code|files)", "download", 0.7),
            (r"export\s+(?:the\s+)?(?:code|project)", "download", 0.8),
        ]
        
        # Platform detection patterns
        self.platform_patterns = [
            (r"arduino|microcontroller|iot|sensor", Platform.ARDUINO),
            (r"raspberry\s+pi|linux|gpio|python", Platform.RASPBERRY_PI),
            (r"web|website|html|css|javascript|browser", Platform.WEB),
            (r"mobile|app|android|ios|flutter|react\s+native", Platform.MOBILE),
        ]
        
        # Complexity detection patterns
        self.complexity_patterns = [
            (r"simple|basic|easy|beginner|starter", ComplexityLevel.BEGINNER),
            (r"intermediate|medium|moderate", ComplexityLevel.INTERMEDIATE),
            (r"advanced|complex|sophisticated|professional", ComplexityLevel.ADVANCED),
        ]
    
    async def process_message_with_code_generation(
        self,
        session_id: str,
        user_message: str,
        user_id: str,
        project_id: str
    ) -> Dict[str, Any]:
        """
        Process a chat message and detect code generation intents
        
        Args:
            session_id: ID of the chat session
            user_message: User's message content
            user_id: ID of the user
            project_id: ID of the project
            
        Returns:
            Dictionary with processing results and any code generation actions
        """
        try:
            # Save the user message
            await self.saveMessage(session_id, user_message, MessageSender.USER)
            
            # Detect code generation intent
            intent = self._detect_code_generation_intent(user_message)
            
            response_data = {
                "message_saved": True,
                "intent_detected": intent.intent_type if intent else None,
                "confidence": intent.confidence if intent else 0.0,
                "response": None,
                "code_generation_started": False,
                "generation_id": None
            }
            
            if intent and intent.confidence > 0.6:
                # Handle code generation intent
                if intent.intent_type == "generate":
                    response_data.update(await self._handle_generation_request(
                        session_id, user_id, project_id, intent, user_message
                    ))
                elif intent.intent_type == "modify":
                    response_data.update(await self._handle_modification_request(
                        session_id, user_id, project_id, intent, user_message
                    ))
                elif intent.intent_type == "explain":
                    response_data.update(await self._handle_explanation_request(
                        session_id, user_id, project_id, intent, user_message
                    ))
                elif intent.intent_type == "download":
                    response_data.update(await self._handle_download_request(
                        session_id, user_id, project_id, intent, user_message
                    ))
            else:
                # Handle as regular chat message
                response_data.update(await self._handle_regular_chat(
                    session_id, user_id, project_id, user_message
                ))
            
            return response_data
            
        except Exception as e:
            logger.error(f"Error processing message with code generation: {e}")
            return {
                "error": str(e),
                "message_saved": False,
                "intent_detected": None
            }
    
    def _detect_code_generation_intent(self, message: str) -> Optional[CodeGenerationIntent]:
        """
        Detect code generation intent from user message
        
        Args:
            message: User's message content
            
        Returns:
            CodeGenerationIntent object or None if no intent detected
        """
        try:
            message_lower = message.lower().strip()
            
            # Check for generation patterns
            best_intent = None
            best_confidence = 0.0
            
            for pattern, intent_type, confidence in self.generation_patterns:
                if re.search(pattern, message_lower):
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_intent = intent_type
            
            if not best_intent:
                return None
            
            # Detect platform
            detected_platform = None
            for pattern, platform in self.platform_patterns:
                if re.search(pattern, message_lower):
                    detected_platform = platform
                    break
            
            # Detect complexity level
            detected_complexity = ComplexityLevel.INTERMEDIATE  # Default
            for pattern, complexity in self.complexity_patterns:
                if re.search(pattern, message_lower):
                    detected_complexity = complexity
                    break
            
            # Extract custom requirements (everything after "to" or "for")
            custom_requirements = None
            for keyword in ["to", "for", "that"]:
                if f" {keyword} " in message_lower:
                    parts = message_lower.split(f" {keyword} ", 1)
                    if len(parts) > 1:
                        custom_requirements = parts[1].strip()
                        break
            
            return CodeGenerationIntent(
                intent_type=best_intent,
                platform=detected_platform,
                complexity_level=detected_complexity,
                custom_requirements=custom_requirements,
                confidence=best_confidence
            )
            
        except Exception as e:
            logger.error(f"Error detecting code generation intent: {e}")
            return None
    
    async def _handle_generation_request(
        self,
        session_id: str,
        user_id: str,
        project_id: str,
        intent: CodeGenerationIntent,
        original_message: str
    ) -> Dict[str, Any]:
        """
        Handle code generation request
        
        Args:
            session_id: Chat session ID
            user_id: User ID
            project_id: Project ID
            intent: Detected code generation intent
            original_message: Original user message
            
        Returns:
            Dictionary with generation results
        """
        try:
            # Get project context
            project_context = await self.project_context_service.getProjectContext(project_id)
            
            if not project_context:
                response = "I couldn't find the project details. Please make sure the project exists and try again."
                await self.saveMessage(session_id, response, MessageSender.AI)
                return {
                    "response": response,
                    "code_generation_started": False
                }
            
            # Determine platform if not detected
            platform = intent.platform
            if not platform:
                # Try to infer from project context or ask user
                platform = self._infer_platform_from_project(project_context)
                if not platform:
                    response = ("I'd be happy to generate code for your project! "
                              "Which platform would you like me to target? "
                              "(Arduino, Raspberry Pi, Web, or Mobile)")
                    await self.saveMessage(session_id, response, MessageSender.AI)
                    return {
                        "response": response,
                        "code_generation_started": False,
                        "needs_platform_selection": True
                    }
            
            # Create generation parameters
            params = GenerationParams(
                platform=platform,
                complexity_level=intent.complexity_level,
                include_comments=True,
                include_tests=False,
                custom_requirements=intent.custom_requirements or original_message
            )
            
            # Start code generation
            generation_id = await self.code_generation_service._create_generation_record(
                project_id, user_id, params
            )
            
            response = (f"Great! I'm starting to generate {platform.value} code for your project. "
                       f"You can connect to the WebSocket stream to see real-time progress, "
                       f"or check back in a few minutes. Generation ID: {generation_id}")
            
            await self.saveMessage(session_id, response, MessageSender.AI)
            
            return {
                "response": response,
                "code_generation_started": True,
                "generation_id": generation_id,
                "platform": platform.value,
                "complexity_level": intent.complexity_level.value
            }
            
        except Exception as e:
            logger.error(f"Error handling generation request: {e}")
            error_response = f"I encountered an error while starting code generation: {str(e)}"
            await self.saveMessage(session_id, error_response, MessageSender.AI)
            return {
                "response": error_response,
                "code_generation_started": False,
                "error": str(e)
            }
    
    async def _handle_modification_request(
        self,
        session_id: str,
        user_id: str,
        project_id: str,
        intent: CodeGenerationIntent,
        original_message: str
    ) -> Dict[str, Any]:
        """
        Handle code modification request
        
        Args:
            session_id: Chat session ID
            user_id: User ID
            project_id: Project ID
            intent: Detected modification intent
            original_message: Original user message
            
        Returns:
            Dictionary with modification results
        """
        try:
            # TODO: Implement code modification logic
            # For now, provide guidance on how to modify code
            
            response = ("I can help you modify your generated code! "
                       "You can edit files directly through the file management interface, "
                       "or tell me specifically what changes you'd like to make and I can "
                       "provide guidance or generate updated code sections.")
            
            await self.saveMessage(session_id, response, MessageSender.AI)
            
            return {
                "response": response,
                "modification_guidance": True
            }
            
        except Exception as e:
            logger.error(f"Error handling modification request: {e}")
            error_response = f"I encountered an error while processing your modification request: {str(e)}"
            await self.saveMessage(session_id, error_response, MessageSender.AI)
            return {
                "response": error_response,
                "error": str(e)
            }
    
    async def _handle_explanation_request(
        self,
        session_id: str,
        user_id: str,
        project_id: str,
        intent: CodeGenerationIntent,
        original_message: str
    ) -> Dict[str, Any]:
        """
        Handle code explanation request
        
        Args:
            session_id: Chat session ID
            user_id: User ID
            project_id: Project ID
            intent: Detected explanation intent
            original_message: Original user message
            
        Returns:
            Dictionary with explanation results
        """
        try:
            # TODO: Implement code explanation logic
            # For now, provide general guidance
            
            response = ("I'd be happy to explain the generated code! "
                       "The code includes detailed comments explaining each section. "
                       "If you have questions about specific parts, please share the "
                       "code snippet and I'll provide a detailed explanation.")
            
            await self.saveMessage(session_id, response, MessageSender.AI)
            
            return {
                "response": response,
                "explanation_offered": True
            }
            
        except Exception as e:
            logger.error(f"Error handling explanation request: {e}")
            error_response = f"I encountered an error while processing your explanation request: {str(e)}"
            await self.saveMessage(session_id, error_response, MessageSender.AI)
            return {
                "response": error_response,
                "error": str(e)
            }
    
    async def _handle_download_request(
        self,
        session_id: str,
        user_id: str,
        project_id: str,
        intent: CodeGenerationIntent,
        original_message: str
    ) -> Dict[str, Any]:
        """
        Handle code download request
        
        Args:
            session_id: Chat session ID
            user_id: User ID
            project_id: Project ID
            intent: Detected download intent
            original_message: Original user message
            
        Returns:
            Dictionary with download results
        """
        try:
            # TODO: Get available generations for the project
            # For now, provide guidance on downloading
            
            response = ("You can download your generated code files individually or as a ZIP archive "
                       "from the project's code generation section. If you have a specific generation ID, "
                       "I can provide direct download links.")
            
            await self.saveMessage(session_id, response, MessageSender.AI)
            
            return {
                "response": response,
                "download_guidance": True
            }
            
        except Exception as e:
            logger.error(f"Error handling download request: {e}")
            error_response = f"I encountered an error while processing your download request: {str(e)}"
            await self.saveMessage(session_id, error_response, MessageSender.AI)
            return {
                "response": error_response,
                "error": str(e)
            }
    
    async def _handle_regular_chat(
        self,
        session_id: str,
        user_id: str,
        project_id: str,
        user_message: str
    ) -> Dict[str, Any]:
        """
        Handle regular chat message (non-code generation)
        
        Args:
            session_id: Chat session ID
            user_id: User ID
            project_id: Project ID
            user_message: User's message
            
        Returns:
            Dictionary with chat results
        """
        try:
            # TODO: Integrate with existing AI guidance service
            # For now, provide a simple response
            
            response = ("I'm here to help with your project! I can generate code, explain existing code, "
                       "help with modifications, and answer questions about your STEM project. "
                       "What would you like to work on?")
            
            await self.saveMessage(session_id, response, MessageSender.AI)
            
            return {
                "response": response,
                "regular_chat": True
            }
            
        except Exception as e:
            logger.error(f"Error handling regular chat: {e}")
            error_response = f"I encountered an error while processing your message: {str(e)}"
            await self.saveMessage(session_id, error_response, MessageSender.AI)
            return {
                "response": error_response,
                "error": str(e)
            }
    
    def _infer_platform_from_project(self, project_context) -> Optional[Platform]:
        """
        Try to infer the target platform from project context
        
        Args:
            project_context: Project context object
            
        Returns:
            Inferred platform or None
        """
        try:
            if not project_context:
                return None
            
            # Check project description and title for platform hints
            text_to_check = f"{project_context.title} {project_context.description}".lower()
            
            for pattern, platform in self.platform_patterns:
                if re.search(pattern, text_to_check):
                    return platform
            
            # Check components if available
            if hasattr(project_context, 'components') and project_context.components:
                components_text = " ".join(project_context.components).lower()
                for pattern, platform in self.platform_patterns:
                    if re.search(pattern, components_text):
                        return platform
            
            return None
            
        except Exception as e:
            logger.error(f"Error inferring platform from project: {e}")
            return None
    
    async def get_code_generation_context(
        self,
        session_id: str,
        project_id: str
    ) -> Dict[str, Any]:
        """
        Get context about code generations for this project/session
        
        Args:
            session_id: Chat session ID
            project_id: Project ID
            
        Returns:
            Dictionary with code generation context
        """
        try:
            # TODO: Implement method to get project's code generations
            # For now, return empty context
            
            return {
                "has_generated_code": False,
                "recent_generations": [],
                "available_platforms": [p.value for p in Platform],
                "complexity_levels": [c.value for c in ComplexityLevel]
            }
            
        except Exception as e:
            logger.error(f"Error getting code generation context: {e}")
            return {"error": str(e)}
    
    async def suggest_code_generation_actions(
        self,
        project_id: str,
        user_message: str
    ) -> List[Dict[str, Any]]:
        """
        Suggest possible code generation actions based on user message and project
        
        Args:
            project_id: Project ID
            user_message: User's message
            
        Returns:
            List of suggested actions
        """
        try:
            suggestions = []
            
            # Detect intent to provide relevant suggestions
            intent = self._detect_code_generation_intent(user_message)
            
            if intent:
                if intent.intent_type == "generate":
                    suggestions.append({
                        "action": "generate_code",
                        "title": "Generate Code",
                        "description": f"Generate {intent.platform.value if intent.platform else 'code'} for your project",
                        "confidence": intent.confidence
                    })
                
                if intent.platform:
                    suggestions.append({
                        "action": "view_examples",
                        "title": f"View {intent.platform.value.title()} Examples",
                        "description": f"See example {intent.platform.value} projects",
                        "platform": intent.platform.value
                    })
            
            # Always suggest general actions
            suggestions.extend([
                {
                    "action": "explain_project",
                    "title": "Explain Project Requirements",
                    "description": "Get help understanding what code to generate"
                },
                {
                    "action": "choose_platform",
                    "title": "Choose Platform",
                    "description": "Select the best platform for your project"
                }
            ])
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error suggesting code generation actions: {e}")
            return []