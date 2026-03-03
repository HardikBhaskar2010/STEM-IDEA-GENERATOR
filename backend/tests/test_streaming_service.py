"""
Unit tests for StreamingService

Tests the WebSocket streaming functionality including:
- WebSocket connection management
- Real-time progress updates
- Connection cleanup and error handling
- Message broadcasting and routing
- Connection state management
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timezone
import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

from backend.services.streaming_service import StreamingService


class TestStreamingService:
    """Test suite for StreamingService"""

    @pytest.fixture
    def service(self):
        """Create a StreamingService instance for testing"""
        return StreamingService()

    @pytest.fixture
    def mock_websocket(self):
        """Mock WebSocket connection"""
        mock_ws = AsyncMock()
        mock_ws.closed = False
        mock_ws.remote_address = ('127.0.0.1', 12345)
        return mock_ws

    @pytest.fixture
    def sample_connection_info(self):
        """Sample connection information"""
        return {
            'connection_id': 'conn_123',
            'user_id': 'user_123',
            'project_id': 'proj_123',
            'generation_id': 'gen_123',
            'connected_at': datetime.now(timezone.utc)
        }

    @pytest.fixture
    def sample_message(self):
        """Sample WebSocket message"""
        return {
            'type': 'progress_update',
            'data': {
                'stage': 'generating',
                'progress': 50,
                'message': 'Generating Arduino code...'
            },
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

    def test_service_initialization(self, service):
        """Test service initializes correctly"""
        assert service is not None
        assert hasattr(service, 'connections')
        assert hasattr(service, 'connection_groups')
        assert len(service.connections) == 0

    @pytest.mark.asyncio
    async def test_register_connection(self, service, mock_websocket, sample_connection_info):
        """Test WebSocket connection registration"""
        connection_id = sample_connection_info['connection_id']
        
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        assert connection_id in service.connections
        assert service.connections[connection_id]['websocket'] == mock_websocket
        assert service.connections[connection_id]['user_id'] == sample_connection_info['user_id']

    @pytest.mark.asyncio
    async def test_unregister_connection(self, service, mock_websocket, sample_connection_info):
        """Test WebSocket connection unregistration"""
        connection_id = sample_connection_info['connection_id']
        
        # First register the connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        # Then unregister it
        await service.unregister_connection(connection_id)
        
        assert connection_id not in service.connections

    @pytest.mark.asyncio
    async def test_send_message_to_connection(self, service, mock_websocket, sample_connection_info, sample_message):
        """Test sending message to specific connection"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        # Send message
        result = await service.send_message_to_connection(connection_id, sample_message)
        
        assert result is True
        mock_websocket.send.assert_called_once()
        
        # Verify message format
        sent_data = mock_websocket.send.call_args[0][0]
        sent_message = json.loads(sent_data)
        assert sent_message['type'] == sample_message['type']

    @pytest.mark.asyncio
    async def test_send_message_to_nonexistent_connection(self, service, sample_message):
        """Test sending message to non-existent connection"""
        result = await service.send_message_to_connection('nonexistent_conn', sample_message)
        
        assert result is False

    @pytest.mark.asyncio
    async def test_send_message_to_closed_connection(self, service, mock_websocket, sample_connection_info, sample_message):
        """Test sending message to closed connection"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        # Mock connection as closed
        mock_websocket.send.side_effect = ConnectionClosed(None, None)
        
        result = await service.send_message_to_connection(connection_id, sample_message)
        
        assert result is False
        # Connection should be automatically unregistered
        assert connection_id not in service.connections

    @pytest.mark.asyncio
    async def test_broadcast_to_generation(self, service, sample_message):
        """Test broadcasting message to all connections for a generation"""
        generation_id = 'gen_123'
        
        # Create multiple mock connections for the same generation
        connections = []
        for i in range(3):
            mock_ws = AsyncMock()
            mock_ws.closed = False
            connection_id = f'conn_{i}'
            
            await service.register_connection(
                connection_id=connection_id,
                websocket=mock_ws,
                user_id=f'user_{i}',
                project_id='proj_123',
                generation_id=generation_id
            )
            connections.append((connection_id, mock_ws))
        
        # Broadcast message
        result = await service.broadcast_to_generation(generation_id, sample_message)
        
        assert result == 3  # Should return number of successful sends
        
        # Verify all connections received the message
        for _, mock_ws in connections:
            mock_ws.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_broadcast_to_user(self, service, sample_message):
        """Test broadcasting message to all connections for a user"""
        user_id = 'user_123'
        
        # Create multiple connections for the same user
        connections = []
        for i in range(2):
            mock_ws = AsyncMock()
            mock_ws.closed = False
            connection_id = f'conn_{i}'
            
            await service.register_connection(
                connection_id=connection_id,
                websocket=mock_ws,
                user_id=user_id,
                project_id=f'proj_{i}',
                generation_id=f'gen_{i}'
            )
            connections.append((connection_id, mock_ws))
        
        # Broadcast message
        result = await service.broadcast_to_user(user_id, sample_message)
        
        assert result == 2
        
        # Verify all user connections received the message
        for _, mock_ws in connections:
            mock_ws.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_connections_by_generation(self, service, mock_websocket, sample_connection_info):
        """Test retrieving connections by generation ID"""
        generation_id = sample_connection_info['generation_id']
        
        # Register connection
        await service.register_connection(
            connection_id=sample_connection_info['connection_id'],
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=generation_id
        )
        
        connections = service.get_connections_by_generation(generation_id)
        
        assert len(connections) == 1
        assert connections[0]['connection_id'] == sample_connection_info['connection_id']

    @pytest.mark.asyncio
    async def test_get_connections_by_user(self, service, mock_websocket, sample_connection_info):
        """Test retrieving connections by user ID"""
        user_id = sample_connection_info['user_id']
        
        # Register connection
        await service.register_connection(
            connection_id=sample_connection_info['connection_id'],
            websocket=mock_websocket,
            user_id=user_id,
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        connections = service.get_connections_by_user(user_id)
        
        assert len(connections) == 1
        assert connections[0]['user_id'] == user_id

    def test_get_connection_stats(self, service):
        """Test getting connection statistics"""
        stats = service.get_connection_stats()
        
        assert 'total_connections' in stats
        assert 'connections_by_user' in stats
        assert 'connections_by_generation' in stats
        assert stats['total_connections'] == 0

    @pytest.mark.asyncio
    async def test_handle_websocket_message(self, service, mock_websocket, sample_connection_info):
        """Test handling incoming WebSocket messages"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        # Mock incoming message
        incoming_message = {
            'action': 'start_generation',
            'parameters': {
                'platform': 'arduino',
                'complexity': 'beginner'
            }
        }
        
        with patch.object(service, '_process_client_message') as mock_process:
            await service.handle_websocket_message(connection_id, incoming_message)
            mock_process.assert_called_once_with(connection_id, incoming_message)

    @pytest.mark.asyncio
    async def test_process_client_message_start_generation(self, service, mock_websocket, sample_connection_info):
        """Test processing start generation message from client"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        message = {
            'action': 'start_generation',
            'parameters': {
                'platform': 'arduino',
                'complexity': 'beginner'
            }
        }
        
        with patch('backend.services.code_generation_service.CodeGenerationService') as mock_gen_service:
            mock_gen_service.return_value.start_generation = AsyncMock()
            
            await service._process_client_message(connection_id, message)
            
            mock_gen_service.return_value.start_generation.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_client_message_cancel_generation(self, service, mock_websocket, sample_connection_info):
        """Test processing cancel generation message from client"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        message = {'action': 'cancel_generation'}
        
        with patch('backend.services.code_generation_service.CodeGenerationService') as mock_gen_service:
            mock_gen_service.return_value.cancel_generation = AsyncMock()
            
            await service._process_client_message(connection_id, message)
            
            mock_gen_service.return_value.cancel_generation.assert_called_once()

    @pytest.mark.asyncio
    async def test_connection_heartbeat(self, service, mock_websocket, sample_connection_info):
        """Test connection heartbeat mechanism"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        # Send heartbeat
        await service.send_heartbeat(connection_id)
        
        mock_websocket.send.assert_called_once()
        sent_data = mock_websocket.send.call_args[0][0]
        sent_message = json.loads(sent_data)
        assert sent_message['type'] == 'heartbeat'

    @pytest.mark.asyncio
    async def test_cleanup_stale_connections(self, service):
        """Test cleanup of stale connections"""
        # Create mock stale connections
        stale_connections = []
        for i in range(3):
            mock_ws = AsyncMock()
            mock_ws.closed = True  # Mark as closed
            connection_id = f'stale_conn_{i}'
            
            # Manually add to connections (simulating stale state)
            service.connections[connection_id] = {
                'websocket': mock_ws,
                'user_id': f'user_{i}',
                'project_id': f'proj_{i}',
                'generation_id': f'gen_{i}',
                'connected_at': datetime.now(timezone.utc)
            }
            stale_connections.append(connection_id)
        
        # Cleanup stale connections
        cleaned_count = await service.cleanup_stale_connections()
        
        assert cleaned_count == 3
        for conn_id in stale_connections:
            assert conn_id not in service.connections

    @pytest.mark.asyncio
    async def test_connection_timeout_handling(self, service, mock_websocket, sample_connection_info):
        """Test handling of connection timeouts"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        # Simulate timeout
        mock_websocket.send.side_effect = asyncio.TimeoutError()
        
        result = await service.send_message_to_connection(connection_id, {'type': 'test'})
        
        assert result is False
        # Connection should be removed after timeout
        assert connection_id not in service.connections

    @pytest.mark.asyncio
    async def test_message_queuing_for_slow_connections(self, service, mock_websocket, sample_connection_info):
        """Test message queuing for slow connections"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        # Enable message queuing
        service.enable_message_queuing(connection_id)
        
        # Send multiple messages quickly
        messages = [{'type': 'test', 'data': f'message_{i}'} for i in range(5)]
        
        for message in messages:
            await service.send_message_to_connection(connection_id, message)
        
        # Process queued messages
        await service.process_message_queue(connection_id)
        
        # Should have sent all messages
        assert mock_websocket.send.call_count == 5

    @pytest.mark.asyncio
    async def test_connection_rate_limiting(self, service):
        """Test connection rate limiting"""
        user_id = 'user_123'
        
        # Try to create many connections quickly
        connections_created = 0
        for i in range(20):  # Try to create more than limit
            mock_ws = AsyncMock()
            try:
                await service.register_connection(
                    connection_id=f'conn_{i}',
                    websocket=mock_ws,
                    user_id=user_id,
                    project_id=f'proj_{i}',
                    generation_id=f'gen_{i}'
                )
                connections_created += 1
            except Exception:
                break  # Rate limit hit
        
        # Should be limited to reasonable number
        assert connections_created <= service.max_connections_per_user

    @pytest.mark.asyncio
    async def test_message_compression(self, service, mock_websocket, sample_connection_info):
        """Test message compression for large messages"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        # Create large message
        large_message = {
            'type': 'file_generated',
            'data': {
                'file_name': 'large_file.txt',
                'content': 'x' * 10000  # 10KB content
            }
        }
        
        await service.send_message_to_connection(connection_id, large_message, compress=True)
        
        mock_websocket.send.assert_called_once()
        # Verify compression was applied (message should be smaller)
        sent_data = mock_websocket.send.call_args[0][0]
        assert len(sent_data) < len(json.dumps(large_message))

    @pytest.mark.asyncio
    async def test_connection_authentication(self, service, mock_websocket):
        """Test connection authentication"""
        connection_id = 'conn_123'
        
        # Try to register without proper authentication
        with pytest.raises(ValueError, match="Authentication required"):
            await service.register_connection(
                connection_id=connection_id,
                websocket=mock_websocket,
                user_id=None,  # No user ID
                project_id='proj_123',
                generation_id='gen_123'
            )

    @pytest.mark.asyncio
    async def test_concurrent_message_sending(self, service, sample_connection_info):
        """Test concurrent message sending to multiple connections"""
        # Create multiple connections
        connections = []
        for i in range(10):
            mock_ws = AsyncMock()
            mock_ws.closed = False
            connection_id = f'conn_{i}'
            
            await service.register_connection(
                connection_id=connection_id,
                websocket=mock_ws,
                user_id=f'user_{i}',
                project_id='proj_123',
                generation_id='gen_123'
            )
            connections.append((connection_id, mock_ws))
        
        # Send messages concurrently
        message = {'type': 'test', 'data': 'concurrent_test'}
        tasks = [
            service.send_message_to_connection(conn_id, message)
            for conn_id, _ in connections
        ]
        
        results = await asyncio.gather(*tasks)
        
        # All sends should succeed
        assert all(results)
        
        # All connections should have received the message
        for _, mock_ws in connections:
            mock_ws.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_connection_metadata_tracking(self, service, mock_websocket, sample_connection_info):
        """Test tracking of connection metadata"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection with metadata
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id'],
            metadata={'client_version': '1.0.0', 'platform': 'web'}
        )
        
        # Verify metadata is stored
        connection_info = service.get_connection_info(connection_id)
        assert connection_info['metadata']['client_version'] == '1.0.0'
        assert connection_info['metadata']['platform'] == 'web'

    @pytest.mark.asyncio
    async def test_error_recovery_and_reconnection(self, service, mock_websocket, sample_connection_info):
        """Test error recovery and reconnection handling"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        # Simulate connection error
        mock_websocket.send.side_effect = WebSocketException("Connection error")
        
        # Try to send message (should handle error gracefully)
        result = await service.send_message_to_connection(connection_id, {'type': 'test'})
        
        assert result is False
        assert connection_id not in service.connections  # Should be cleaned up

    def test_service_shutdown_cleanup(self, service):
        """Test proper cleanup during service shutdown"""
        # Add some mock connections
        for i in range(3):
            mock_ws = AsyncMock()
            service.connections[f'conn_{i}'] = {
                'websocket': mock_ws,
                'user_id': f'user_{i}',
                'project_id': f'proj_{i}',
                'generation_id': f'gen_{i}',
                'connected_at': datetime.now(timezone.utc)
            }
        
        # Shutdown service
        service.shutdown()
        
        # All connections should be cleaned up
        assert len(service.connections) == 0

    @pytest.mark.asyncio
    async def test_message_filtering_and_routing(self, service, mock_websocket, sample_connection_info):
        """Test message filtering and routing based on connection properties"""
        connection_id = sample_connection_info['connection_id']
        
        # Register connection
        await service.register_connection(
            connection_id=connection_id,
            websocket=mock_websocket,
            user_id=sample_connection_info['user_id'],
            project_id=sample_connection_info['project_id'],
            generation_id=sample_connection_info['generation_id']
        )
        
        # Send message with routing filter
        message = {'type': 'progress_update', 'data': {'progress': 50}}
        filter_criteria = {'generation_id': sample_connection_info['generation_id']}
        
        result = await service.send_filtered_message(message, filter_criteria)
        
        assert result == 1  # Should match one connection
        mock_websocket.send.assert_called_once()


if __name__ == '__main__':
    pytest.main([__file__])