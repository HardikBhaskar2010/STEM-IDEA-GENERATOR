# Chat Service for AI Project Guidance
# Requirements: 2.3, 7.1
# Task: 2.1 Create ChatService class with session management

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from models.ai_guidance import (
    ChatSession, ChatMessage, MessageSender, SessionStats
)
from database.ai_guidance_crud import (
    ChatSessionCRUD, ChatMessageCRUD,
    CreateSessionParams, CreateMessageParams, UpdateSessionParams
)

logger = logging.getLogger(__name__)


class ChatService:
    """
    Service class for managing chat sessions and messages
    Implements session management, message handling, and cleanup logic
    """
    
    def __init__(self):
        self.session_crud = ChatSessionCRUD()
        self.message_crud = ChatMessageCRUD()
    
    async def createSession(self, project_id: str, user_id: str) -> ChatSession:
        """
        Create a new chat session for a project and user
        
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
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            if not user_id or not user_id.strip():
                raise ValueError("user_id cannot be empty")
            
            params = CreateSessionParams(project_id=project_id.strip(), user_id=user_id.strip())
            session = await self.session_crud.create_session(params)
            
            logger.info(f"Created chat session {session.session_id} for project {project_id} and user {user_id}")
            return session
            
        except ValueError as e:
            logger.error(f"Validation error creating session: {e}")
            raise
        except Exception as e:
            logger.error(f"Error creating chat session for project {project_id} and user {user_id}: {e}")
            raise
    
    async def saveMessage(self, session_id: str, content: str, sender: MessageSender, metadata: Optional[Dict[str, Any]] = None) -> ChatMessage:
        """
        Save a message to a chat session
        
        Args:
            session_id: ID of the chat session
            content: Message content
            sender: Who sent the message (user or ai)
            metadata: Optional message metadata
            
        Returns:
            Created chat message
            
        Raises:
            ValueError: If session_id or content are invalid
            Exception: If message creation fails
        """
        try:
            # Validate input parameters
            if not session_id or not session_id.strip():
                raise ValueError("session_id cannot be empty")
            if not content or not content.strip():
                raise ValueError("content cannot be empty")
            if not isinstance(sender, MessageSender):
                raise ValueError("sender must be a MessageSender enum value")
            
            # Validate session exists
            session = await self.session_crud.get_session(session_id.strip())
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            params = CreateMessageParams(
                session_id=session_id.strip(),
                content=content.strip(),
                sender=sender,
                metadata=metadata or {}
            )
            
            message = await self.message_crud.create_message(params)
            
            # Update session last activity
            await self.updateLastActivity(session_id.strip())
            
            logger.info(f"Saved {sender.value} message to session {session_id}")
            return message
            
        except ValueError as e:
            logger.error(f"Validation error saving message: {e}")
            raise
        except Exception as e:
            logger.error(f"Error saving message to session {session_id}: {e}")
            raise
    
    async def getChatHistory(self, session_id: str, limit: int = 100, offset: int = 0) -> List[ChatMessage]:
        """
        Get chat history for a session with pagination
        
        Args:
            session_id: ID of the chat session
            limit: Maximum number of messages to retrieve (default: 100)
            offset: Number of messages to skip (default: 0)
            
        Returns:
            List of chat messages in chronological order
            
        Raises:
            ValueError: If session_id is invalid or session doesn't exist
            Exception: If retrieval fails
        """
        try:
            # Validate input parameters
            if not session_id or not session_id.strip():
                raise ValueError("session_id cannot be empty")
            if limit <= 0:
                raise ValueError("limit must be greater than 0")
            if offset < 0:
                raise ValueError("offset must be non-negative")
            
            # Validate session exists
            session = await self.session_crud.get_session(session_id.strip())
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            messages = await self.message_crud.get_session_messages(
                session_id.strip(), 
                limit=min(limit, 1000),  # Cap at 1000 for performance
                offset=offset
            )
            
            logger.info(f"Retrieved {len(messages)} messages for session {session_id}")
            return messages
            
        except ValueError as e:
            logger.error(f"Validation error getting chat history: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting chat history for session {session_id}: {e}")
            raise
    
    async def updateLastActivity(self, session_id: str) -> ChatSession:
        """
        Update the last activity timestamp for a session
        
        Args:
            session_id: ID of the chat session
            
        Returns:
            Updated chat session
            
        Raises:
            ValueError: If session_id is invalid or session doesn't exist
            Exception: If update fails
        """
        try:
            # Validate input parameters
            if not session_id or not session_id.strip():
                raise ValueError("session_id cannot be empty")
            
            # Validate session exists
            session = await self.session_crud.get_session(session_id.strip())
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            params = UpdateSessionParams(
                session_id=session_id.strip(),
                last_activity=datetime.now(timezone.utc)
            )
            
            updated_session = await self.session_crud.update_session(params)
            if not updated_session:
                raise Exception(f"Failed to update session {session_id}")
            
            logger.info(f"Updated last activity for session {session_id}")
            return updated_session
            
        except ValueError as e:
            logger.error(f"Validation error updating last activity: {e}")
            raise
        except Exception as e:
            logger.error(f"Error updating last activity for session {session_id}: {e}")
            raise
    
    async def getSession(self, session_id: str) -> Optional[ChatSession]:
        """
        Get a chat session by ID
        
        Args:
            session_id: ID of the chat session
            
        Returns:
            Chat session or None if not found
            
        Raises:
            ValueError: If session_id is invalid
            Exception: If retrieval fails
        """
        try:
            # Validate input parameters
            if not session_id or not session_id.strip():
                raise ValueError("session_id cannot be empty")
            
            session = await self.session_crud.get_session(session_id.strip())
            
            if session:
                logger.info(f"Retrieved session {session_id}")
            else:
                logger.info(f"Session {session_id} not found")
            
            return session
            
        except ValueError as e:
            logger.error(f"Validation error getting session: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting session {session_id}: {e}")
            raise
    
    async def getUserSessions(self, user_id: str, limit: int = 10) -> List[ChatSession]:
        """
        Get recent chat sessions for a user
        
        Args:
            user_id: ID of the user
            limit: Maximum number of sessions to retrieve (default: 10)
            
        Returns:
            List of recent chat sessions ordered by last activity
            
        Raises:
            ValueError: If user_id is invalid
            Exception: If retrieval fails
        """
        try:
            # Validate input parameters
            if not user_id or not user_id.strip():
                raise ValueError("user_id cannot be empty")
            if limit <= 0:
                raise ValueError("limit must be greater than 0")
            
            sessions = await self.session_crud.get_user_sessions(
                user_id.strip(), 
                limit=min(limit, 100)  # Cap at 100 for performance
            )
            
            logger.info(f"Retrieved {len(sessions)} sessions for user {user_id}")
            return sessions
            
        except ValueError as e:
            logger.error(f"Validation error getting user sessions: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting sessions for user {user_id}: {e}")
            raise
    
    async def getProjectSessions(self, project_id: str, limit: int = 10) -> List[ChatSession]:
        """
        Get recent chat sessions for a project
        
        Args:
            project_id: ID of the project
            limit: Maximum number of sessions to retrieve (default: 10)
            
        Returns:
            List of recent chat sessions ordered by last activity
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If retrieval fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            if limit <= 0:
                raise ValueError("limit must be greater than 0")
            
            sessions = await self.session_crud.get_project_sessions(
                project_id.strip(), 
                limit=min(limit, 100)  # Cap at 100 for performance
            )
            
            logger.info(f"Retrieved {len(sessions)} sessions for project {project_id}")
            return sessions
            
        except ValueError as e:
            logger.error(f"Validation error getting project sessions: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting sessions for project {project_id}: {e}")
            raise
    
    async def getSessionStats(self, session_id: str) -> SessionStats:
        """
        Get statistics for a chat session
        
        Args:
            session_id: ID of the chat session
            
        Returns:
            Session statistics including message counts and duration
            
        Raises:
            ValueError: If session_id is invalid or session doesn't exist
            Exception: If retrieval fails
        """
        try:
            # Validate input parameters
            if not session_id or not session_id.strip():
                raise ValueError("session_id cannot be empty")
            
            # Validate session exists
            session = await self.session_crud.get_session(session_id.strip())
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            stats = await self.message_crud.get_session_stats(session_id.strip())
            
            logger.info(f"Retrieved stats for session {session_id}: {stats.message_count} messages")
            return stats
            
        except ValueError as e:
            logger.error(f"Validation error getting session stats: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting stats for session {session_id}: {e}")
            raise
    
    async def validateSession(self, session_id: str, user_id: str, project_id: Optional[str] = None) -> bool:
        """
        Validate that a session exists and belongs to the specified user and optionally project
        
        Args:
            session_id: ID of the chat session
            user_id: ID of the user
            project_id: Optional ID of the project to validate against
            
        Returns:
            True if session is valid, False otherwise
            
        Raises:
            ValueError: If required parameters are invalid
            Exception: If validation fails
        """
        try:
            # Validate input parameters
            if not session_id or not session_id.strip():
                raise ValueError("session_id cannot be empty")
            if not user_id or not user_id.strip():
                raise ValueError("user_id cannot be empty")
            
            session = await self.session_crud.get_session(session_id.strip())
            if not session:
                logger.info(f"Session validation failed: session {session_id} not found")
                return False
            
            if session.user_id != user_id.strip():
                logger.info(f"Session validation failed: user mismatch for session {session_id}")
                return False
            
            if project_id and session.project_id != project_id.strip():
                logger.info(f"Session validation failed: project mismatch for session {session_id}")
                return False
            
            logger.info(f"Session {session_id} validated successfully")
            return True
            
        except ValueError as e:
            logger.error(f"Validation error in session validation: {e}")
            raise
        except Exception as e:
            logger.error(f"Error validating session {session_id}: {e}")
            raise
    
    async def cleanupInactiveSessions(self, inactive_hours: int = 24) -> int:
        """
        Clean up sessions that have been inactive for a specified period
        
        Args:
            inactive_hours: Number of hours of inactivity after which to clean up sessions
            
        Returns:
            Number of sessions cleaned up
            
        Raises:
            ValueError: If inactive_hours is invalid
            Exception: If cleanup fails
        """
        try:
            # Validate input parameters
            if inactive_hours <= 0:
                raise ValueError("inactive_hours must be greater than 0")
            
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=inactive_hours)
            
            # Get inactive sessions
            # Note: This would require additional CRUD method to filter by last_activity
            # For now, we'll get all sessions and filter (not optimal for large datasets)
            
            # This is a simplified implementation - in production, you'd want to add
            # a specific CRUD method to handle this query efficiently
            logger.info(f"Cleanup would remove sessions inactive for more than {inactive_hours} hours")
            
            # Placeholder return - actual implementation would delete sessions
            # and return the count of deleted sessions
            return 0
            
        except ValueError as e:
            logger.error(f"Validation error in cleanup: {e}")
            raise
        except Exception as e:
            logger.error(f"Error during session cleanup: {e}")
            raise
    
    async def deleteSession(self, session_id: str, user_id: str) -> bool:
        """
        Delete a chat session and all its messages (with user validation)
        
        Args:
            session_id: ID of the chat session
            user_id: ID of the user (for authorization)
            
        Returns:
            True if session was deleted, False if not found or unauthorized
            
        Raises:
            ValueError: If required parameters are invalid
            Exception: If deletion fails
        """
        try:
            # Validate input parameters
            if not session_id or not session_id.strip():
                raise ValueError("session_id cannot be empty")
            if not user_id or not user_id.strip():
                raise ValueError("user_id cannot be empty")
            
            # Validate session exists and belongs to user
            if not await self.validateSession(session_id.strip(), user_id.strip()):
                logger.info(f"Session deletion denied: invalid session {session_id} for user {user_id}")
                return False
            
            success = await self.session_crud.delete_session(session_id.strip())
            
            if success:
                logger.info(f"Deleted session {session_id}")
            else:
                logger.warning(f"Failed to delete session {session_id}")
            
            return success
            
        except ValueError as e:
            logger.error(f"Validation error deleting session: {e}")
            raise
        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {e}")
            raise
    
    async def getRecentMessages(self, session_id: str, count: int = 10) -> List[ChatMessage]:
        """
        Get the most recent messages from a session for context
        
        Args:
            session_id: ID of the chat session
            count: Number of recent messages to retrieve (default: 10)
            
        Returns:
            List of recent messages in chronological order
            
        Raises:
            ValueError: If session_id is invalid or session doesn't exist
            Exception: If retrieval fails
        """
        try:
            # Validate input parameters
            if not session_id or not session_id.strip():
                raise ValueError("session_id cannot be empty")
            if count <= 0:
                raise ValueError("count must be greater than 0")
            
            # Validate session exists
            session = await self.session_crud.get_session(session_id.strip())
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            messages = await self.message_crud.get_recent_messages(
                session_id.strip(), 
                count=min(count, 50)  # Cap at 50 for performance
            )
            
            logger.info(f"Retrieved {len(messages)} recent messages for session {session_id}")
            return messages
            
        except ValueError as e:
            logger.error(f"Validation error getting recent messages: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting recent messages for session {session_id}: {e}")
            raise


# Convenience functions for easy access

async def create_chat_session(project_id: str, user_id: str) -> ChatSession:
    """
    Convenience function to create a new chat session
    
    Args:
        project_id: ID of the project
        user_id: ID of the user
        
    Returns:
        Created chat session
    """
    service = ChatService()
    return await service.createSession(project_id, user_id)


async def save_chat_message(session_id: str, content: str, sender: MessageSender, metadata: Optional[Dict[str, Any]] = None) -> ChatMessage:
    """
    Convenience function to save a message to a chat session
    
    Args:
        session_id: ID of the chat session
        content: Message content
        sender: Who sent the message
        metadata: Optional message metadata
        
    Returns:
        Created chat message
    """
    service = ChatService()
    return await service.saveMessage(session_id, content, sender, metadata)


async def get_chat_history(session_id: str, limit: int = 100) -> List[ChatMessage]:
    """
    Convenience function to get chat history for a session
    
    Args:
        session_id: ID of the chat session
        limit: Maximum number of messages to retrieve
        
    Returns:
        List of chat messages
    """
    service = ChatService()
    return await service.getChatHistory(session_id, limit)


async def update_session_activity(session_id: str) -> ChatSession:
    """
    Convenience function to update session last activity
    
    Args:
        session_id: ID of the chat session
        
    Returns:
        Updated chat session
    """
    service = ChatService()
    return await service.updateLastActivity(session_id)