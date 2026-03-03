# Integration Tests for ChatService
# Requirements: 2.3, 7.1
# Task: 2.1 Create ChatService class with session management

import pytest
import asyncio
from datetime import datetime, timezone
import uuid

from backend.services.chat_service import ChatService
from backend.models.ai_guidance import MessageSender


class TestChatServiceIntegration:
    """Integration test suite for ChatService with real database operations"""
    
    @pytest.fixture
    def chat_service(self):
        """Create a ChatService instance for testing"""
        return ChatService()
    
    @pytest.mark.asyncio
    async def test_full_chat_workflow(self, chat_service):
        """Test a complete chat workflow from session creation to message exchange"""
        # Generate test IDs
        project_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        try:
            # 1. Create a new chat session
            session = await chat_service.createSession(project_id, user_id)
            assert session is not None
            assert session.project_id == project_id
            assert session.user_id == user_id
            assert session.session_id is not None
            
            # 2. Validate the session exists
            retrieved_session = await chat_service.getSession(session.session_id)
            assert retrieved_session is not None
            assert retrieved_session.session_id == session.session_id
            
            # 3. Save a user message
            user_message = await chat_service.saveMessage(
                session.session_id,
                "Hello, I need help with my project",
                MessageSender.USER
            )
            assert user_message is not None
            assert user_message.content == "Hello, I need help with my project"
            assert user_message.sender == MessageSender.USER
            
            # 4. Save an AI response
            ai_message = await chat_service.saveMessage(
                session.session_id,
                "I'd be happy to help you with your project. What specific area would you like assistance with?",
                MessageSender.AI,
                metadata={"confidence": 0.95}
            )
            assert ai_message is not None
            assert ai_message.sender == MessageSender.AI
            assert ai_message.metadata.get("confidence") == 0.95
            
            # 5. Get chat history
            history = await chat_service.getChatHistory(session.session_id)
            assert len(history) == 2
            assert history[0].sender == MessageSender.USER
            assert history[1].sender == MessageSender.AI
            
            # 6. Get recent messages
            recent = await chat_service.getRecentMessages(session.session_id, count=1)
            assert len(recent) == 1
            assert recent[0].sender == MessageSender.AI
            
            # 7. Get session statistics
            stats = await chat_service.getSessionStats(session.session_id)
            assert stats.message_count == 2
            assert stats.user_message_count == 1
            assert stats.ai_message_count == 1
            
            # 8. Validate session ownership
            is_valid = await chat_service.validateSession(session.session_id, user_id, project_id)
            assert is_valid is True
            
            # 9. Test invalid validation
            is_invalid = await chat_service.validateSession(session.session_id, str(uuid.uuid4()))
            assert is_invalid is False
            
            # 10. Update last activity
            updated_session = await chat_service.updateLastActivity(session.session_id)
            assert updated_session.last_activity > session.last_activity
            
            print(f"✅ Integration test completed successfully for session {session.session_id}")
            
        except Exception as e:
            pytest.fail(f"Integration test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_session_management_operations(self, chat_service):
        """Test session management operations"""
        # Generate test IDs
        project_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        try:
            # Create multiple sessions for the same user
            session1 = await chat_service.createSession(project_id, user_id)
            session2 = await chat_service.createSession(project_id, user_id)
            
            # Add messages to both sessions
            await chat_service.saveMessage(session1.session_id, "Message in session 1", MessageSender.USER)
            await chat_service.saveMessage(session2.session_id, "Message in session 2", MessageSender.USER)
            
            # Get user sessions
            user_sessions = await chat_service.getUserSessions(user_id)
            assert len(user_sessions) >= 2
            
            # Get project sessions
            project_sessions = await chat_service.getProjectSessions(project_id)
            assert len(project_sessions) >= 2
            
            # Test session deletion (if implemented)
            # Note: This would require the actual database to be available
            
            print(f"✅ Session management test completed successfully")
            
        except Exception as e:
            pytest.fail(f"Session management test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_error_handling(self, chat_service):
        """Test error handling scenarios"""
        try:
            # Test with invalid session ID
            with pytest.raises(ValueError):
                await chat_service.saveMessage("", "content", MessageSender.USER)
            
            # Test with invalid content
            with pytest.raises(ValueError):
                await chat_service.saveMessage(str(uuid.uuid4()), "", MessageSender.USER)
            
            # Test with non-existent session
            with pytest.raises(ValueError):
                await chat_service.saveMessage(str(uuid.uuid4()), "content", MessageSender.USER)
            
            print(f"✅ Error handling test completed successfully")
            
        except Exception as e:
            pytest.fail(f"Error handling test failed: {e}")


if __name__ == "__main__":
    # Run a simple test if executed directly
    async def main():
        service = ChatService()
        project_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        print("Testing ChatService integration...")
        
        # Create session
        session = await service.createSession(project_id, user_id)
        print(f"Created session: {session.session_id}")
        
        # Add message
        message = await service.saveMessage(session.session_id, "Test message", MessageSender.USER)
        print(f"Added message: {message.message_id}")
        
        # Get history
        history = await service.getChatHistory(session.session_id)
        print(f"Retrieved {len(history)} messages")
        
        print("✅ Basic integration test passed!")
    
    # Uncomment to run basic test
    # asyncio.run(main())