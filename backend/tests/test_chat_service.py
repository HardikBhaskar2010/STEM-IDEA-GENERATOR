# Unit Tests for ChatService
# Requirements: 2.3, 7.1
# Task: 2.1 Create ChatService class with session management

import pytest
import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

from backend.services.chat_service import ChatService
from backend.models.ai_guidance import (
    ChatSession, ChatMessage, MessageSender, SessionStats
)


class TestChatService:
    """Test suite for ChatService class"""
    
    @pytest.fixture
    def chat_service(self):
        """Create a ChatService instance for testing"""
        return ChatService()
    
    @pytest.fixture
    def sample_session(self):
        """Create a sample chat session for testing"""
        return ChatSession(
            session_id=str(uuid.uuid4()),
            project_id=str(uuid.uuid4()),
            user_id=str(uuid.uuid4()),
            start_time=datetime.now(timezone.utc),
            last_activity=datetime.now(timezone.utc)
        )
    
    @pytest.fixture
    def sample_message(self):
        """Create a sample chat message for testing"""
        return ChatMessage(
            message_id=str(uuid.uuid4()),
            session_id=str(uuid.uuid4()),
            content="Test message content",
            sender=MessageSender.USER,
            timestamp=datetime.now(timezone.utc)
        )
    
    @pytest.mark.asyncio
    async def test_createSession_success(self, chat_service, sample_session):
        """Test successful session creation"""
        with patch.object(chat_service.session_crud, 'create_session', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = sample_session
            
            result = await chat_service.createSession(
                sample_session.project_id, 
                sample_session.user_id
            )
            
            assert result == sample_session
            mock_create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_createSession_empty_project_id(self, chat_service):
        """Test session creation with empty project_id"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await chat_service.createSession("", "user123")
    
    @pytest.mark.asyncio
    async def test_createSession_empty_user_id(self, chat_service):
        """Test session creation with empty user_id"""
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            await chat_service.createSession("project123", "")
    
    @pytest.mark.asyncio
    async def test_saveMessage_success(self, chat_service, sample_session, sample_message):
        """Test successful message saving"""
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session, \
             patch.object(chat_service.message_crud, 'create_message', new_callable=AsyncMock) as mock_create_message, \
             patch.object(chat_service, 'updateLastActivity', new_callable=AsyncMock) as mock_update:
            
            mock_get_session.return_value = sample_session
            mock_create_message.return_value = sample_message
            
            result = await chat_service.saveMessage(
                sample_session.session_id,
                "Test message",
                MessageSender.USER
            )
            
            assert result == sample_message
            mock_get_session.assert_called_once_with(sample_session.session_id)
            mock_create_message.assert_called_once()
            mock_update.assert_called_once_with(sample_session.session_id)
    
    @pytest.mark.asyncio
    async def test_saveMessage_empty_session_id(self, chat_service):
        """Test message saving with empty session_id"""
        with pytest.raises(ValueError, match="session_id cannot be empty"):
            await chat_service.saveMessage("", "content", MessageSender.USER)
    
    @pytest.mark.asyncio
    async def test_saveMessage_empty_content(self, chat_service):
        """Test message saving with empty content"""
        with pytest.raises(ValueError, match="content cannot be empty"):
            await chat_service.saveMessage("session123", "", MessageSender.USER)
    
    @pytest.mark.asyncio
    async def test_saveMessage_session_not_found(self, chat_service):
        """Test message saving when session doesn't exist"""
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session:
            mock_get_session.return_value = None
            
            with pytest.raises(ValueError, match="Session .* not found"):
                await chat_service.saveMessage("nonexistent", "content", MessageSender.USER)
    
    @pytest.mark.asyncio
    async def test_getChatHistory_success(self, chat_service, sample_session, sample_message):
        """Test successful chat history retrieval"""
        messages = [sample_message]
        
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session, \
             patch.object(chat_service.message_crud, 'get_session_messages', new_callable=AsyncMock) as mock_get_messages:
            
            mock_get_session.return_value = sample_session
            mock_get_messages.return_value = messages
            
            result = await chat_service.getChatHistory(sample_session.session_id)
            
            assert result == messages
            mock_get_session.assert_called_once_with(sample_session.session_id)
            mock_get_messages.assert_called_once_with(sample_session.session_id, limit=100, offset=0)
    
    @pytest.mark.asyncio
    async def test_getChatHistory_empty_session_id(self, chat_service):
        """Test chat history retrieval with empty session_id"""
        with pytest.raises(ValueError, match="session_id cannot be empty"):
            await chat_service.getChatHistory("")
    
    @pytest.mark.asyncio
    async def test_getChatHistory_invalid_limit(self, chat_service):
        """Test chat history retrieval with invalid limit"""
        with pytest.raises(ValueError, match="limit must be greater than 0"):
            await chat_service.getChatHistory("session123", limit=0)
    
    @pytest.mark.asyncio
    async def test_getChatHistory_negative_offset(self, chat_service):
        """Test chat history retrieval with negative offset"""
        with pytest.raises(ValueError, match="offset must be non-negative"):
            await chat_service.getChatHistory("session123", offset=-1)
    
    @pytest.mark.asyncio
    async def test_updateLastActivity_success(self, chat_service, sample_session):
        """Test successful last activity update"""
        updated_session = ChatSession(**sample_session.model_dump())
        updated_session.last_activity = datetime.now(timezone.utc)
        
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session, \
             patch.object(chat_service.session_crud, 'update_session', new_callable=AsyncMock) as mock_update:
            
            mock_get_session.return_value = sample_session
            mock_update.return_value = updated_session
            
            result = await chat_service.updateLastActivity(sample_session.session_id)
            
            assert result == updated_session
            mock_get_session.assert_called_once_with(sample_session.session_id)
            mock_update.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_updateLastActivity_empty_session_id(self, chat_service):
        """Test last activity update with empty session_id"""
        with pytest.raises(ValueError, match="session_id cannot be empty"):
            await chat_service.updateLastActivity("")
    
    @pytest.mark.asyncio
    async def test_updateLastActivity_session_not_found(self, chat_service):
        """Test last activity update when session doesn't exist"""
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session:
            mock_get_session.return_value = None
            
            with pytest.raises(ValueError, match="Session .* not found"):
                await chat_service.updateLastActivity("nonexistent")
    
    @pytest.mark.asyncio
    async def test_getSession_success(self, chat_service, sample_session):
        """Test successful session retrieval"""
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session:
            mock_get_session.return_value = sample_session
            
            result = await chat_service.getSession(sample_session.session_id)
            
            assert result == sample_session
            mock_get_session.assert_called_once_with(sample_session.session_id)
    
    @pytest.mark.asyncio
    async def test_getSession_not_found(self, chat_service):
        """Test session retrieval when session doesn't exist"""
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session:
            mock_get_session.return_value = None
            
            result = await chat_service.getSession("nonexistent")
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_getSession_empty_session_id(self, chat_service):
        """Test session retrieval with empty session_id"""
        with pytest.raises(ValueError, match="session_id cannot be empty"):
            await chat_service.getSession("")
    
    @pytest.mark.asyncio
    async def test_getUserSessions_success(self, chat_service, sample_session):
        """Test successful user sessions retrieval"""
        sessions = [sample_session]
        
        with patch.object(chat_service.session_crud, 'get_user_sessions', new_callable=AsyncMock) as mock_get_sessions:
            mock_get_sessions.return_value = sessions
            
            result = await chat_service.getUserSessions(sample_session.user_id)
            
            assert result == sessions
            mock_get_sessions.assert_called_once_with(sample_session.user_id, limit=10)
    
    @pytest.mark.asyncio
    async def test_getUserSessions_empty_user_id(self, chat_service):
        """Test user sessions retrieval with empty user_id"""
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            await chat_service.getUserSessions("")
    
    @pytest.mark.asyncio
    async def test_getUserSessions_invalid_limit(self, chat_service):
        """Test user sessions retrieval with invalid limit"""
        with pytest.raises(ValueError, match="limit must be greater than 0"):
            await chat_service.getUserSessions("user123", limit=0)
    
    @pytest.mark.asyncio
    async def test_getProjectSessions_success(self, chat_service, sample_session):
        """Test successful project sessions retrieval"""
        sessions = [sample_session]
        
        with patch.object(chat_service.session_crud, 'get_project_sessions', new_callable=AsyncMock) as mock_get_sessions:
            mock_get_sessions.return_value = sessions
            
            result = await chat_service.getProjectSessions(sample_session.project_id)
            
            assert result == sessions
            mock_get_sessions.assert_called_once_with(sample_session.project_id, limit=10)
    
    @pytest.mark.asyncio
    async def test_getProjectSessions_empty_project_id(self, chat_service):
        """Test project sessions retrieval with empty project_id"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await chat_service.getProjectSessions("")
    
    @pytest.mark.asyncio
    async def test_validateSession_success(self, chat_service, sample_session):
        """Test successful session validation"""
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session:
            mock_get_session.return_value = sample_session
            
            result = await chat_service.validateSession(
                sample_session.session_id,
                sample_session.user_id,
                sample_session.project_id
            )
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_validateSession_session_not_found(self, chat_service):
        """Test session validation when session doesn't exist"""
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session:
            mock_get_session.return_value = None
            
            result = await chat_service.validateSession("nonexistent", "user123")
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_validateSession_user_mismatch(self, chat_service, sample_session):
        """Test session validation with user mismatch"""
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session:
            mock_get_session.return_value = sample_session
            
            result = await chat_service.validateSession(
                sample_session.session_id,
                "different_user"
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_validateSession_project_mismatch(self, chat_service, sample_session):
        """Test session validation with project mismatch"""
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session:
            mock_get_session.return_value = sample_session
            
            result = await chat_service.validateSession(
                sample_session.session_id,
                sample_session.user_id,
                "different_project"
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_deleteSession_success(self, chat_service, sample_session):
        """Test successful session deletion"""
        with patch.object(chat_service, 'validateSession', new_callable=AsyncMock) as mock_validate, \
             patch.object(chat_service.session_crud, 'delete_session', new_callable=AsyncMock) as mock_delete:
            
            mock_validate.return_value = True
            mock_delete.return_value = True
            
            result = await chat_service.deleteSession(
                sample_session.session_id,
                sample_session.user_id
            )
            
            assert result is True
            mock_validate.assert_called_once_with(sample_session.session_id, sample_session.user_id)
            mock_delete.assert_called_once_with(sample_session.session_id)
    
    @pytest.mark.asyncio
    async def test_deleteSession_unauthorized(self, chat_service, sample_session):
        """Test session deletion when unauthorized"""
        with patch.object(chat_service, 'validateSession', new_callable=AsyncMock) as mock_validate:
            mock_validate.return_value = False
            
            result = await chat_service.deleteSession(
                sample_session.session_id,
                "wrong_user"
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_getSessionStats_success(self, chat_service, sample_session):
        """Test successful session stats retrieval"""
        stats = SessionStats(
            message_count=5,
            duration_minutes=30.0,
            user_message_count=3,
            ai_message_count=2
        )
        
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session, \
             patch.object(chat_service.message_crud, 'get_session_stats', new_callable=AsyncMock) as mock_get_stats:
            
            mock_get_session.return_value = sample_session
            mock_get_stats.return_value = stats
            
            result = await chat_service.getSessionStats(sample_session.session_id)
            
            assert result == stats
            mock_get_session.assert_called_once_with(sample_session.session_id)
            mock_get_stats.assert_called_once_with(sample_session.session_id)
    
    @pytest.mark.asyncio
    async def test_getRecentMessages_success(self, chat_service, sample_session, sample_message):
        """Test successful recent messages retrieval"""
        messages = [sample_message]
        
        with patch.object(chat_service.session_crud, 'get_session', new_callable=AsyncMock) as mock_get_session, \
             patch.object(chat_service.message_crud, 'get_recent_messages', new_callable=AsyncMock) as mock_get_messages:
            
            mock_get_session.return_value = sample_session
            mock_get_messages.return_value = messages
            
            result = await chat_service.getRecentMessages(sample_session.session_id, count=5)
            
            assert result == messages
            mock_get_session.assert_called_once_with(sample_session.session_id)
            mock_get_messages.assert_called_once_with(sample_session.session_id, count=5)
    
    @pytest.mark.asyncio
    async def test_getRecentMessages_invalid_count(self, chat_service):
        """Test recent messages retrieval with invalid count"""
        with pytest.raises(ValueError, match="count must be greater than 0"):
            await chat_service.getRecentMessages("session123", count=0)
    
    @pytest.mark.asyncio
    async def test_cleanupInactiveSessions_invalid_hours(self, chat_service):
        """Test cleanup with invalid hours parameter"""
        with pytest.raises(ValueError, match="inactive_hours must be greater than 0"):
            await chat_service.cleanupInactiveSessions(inactive_hours=0)


# Test convenience functions

@pytest.mark.asyncio
async def test_create_chat_session_convenience():
    """Test the convenience function for creating chat sessions"""
    from backend.services.chat_service import create_chat_session
    
    project_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    
    sample_session = ChatSession(
        session_id=str(uuid.uuid4()),
        project_id=project_id,
        user_id=user_id,
        start_time=datetime.now(timezone.utc),
        last_activity=datetime.now(timezone.utc)
    )
    
    with patch('backend.services.chat_service.ChatService') as mock_service_class:
        mock_service = AsyncMock()
        mock_service.createSession.return_value = sample_session
        mock_service_class.return_value = mock_service
        
        result = await create_chat_session(project_id, user_id)
        
        assert result == sample_session
        mock_service.createSession.assert_called_once_with(project_id, user_id)


@pytest.mark.asyncio
async def test_save_chat_message_convenience():
    """Test the convenience function for saving chat messages"""
    from backend.services.chat_service import save_chat_message
    
    session_id = str(uuid.uuid4())
    
    sample_message = ChatMessage(
        message_id=str(uuid.uuid4()),
        session_id=session_id,
        content="Test message",
        sender=MessageSender.USER,
        timestamp=datetime.now(timezone.utc)
    )
    
    with patch('backend.services.chat_service.ChatService') as mock_service_class:
        mock_service = AsyncMock()
        mock_service.saveMessage.return_value = sample_message
        mock_service_class.return_value = mock_service
        
        result = await save_chat_message(session_id, "Test message", MessageSender.USER)
        
        assert result == sample_message
        mock_service.saveMessage.assert_called_once_with(session_id, "Test message", MessageSender.USER, None)


@pytest.mark.asyncio
async def test_get_chat_history_convenience():
    """Test the convenience function for getting chat history"""
    from backend.services.chat_service import get_chat_history
    
    session_id = str(uuid.uuid4())
    
    sample_message = ChatMessage(
        message_id=str(uuid.uuid4()),
        session_id=session_id,
        content="Test message",
        sender=MessageSender.USER,
        timestamp=datetime.now(timezone.utc)
    )
    messages = [sample_message]
    
    with patch('backend.services.chat_service.ChatService') as mock_service_class:
        mock_service = AsyncMock()
        mock_service.getChatHistory.return_value = messages
        mock_service_class.return_value = mock_service
        
        result = await get_chat_history(session_id, limit=50)
        
        assert result == messages
        mock_service.getChatHistory.assert_called_once_with(session_id, 50)


@pytest.mark.asyncio
async def test_update_session_activity_convenience():
    """Test the convenience function for updating session activity"""
    from backend.services.chat_service import update_session_activity
    
    session_id = str(uuid.uuid4())
    project_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    
    sample_session = ChatSession(
        session_id=session_id,
        project_id=project_id,
        user_id=user_id,
        start_time=datetime.now(timezone.utc),
        last_activity=datetime.now(timezone.utc)
    )
    
    with patch('backend.services.chat_service.ChatService') as mock_service_class:
        mock_service = AsyncMock()
        mock_service.updateLastActivity.return_value = sample_session
        mock_service_class.return_value = mock_service
        
        result = await update_session_activity(session_id)
        
        assert result == sample_session
        mock_service.updateLastActivity.assert_called_once_with(session_id)