"""
Universal Chat Service
Handles saving and retrieving universal voice chat conversations
"""

import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from database.connection import get_db_client

logger = logging.getLogger(__name__)

class UniversalChatService:
    """Service for managing universal chat conversations"""
    
    def __init__(self):
        self.db = None  # Will be initialized async
    
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
        conversation_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Save a chat message to the database
        
        Args:
            user_id: User's UUID
            session_id: Chat session ID
            role: 'user' or 'assistant'
            content: Message content
            message_type: Type of message (text, voice, action, etc.)
            voice_transcript: Original voice transcript
            voice_duration: Voice message duration in seconds
            voice_confidence: Speech recognition confidence (0.0-1.0)
            action_type: Type of action (navigate, project_created, etc.)
            action_parameters: Action-specific parameters
            response_metadata: AI response metadata
            conversation_context: Context for conversation continuity
            
        Returns:
            Dict with saved message data
        """
        try:
            # Get database client
            client = await get_db_client()
            
            # Insert message
            result = client.table('universal_chat_messages').insert({
                'user_id': user_id,
                'session_id': session_id,
                'role': role,
                'content': content,
                'message_type': message_type,
                'voice_transcript': voice_transcript,
                'voice_duration': voice_duration,
                'voice_confidence': voice_confidence,
                'action_type': action_type,
                'action_parameters': action_parameters or {},
                'response_metadata': response_metadata or {},
                'conversation_context': conversation_context or {}
            }).execute()
            
            if result.data and len(result.data) > 0:
                message_data = result.data[0]
                logger.info(f"Saved chat message: {message_data['id']} for user {user_id}")
                
                return {
                    'id': str(message_data['id']),
                    'user_id': user_id,
                    'session_id': session_id,
                    'role': role,
                    'content': content,
                    'message_type': message_type,
                    'created_at': message_data['created_at'],
                    'action_type': action_type,
                    'action_parameters': action_parameters or {}
                }
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
            query = """
                SELECT 
                    id, session_id, user_id, title, message_count,
                    last_message_at, session_metadata, is_active,
                    created_at, updated_at
                FROM public.universal_chat_sessions
                WHERE user_id = %s AND is_active = true
                ORDER BY last_message_at DESC
                LIMIT %s OFFSET %s
            """
            
            results = await self.db.fetch_all(query, (user_id, limit, offset))
            
            sessions = []
            for row in results:
                sessions.append({
                    'id': str(row['id']),
                    'session_id': row['session_id'],
                    'user_id': str(row['user_id']),
                    'title': row['title'],
                    'message_count': row['message_count'],
                    'last_message_at': row['last_message_at'].isoformat() if row['last_message_at'] else None,
                    'session_metadata': row['session_metadata'] or {},
                    'is_active': row['is_active'],
                    'created_at': row['created_at'].isoformat(),
                    'updated_at': row['updated_at'].isoformat()
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
            
            query = """
                INSERT INTO public.universal_chat_sessions (
                    session_id, user_id, title, message_count, is_active
                ) VALUES (%s, %s, %s, 0, true)
                RETURNING id, created_at
            """
            
            result = await self.db.fetch_one(query, (session_id, user_id, title))
            
            logger.info(f"Created new chat session: {session_id} for user {user_id}")
            
            return {
                'id': str(result['id']),
                'session_id': session_id,
                'user_id': user_id,
                'title': title,
                'message_count': 0,
                'is_active': True,
                'created_at': result['created_at'].isoformat()
            }
            
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
            query = """
                UPDATE public.universal_chat_sessions
                SET title = %s, updated_at = NOW()
                WHERE session_id = %s
            """
            
            await self.db.execute(query, (title, session_id))
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
            # Delete messages first (due to foreign key constraint)
            delete_messages_query = """
                DELETE FROM public.universal_chat_messages
                WHERE user_id = %s AND session_id = %s
            """
            
            # Delete session
            delete_session_query = """
                DELETE FROM public.universal_chat_sessions
                WHERE user_id = %s AND session_id = %s
            """
            
            await self.db.execute(delete_messages_query, (user_id, session_id))
            await self.db.execute(delete_session_query, (user_id, session_id))
            
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
            query = """
                SELECT role, content, action_type, conversation_context, created_at
                FROM public.universal_chat_messages
                WHERE user_id = %s AND session_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """
            
            results = await self.db.fetch_all(query, (user_id, session_id, limit))
            
            context = {
                'session_id': session_id,
                'recent_messages': [],
                'last_action': None,
                'conversation_state': {}
            }
            
            for row in reversed(results):  # Reverse to get chronological order
                context['recent_messages'].append({
                    'role': row['role'],
                    'content': row['content'],
                    'timestamp': row['created_at'].isoformat()
                })
                
                if row['action_type']:
                    context['last_action'] = row['action_type']
                
                # Merge conversation context from latest message
                if row['conversation_context']:
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