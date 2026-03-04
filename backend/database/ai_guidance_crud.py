# AI Guidance CRUD Operations
# Requirements: 7.1, 7.2

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from supabase import Client

from backend.database.connection import get_db_client, OptimizedDatabaseConnection
from backend.models.ai_guidance import (
    ChatSession, ChatMessage, ProjectContext, AIContextCache,
    CreateSessionParams, UpdateSessionParams, CreateMessageParams,
    UpdateContextParams, SessionStats, MessageSender
)

logger = logging.getLogger(__name__)


class ChatSessionCRUD:
    """CRUD operations for chat sessions with performance optimization"""
    
    def __init__(self, client: Optional[Client] = None):
        self.client = client
        self.db_connection = None
    
    async def _get_db_connection(self):
        """Lazy initialization of database connection"""
        if self.db_connection is None:
            self.db_connection = OptimizedDatabaseConnection()
        return self.db_connection
    
    async def create_session(self, params: CreateSessionParams) -> ChatSession:
        """Create a new chat session with performance monitoring"""
        try:
            session_data = {
                'project_id': params.project_id,
                'user_id': params.user_id,
                'start_time': datetime.now(timezone.utc).isoformat(),
                'last_activity': datetime.now(timezone.utc).isoformat()
            }
            
            if self.client:
                result = self.client.table('chat_sessions').insert(session_data).execute()
            else:
                db_conn = await self._get_db_connection()
                client = await db_conn.get_client()
                
                # Use optimized query execution
                result = await db_conn.execute_optimized_query(
                    'chat_sessions', 'insert',
                    lambda: client.table('chat_sessions').insert(session_data).execute()
                )
            
            if result.data:
                session_dict = result.data[0]
                logger.info(f"Created chat session: {session_dict['session_id']}")
                return ChatSession(**session_dict)
            else:
                raise Exception("Failed to create chat session")
                
        except Exception as e:
            logger.error(f"Error creating chat session: {e}")
            raise
    
    async def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get a chat session by ID with performance monitoring"""
        try:
            if self.client:
                result = self.client.table('chat_sessions').select('*').eq('session_id', session_id).execute()
            else:
                db_conn = await self._get_db_connection()
                client = await db_conn.get_client()
                
                result = await db_conn.execute_optimized_query(
                    'chat_sessions', 'select',
                    lambda: client.table('chat_sessions').select('*').eq('session_id', session_id).execute()
                )
            
            if result.data:
                session_dict = result.data[0]
                return ChatSession(**session_dict)
            return None
            
        except Exception as e:
            logger.error(f"Error getting chat session {session_id}: {e}")
            raise
    
    async def update_session(self, params: UpdateSessionParams) -> Optional[ChatSession]:
        """Update a chat session"""
        try:
            update_data = {
                'last_activity': (params.last_activity or datetime.now(timezone.utc)).isoformat()
            }
            
            result = self.client.table('chat_sessions').update(update_data).eq('session_id', params.session_id).execute()
            
            if result.data:
                session_dict = result.data[0]
                logger.info(f"Updated chat session: {params.session_id}")
                return ChatSession(**session_dict)
            return None
            
        except Exception as e:
            logger.error(f"Error updating chat session {params.session_id}: {e}")
            raise
    
    async def get_user_sessions(self, user_id: str, limit: int = 10) -> List[ChatSession]:
        """Get recent chat sessions for a user"""
        try:
            result = (self.client.table('chat_sessions')
                     .select('*')
                     .eq('user_id', user_id)
                     .order('last_activity', desc=True)
                     .limit(limit)
                     .execute())
            
            sessions = [ChatSession(**session_dict) for session_dict in result.data]
            logger.info(f"Retrieved {len(sessions)} sessions for user {user_id}")
            return sessions
            
        except Exception as e:
            logger.error(f"Error getting user sessions for {user_id}: {e}")
            raise
    
    async def get_project_sessions(self, project_id: str, limit: int = 10) -> List[ChatSession]:
        """Get recent chat sessions for a project"""
        try:
            result = (self.client.table('chat_sessions')
                     .select('*')
                     .eq('project_id', project_id)
                     .order('last_activity', desc=True)
                     .limit(limit)
                     .execute())
            
            sessions = [ChatSession(**session_dict) for session_dict in result.data]
            logger.info(f"Retrieved {len(sessions)} sessions for project {project_id}")
            return sessions
            
        except Exception as e:
            logger.error(f"Error getting project sessions for {project_id}: {e}")
            raise
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete a chat session and all its messages"""
        try:
            # Delete messages first (cascade should handle this, but being explicit)
            self.client.table('chat_messages').delete().eq('session_id', session_id).execute()
            
            # Delete session
            result = self.client.table('chat_sessions').delete().eq('session_id', session_id).execute()
            
            logger.info(f"Deleted chat session: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting chat session {session_id}: {e}")
            raise


class ChatMessageCRUD:
    """CRUD operations for chat messages with performance optimization"""
    
    def __init__(self, client: Optional[Client] = None):
        self.client = client
        self.db_connection = None
    
    async def _get_db_connection(self):
        """Lazy initialization of database connection"""
        if self.db_connection is None:
            self.db_connection = OptimizedDatabaseConnection()
        return self.db_connection
    
    async def create_message(self, params: CreateMessageParams) -> ChatMessage:
        """Create a new chat message with performance monitoring"""
        try:
            message_data = {
                'session_id': params.session_id,
                'content': params.content,
                'sender': params.sender.value,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'metadata': params.metadata or {}
            }
            
            client = self.client or await self.db_connection.get_client()
            
            result = await self.db_connection.execute_optimized_query(
                'chat_messages', 'insert',
                lambda: client.table('chat_messages').insert(message_data).execute()
            )
            
            if result.data:
                message_dict = result.data[0]
                logger.info(f"Created chat message: {message_dict['message_id']}")
                return ChatMessage(**message_dict)
            else:
                raise Exception("Failed to create chat message")
                
        except Exception as e:
            logger.error(f"Error creating chat message: {e}")
            raise
    
    async def get_message(self, message_id: str) -> Optional[ChatMessage]:
        """Get a chat message by ID"""
        try:
            result = self.client.table('chat_messages').select('*').eq('message_id', message_id).execute()
            
            if result.data:
                message_dict = result.data[0]
                return ChatMessage(**message_dict)
            return None
            
        except Exception as e:
            logger.error(f"Error getting chat message {message_id}: {e}")
            raise
    
    async def get_session_messages(self, session_id: str, limit: int = 100, offset: int = 0) -> List[ChatMessage]:
        """Get messages for a chat session"""
        try:
            result = (self.client.table('chat_messages')
                     .select('*')
                     .eq('session_id', session_id)
                     .order('timestamp', desc=False)
                     .range(offset, offset + limit - 1)
                     .execute())
            
            messages = [ChatMessage(**message_dict) for message_dict in result.data]
            logger.info(f"Retrieved {len(messages)} messages for session {session_id}")
            return messages
            
        except Exception as e:
            logger.error(f"Error getting session messages for {session_id}: {e}")
            raise
    
    async def get_recent_messages(self, session_id: str, count: int = 10) -> List[ChatMessage]:
        """Get the most recent messages for a session"""
        try:
            result = (self.client.table('chat_messages')
                     .select('*')
                     .eq('session_id', session_id)
                     .order('timestamp', desc=True)
                     .limit(count)
                     .execute())
            
            # Reverse to get chronological order
            messages = [ChatMessage(**message_dict) for message_dict in reversed(result.data)]
            logger.info(f"Retrieved {len(messages)} recent messages for session {session_id}")
            return messages
            
        except Exception as e:
            logger.error(f"Error getting recent messages for {session_id}: {e}")
            raise
    
    async def delete_message(self, message_id: str) -> bool:
        """Delete a chat message"""
        try:
            result = self.client.table('chat_messages').delete().eq('message_id', message_id).execute()
            
            logger.info(f"Deleted chat message: {message_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting chat message {message_id}: {e}")
            raise
    
    async def get_session_stats(self, session_id: str) -> SessionStats:
        """Get statistics for a chat session"""
        try:
            # Get all messages for the session
            messages_result = (self.client.table('chat_messages')
                              .select('sender, timestamp')
                              .eq('session_id', session_id)
                              .execute())
            
            messages = messages_result.data
            message_count = len(messages)
            user_message_count = len([m for m in messages if m['sender'] == 'user'])
            ai_message_count = len([m for m in messages if m['sender'] == 'ai'])
            
            # Calculate duration
            duration_minutes = 0.0
            last_message_time = None
            
            if messages:
                timestamps = [datetime.fromisoformat(m['timestamp'].replace('Z', '+00:00')) for m in messages]
                timestamps.sort()
                
                last_message_time = timestamps[-1]
                if len(timestamps) > 1:
                    duration = timestamps[-1] - timestamps[0]
                    duration_minutes = duration.total_seconds() / 60.0
            
            stats = SessionStats(
                message_count=message_count,
                duration_minutes=duration_minutes,
                last_message_time=last_message_time,
                user_message_count=user_message_count,
                ai_message_count=ai_message_count
            )
            
            logger.info(f"Retrieved stats for session {session_id}: {message_count} messages")
            return stats
            
        except Exception as e:
            logger.error(f"Error getting session stats for {session_id}: {e}")
            raise


class AIContextCacheCRUD:
    """CRUD operations for AI context cache with performance optimization"""
    
    def __init__(self, client: Optional[Client] = None):
        self.client = client
        self.db_connection = None
    
    async def _get_db_connection(self):
        """Lazy initialization of database connection"""
        if self.db_connection is None:
            self.db_connection = OptimizedDatabaseConnection()
        return self.db_connection
    
    async def create_or_update_context(self, params: UpdateContextParams) -> AIContextCache:
        """Create or update project context cache with performance monitoring"""
        try:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=params.expiration_hours)
            
            cache_data = {
                'project_id': params.project_id,
                'context_data': params.context_data.dict(),
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'expires_at': expires_at.isoformat()
            }
            
            client = self.client or await self.db_connection.get_client()
            
            # Try to update existing cache first
            existing_result = await self.db_connection.execute_optimized_query(
                'ai_context_cache', 'select',
                lambda: client.table('ai_context_cache').select('cache_id').eq('project_id', params.project_id).execute()
            )
            
            if existing_result.data:
                # Update existing cache
                cache_id = existing_result.data[0]['cache_id']
                result = await self.db_connection.execute_optimized_query(
                    'ai_context_cache', 'update',
                    lambda: client.table('ai_context_cache').update(cache_data).eq('cache_id', cache_id).execute()
                )
                logger.info(f"Updated context cache for project {params.project_id}")
            else:
                # Create new cache
                result = await self.db_connection.execute_optimized_query(
                    'ai_context_cache', 'insert',
                    lambda: client.table('ai_context_cache').insert(cache_data).execute()
                )
                logger.info(f"Created context cache for project {params.project_id}")
            
            if result.data:
                cache_dict = result.data[0]
                # Convert context_data back to ProjectContext
                cache_dict['context_data'] = ProjectContext(**cache_dict['context_data'])
                return AIContextCache(**cache_dict)
            else:
                raise Exception("Failed to create/update context cache")
                
        except Exception as e:
            logger.error(f"Error creating/updating context cache for project {params.project_id}: {e}")
            raise
    
    async def get_context(self, project_id: str) -> Optional[AIContextCache]:
        """Get cached context for a project"""
        try:
            result = (self.client.table('ai_context_cache')
                     .select('*')
                     .eq('project_id', project_id)
                     .gt('expires_at', datetime.now(timezone.utc).isoformat())
                     .order('generated_at', desc=True)
                     .limit(1)
                     .execute())
            
            if result.data:
                cache_dict = result.data[0]
                # Convert context_data back to ProjectContext
                cache_dict['context_data'] = ProjectContext(**cache_dict['context_data'])
                logger.info(f"Retrieved cached context for project {project_id}")
                return AIContextCache(**cache_dict)
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached context for project {project_id}: {e}")
            raise
    
    async def delete_context(self, project_id: str) -> bool:
        """Delete cached context for a project"""
        try:
            result = self.client.table('ai_context_cache').delete().eq('project_id', project_id).execute()
            
            logger.info(f"Deleted context cache for project {project_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting context cache for project {project_id}: {e}")
            raise
    
    async def cleanup_expired_cache(self) -> int:
        """Clean up expired context cache entries"""
        try:
            result = (self.client.table('ai_context_cache')
                     .delete()
                     .lt('expires_at', datetime.now(timezone.utc).isoformat())
                     .execute())
            
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"Cleaned up {deleted_count} expired context cache entries")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired context cache: {e}")
            raise


# Convenience functions for easy access

async def create_chat_session(project_id: str, user_id: str) -> ChatSession:
    """Create a new chat session"""
    crud = ChatSessionCRUD()
    params = CreateSessionParams(project_id=project_id, user_id=user_id)
    return await crud.create_session(params)


async def add_chat_message(session_id: str, content: str, sender: MessageSender, metadata: Optional[Dict[str, Any]] = None) -> ChatMessage:
    """Add a message to a chat session"""
    crud = ChatMessageCRUD()
    params = CreateMessageParams(
        session_id=session_id,
        content=content,
        sender=sender,
        metadata=metadata or {}
    )
    return await crud.create_message(params)


async def get_chat_history(session_id: str, limit: int = 100) -> List[ChatMessage]:
    """Get chat history for a session"""
    crud = ChatMessageCRUD()
    return await crud.get_session_messages(session_id, limit=limit)


async def update_project_context(project_id: str, context: ProjectContext, expiration_hours: int = 24) -> AIContextCache:
    """Update cached project context"""
    crud = AIContextCacheCRUD()
    params = UpdateContextParams(
        project_id=project_id,
        context_data=context,
        expiration_hours=expiration_hours
    )
    return await crud.create_or_update_context(params)


async def get_project_context(project_id: str) -> Optional[ProjectContext]:
    """Get cached project context"""
    crud = AIContextCacheCRUD()
    cache = await crud.get_context(project_id)
    return cache.context_data if cache else None