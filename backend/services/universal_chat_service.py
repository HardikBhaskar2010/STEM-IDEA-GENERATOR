"""
Universal Chat Service
Handles saving and retrieving universal voice chat conversations
Enhanced with code generation capabilities
"""

import logging
import uuid
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from database.connection import get_db_client

logger = logging.getLogger(__name__)

class UniversalChatService:
    """Service for managing universal chat conversations with code generation support"""
    
    def __init__(self):
        self.db = None  # Will be initialized async
        
        # Code generation command patterns
        self.code_generation_patterns = [
            r'generate\s+code\s+for\s+(.+)',
            r'create\s+(.+)\s+code',
            r'build\s+(.+)\s+application',
            r'write\s+code\s+to\s+(.+)',
            r'make\s+(.+)\s+project',
            r'develop\s+(.+)\s+app',
            r'code\s+(.+)\s+for\s+me',
            r'implement\s+(.+)',
            r'program\s+(.+)',
            r'script\s+(.+)'
        ]
        
        # Platform detection patterns
        self.platform_patterns = {
            'arduino': [r'arduino', r'microcontroller', r'sensor', r'iot', r'embedded'],
            'raspberry_pi': [r'raspberry\s*pi', r'rpi', r'gpio', r'linux', r'python'],
            'web': [r'web', r'website', r'html', r'javascript', r'browser', r'frontend'],
            'mobile': [r'mobile', r'app', r'android', r'ios', r'flutter', r'react\s*native']
        }
        
        # Complexity detection patterns
        self.complexity_patterns = {
            'beginner': [r'simple', r'basic', r'beginner', r'easy', r'starter'],
            'advanced': [r'advanced', r'complex', r'sophisticated', r'enterprise', r'professional'],
            'intermediate': []  # Default fallback
        }
    
    async def analyze_message_for_code_generation(self, message: str) -> Dict[str, Any]:
        """
        Analyze a message to detect code generation requests
        
        Args:
            message: User message to analyze
            
        Returns:
            Dict with analysis results
        """
        try:
            message_lower = message.lower().strip()
            
            analysis = {
                'is_code_generation_request': False,
                'confidence': 0.0,
                'detected_platform': None,
                'detected_complexity': 'intermediate',
                'project_description': None,
                'suggested_parameters': {}
            }
            
            # Check for code generation patterns
            for pattern in self.code_generation_patterns:
                match = re.search(pattern, message_lower)
                if match:
                    analysis['is_code_generation_request'] = True
                    analysis['confidence'] += 0.3
                    if match.groups():
                        analysis['project_description'] = match.group(1).strip()
                    break
            
            # Check for platform indicators
            for platform, patterns in self.platform_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, message_lower):
                        analysis['detected_platform'] = platform
                        analysis['confidence'] += 0.2
                        break
                if analysis['detected_platform']:
                    break
            
            # Check for complexity indicators
            for complexity, patterns in self.complexity_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, message_lower):
                        analysis['detected_complexity'] = complexity
                        analysis['confidence'] += 0.1
                        break
                if analysis['detected_complexity'] != 'intermediate':
                    break
            
            # Additional context clues
            if any(word in message_lower for word in ['project', 'application', 'program', 'software']):
                analysis['confidence'] += 0.1
            
            # Set default platform if none detected but code generation is requested
            if analysis['is_code_generation_request'] and not analysis['detected_platform']:
                analysis['detected_platform'] = 'web'  # Default to web
            
            # Build suggested parameters
            if analysis['is_code_generation_request']:
                analysis['suggested_parameters'] = {
                    'platform': analysis['detected_platform'],
                    'complexity_level': analysis['detected_complexity'],
                    'include_comments': True,
                    'include_tests': False,
                    'custom_requirements': analysis['project_description']
                }
            
            # Normalize confidence score
            analysis['confidence'] = min(analysis['confidence'], 1.0)
            
            logger.info(f"Code generation analysis: {analysis['is_code_generation_request']} "
                       f"(confidence: {analysis['confidence']:.2f})")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing message for code generation: {e}")
            return {
                'is_code_generation_request': False,
                'confidence': 0.0,
                'detected_platform': None,
                'detected_complexity': 'intermediate',
                'project_description': None,
                'suggested_parameters': {}
            }
    
    async def handle_code_generation_request(
        self,
        user_id: str,
        session_id: str,
        message: str,
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle a code generation request from chat
        
        Args:
            user_id: User's UUID
            session_id: Chat session ID
            message: User message requesting code generation
            project_id: Optional project ID if context is available
            
        Returns:
            Dict with code generation response
        """
        try:
            # Analyze the message
            analysis = await self.analyze_message_for_code_generation(message)
            
            if not analysis['is_code_generation_request']:
                return {
                    'action_type': 'clarification_needed',
                    'message': "I'd be happy to help you generate code! Could you please specify what type of project you'd like me to create?",
                    'suggestions': [
                        "Generate Arduino code for a sensor project",
                        "Create a web application",
                        "Build a Raspberry Pi project",
                        "Develop a mobile app"
                    ]
                }
            
            # If no project context, suggest creating a project first
            if not project_id:
                return {
                    'action_type': 'project_creation_needed',
                    'message': f"I can help you generate {analysis['detected_platform']} code! First, let's create a project for your idea.",
                    'suggested_parameters': analysis['suggested_parameters'],
                    'next_steps': [
                        "Create a new project with your requirements",
                        "Generate code for the project",
                        "Download and use the generated files"
                    ]
                }
            
            # If we have a project, suggest code generation
            return {
                'action_type': 'code_generation_ready',
                'message': f"I'll generate {analysis['detected_platform']} code for your project. This will include all necessary files and setup instructions.",
                'suggested_parameters': analysis['suggested_parameters'],
                'project_id': project_id,
                'generation_url': f"/api/projects/{project_id}/generate-code"
            }
            
        except Exception as e:
            logger.error(f"Error handling code generation request: {e}")
            return {
                'action_type': 'error',
                'message': "I encountered an error while processing your code generation request. Please try again.",
                'error': str(e)
            }
    
    async def get_code_generation_context(
        self,
        user_id: str,
        session_id: str
    ) -> Dict[str, Any]:
        """
        Get code generation context from recent conversation
        
        Args:
            user_id: User's UUID
            session_id: Chat session ID
            
        Returns:
            Dict with code generation context
        """
        try:
            # Get recent messages
            recent_messages = await self.get_session_messages(user_id, session_id, limit=10)
            
            context = {
                'has_code_requests': False,
                'recent_platforms': [],
                'recent_projects': [],
                'suggested_next_action': None
            }
            
            # Analyze recent messages for code generation patterns
            for message in reversed(recent_messages):  # Most recent first
                if message['role'] == 'user':
                    analysis = await self.analyze_message_for_code_generation(message['content'])
                    
                    if analysis['is_code_generation_request']:
                        context['has_code_requests'] = True
                        
                        if analysis['detected_platform'] and analysis['detected_platform'] not in context['recent_platforms']:
                            context['recent_platforms'].append(analysis['detected_platform'])
                        
                        if analysis['project_description'] and analysis['project_description'] not in context['recent_projects']:
                            context['recent_projects'].append(analysis['project_description'])
                
                # Check for code generation actions in assistant messages
                elif message['role'] == 'assistant' and message.get('action_type') == 'code_generation_ready':
                    context['has_code_requests'] = True
            
            # Suggest next action based on context
            if context['has_code_requests']:
                if context['recent_platforms']:
                    context['suggested_next_action'] = f"Continue with {context['recent_platforms'][0]} development"
                else:
                    context['suggested_next_action'] = "Specify platform for code generation"
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting code generation context: {e}")
            return {
                'has_code_requests': False,
                'recent_platforms': [],
                'recent_projects': [],
                'suggested_next_action': None
            }

    async def save_message(
        self,
        user_id: str,
        session_id: str,
        role: str,
        content: str,
        message_type: str = 'text',
        voice_transcript: Optional[str] = None,
        voice_duration: Optional[float] = None,
        voice_confidence: Optional[float] = None,
        action_type: Optional[str] = None,
        action_parameters: Optional[Dict[str, Any]] = None,
        response_metadata: Optional[Dict[str, Any]] = None,
        conversation_context: Optional[Dict[str, Any]] = None,
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Save a chat message to the database with automatic code generation detection
        
        Args:
            user_id: User's UUID
            session_id: Chat session ID
            role: 'user' or 'assistant'
            content: Message content
            message_type: Type of message (text, voice, action, etc.)
            voice_transcript: Original voice transcript
            voice_duration: Voice message duration in seconds
            voice_confidence: Speech recognition confidence (0.0-1.0)
            action_type: Type of action (navigate, project_created, code_generation, etc.)
            action_parameters: Action-specific parameters
            response_metadata: AI response metadata
            conversation_context: Context for conversation continuity
            project_id: Optional project ID for context
            
        Returns:
            Dict with saved message data and any detected actions
        """
        try:
            # Analyze user messages for code generation requests
            detected_action = None
            enhanced_action_parameters = action_parameters or {}
            
            if role == 'user' and message_type == 'text':
                # Check for code generation request
                analysis = await self.analyze_message_for_code_generation(content)
                
                if analysis['is_code_generation_request']:
                    # Handle the code generation request
                    code_gen_response = await self.handle_code_generation_request(
                        user_id, session_id, content, project_id
                    )
                    
                    # Update action parameters with code generation info
                    detected_action = code_gen_response.get('action_type')
                    enhanced_action_parameters.update({
                        'code_generation_analysis': analysis,
                        'code_generation_response': code_gen_response
                    })
                    
                    # Update conversation context
                    if not conversation_context:
                        conversation_context = {}
                    conversation_context.update({
                        'last_code_request': {
                            'platform': analysis['detected_platform'],
                            'complexity': analysis['detected_complexity'],
                            'description': analysis['project_description'],
                            'timestamp': datetime.now().isoformat()
                        }
                    })
            
            # Get database client
            client = await get_db_client()
            
            # Insert message with enhanced data
            result = client.table('universal_chat_messages').insert({
                'user_id': user_id,
                'session_id': session_id,
                'role': role,
                'content': content,
                'message_type': message_type,
                'voice_transcript': voice_transcript,
                'voice_duration': voice_duration,
                'voice_confidence': voice_confidence,
                'action_type': detected_action or action_type,
                'action_parameters': enhanced_action_parameters,
                'response_metadata': response_metadata or {},
                'conversation_context': conversation_context or {}
            }).execute()
            
            if result.data and len(result.data) > 0:
                message_data = result.data[0]
                logger.info(f"Saved chat message: {message_data['id']} for user {user_id}")
                
                response = {
                    'id': str(message_data['id']),
                    'user_id': user_id,
                    'session_id': session_id,
                    'role': role,
                    'content': content,
                    'message_type': message_type,
                    'created_at': message_data['created_at'],
                    'action_type': detected_action or action_type,
                    'action_parameters': enhanced_action_parameters
                }
                
                # Include code generation response if detected
                if detected_action and 'code_generation_response' in enhanced_action_parameters:
                    response['code_generation_response'] = enhanced_action_parameters['code_generation_response']
                
                return response
            else:
                raise Exception("No data returned from insert")
            
        except Exception as e:
            logger.error(f"Error saving chat message: {e}")
            raise Exception(f"Failed to save chat message: {str(e)}")
    
    async def get_session_messages(
        self,
        user_id: str,
        session_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get messages for a specific chat session
        
        Args:
            user_id: User's UUID
            session_id: Chat session ID
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            
        Returns:
            List of message dictionaries
        """
        try:
            # Get database client
            client = await get_db_client()
            
            # Query messages
            result = client.table('universal_chat_messages')\
                .select('*')\
                .eq('user_id', user_id)\
                .eq('session_id', session_id)\
                .order('created_at', desc=False)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            messages = []
            for row in result.data:
                messages.append({
                    'id': str(row['id']),
                    'user_id': str(row['user_id']),
                    'session_id': row['session_id'],
                    'role': row['role'],
                    'content': row['content'],
                    'message_type': row['message_type'],
                    'voice_transcript': row.get('voice_transcript'),
                    'voice_duration': float(row['voice_duration']) if row.get('voice_duration') else None,
                    'voice_confidence': float(row['voice_confidence']) if row.get('voice_confidence') else None,
                    'action_type': row.get('action_type'),
                    'action_parameters': row.get('action_parameters') or {},
                    'response_metadata': row.get('response_metadata') or {},
                    'conversation_context': row.get('conversation_context') or {},
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                })
            
            logger.info(f"Retrieved {len(messages)} messages for session {session_id}")
            return messages
            
        except Exception as e:
            logger.error(f"Error retrieving session messages: {e}")
            raise Exception(f"Failed to retrieve session messages: {str(e)}")
    
    async def get_user_sessions(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get chat sessions for a user
        
        Args:
            user_id: User's UUID
            limit: Maximum number of sessions to return
            offset: Number of sessions to skip
            
        Returns:
            List of session dictionaries
        """
        try:
            client = await get_db_client()
            
            result = client.table('universal_chat_sessions') \
                .select('id, session_id, user_id, title, message_count, last_message_at, session_metadata, is_active, created_at, updated_at') \
                .eq('user_id', user_id) \
                .eq('is_active', True) \
                .order('last_message_at', desc=True) \
                .range(offset, offset + limit - 1) \
                .execute()
            
            sessions = []
            for row in result.data:
                sessions.append({
                    'id': str(row['id']),
                    'session_id': row['session_id'],
                    'user_id': str(row['user_id']),
                    'title': row['title'],
                    'message_count': row['message_count'],
                    'last_message_at': row['last_message_at'],
                    'session_metadata': row.get('session_metadata') or {},
                    'is_active': row['is_active'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                })
            
            logger.info(f"Retrieved {len(sessions)} sessions for user {user_id}")
            return sessions
            
        except Exception as e:
            logger.error(f"Error retrieving user sessions: {e}")
            raise Exception(f"Failed to retrieve user sessions: {str(e)}")
    
    async def create_session(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new chat session
        
        Args:
            user_id: User's UUID
            session_id: Optional custom session ID
            title: Optional session title
            
        Returns:
            Dict with session data
        """
        try:
            if not session_id:
                session_id = f"session_{uuid.uuid4().hex[:12]}"
            
            if not title:
                title = "New Chat Session"
            
            client = await get_db_client()
            
            result = client.table('universal_chat_sessions').insert({
                'session_id': session_id, 
                'user_id': user_id, 
                'title': title, 
                'message_count': 0, 
                'is_active': True
            }).execute()
            
            if result.data and len(result.data) > 0:
                row = result.data[0]
                logger.info(f"Created new chat session: {session_id} for user {user_id}")
                
                return {
                    'id': str(row['id']),
                    'session_id': session_id,
                    'user_id': user_id,
                    'title': title,
                    'message_count': 0,
                    'is_active': True,
                    'created_at': row['created_at']
                }
            else:
                raise Exception("Failed to create session")
            
        except Exception as e:
            logger.error(f"Error creating chat session: {e}")
            raise Exception(f"Failed to create chat session: {str(e)}")
    
    async def update_session_title(
        self,
        session_id: str,
        title: str
    ) -> bool:
        """
        Update session title
        
        Args:
            session_id: Session ID to update
            title: New title
            
        Returns:
            True if successful
        """
        try:
            client = await get_db_client()
            client.table('universal_chat_sessions').update({
                'title': title,
                'updated_at': datetime.now().isoformat()
            }).eq('session_id', session_id).execute()
            
            logger.info(f"Updated session title: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating session title: {e}")
            return False
    
    async def delete_session(
        self,
        user_id: str,
        session_id: str
    ) -> bool:
        """
        Delete a chat session and all its messages
        
        Args:
            user_id: User's UUID
            session_id: Session ID to delete
            
        Returns:
            True if successful
        """
        try:
            client = await get_db_client()
            
            # Delete messages first (due to foreign key constraint)
            client.table('universal_chat_messages').delete().eq('user_id', user_id).eq('session_id', session_id).execute()
            
            # Delete session
            client.table('universal_chat_sessions').delete().eq('user_id', user_id).eq('session_id', session_id).execute()
            
            logger.info(f"Deleted chat session: {session_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting chat session: {e}")
            return False
    
    async def get_conversation_context(
        self,
        user_id: str,
        session_id: str,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Get recent conversation context for AI continuity
        
        Args:
            user_id: User's UUID
            session_id: Session ID
            limit: Number of recent messages to include
            
        Returns:
            Dict with conversation context
        """
        try:
            client = await get_db_client()
            result = client.table('universal_chat_messages') \
                .select('role, content, action_type, conversation_context, created_at') \
                .eq('user_id', user_id) \
                .eq('session_id', session_id) \
                .order('created_at', desc=True) \
                .limit(limit) \
                .execute()
            
            context = {
                'session_id': session_id,
                'recent_messages': [],
                'last_action': None,
                'conversation_state': {}
            }
            
            for row in reversed(result.data):  # Reverse to get chronological order
                context['recent_messages'].append({
                    'role': row['role'],
                    'content': row['content'],
                    'timestamp': row['created_at']
                })
                
                if row.get('action_type'):
                    context['last_action'] = row['action_type']
                
                # Merge conversation context from latest message
                if row.get('conversation_context'):
                    context['conversation_state'].update(row['conversation_context'])
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting conversation context: {e}")
            return {
                'session_id': session_id,
                'recent_messages': [],
                'last_action': None,
                'conversation_state': {}
            }

# Create singleton instance
universal_chat_service = UniversalChatService()