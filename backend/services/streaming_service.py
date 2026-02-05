# Streaming Service for Real-time Code Generation
# Requirements: 1.2, 2.1
# Task: 2.3 Implement WebSocket endpoints for real-time streaming

import logging
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, Set, Optional, Any, List
from enum import Enum

from fastapi import WebSocket, WebSocketDisconnect
from websockets.exceptions import ConnectionClosed

from services.code_generation_service import (
    VeronicaAIService, GenerationParams, Platform, ComplexityLevel
)
from services.project_context_service import ProjectContextService
from database.connection import get_db_client

logger = logging.getLogger(__name__)


class StreamingEventType(Enum):
    """Types of streaming events"""
    STATUS_UPDATE = "status_update"
    FILE_GENERATED = "file_generated"
    PROGRESS_UPDATE = "progress_update"
    ERROR = "error"
    COMPLETION = "completion"
    CONNECTION_ACK = "connection_ack"


class ConnectionStatus(Enum):
    """WebSocket connection status"""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    GENERATING = "generating"
    COMPLETED = "completed"
    ERROR = "error"
    DISCONNECTED = "disconnected"


class StreamingConnection:
    """Represents a WebSocket connection for code generation streaming"""
    
    def __init__(
        self,
        websocket: WebSocket,
        connection_id: str,
        user_id: str,
        project_id: str,
        generation_id: Optional[str] = None
    ):
        self.websocket = websocket
        self.connection_id = connection_id
        self.user_id = user_id
        self.project_id = project_id
        self.generation_id = generation_id
        self.status = ConnectionStatus.CONNECTING
        self.connected_at = datetime.now(timezone.utc)
        self.last_activity = self.connected_at
        self.generation_task: Optional[asyncio.Task] = None
    
    async def send_event(self, event_type: StreamingEventType, data: Any) -> bool:
        """
        Send an event to the WebSocket client
        
        Args:
            event_type: Type of event to send
            data: Event data
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            message = {
                "type": event_type.value,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "connection_id": self.connection_id,
                "data": data
            }
            
            await self.websocket.send_text(json.dumps(message))
            self.last_activity = datetime.now(timezone.utc)
            return True
            
        except (WebSocketDisconnect, ConnectionClosed) as e:
            logger.warning(f"WebSocket disconnected for connection {self.connection_id}: {e}")
            self.status = ConnectionStatus.DISCONNECTED
            return False
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")
            return False
    
    async def close(self, code: int = 1000, reason: str = "Normal closure"):
        """
        Close the WebSocket connection
        
        Args:
            code: WebSocket close code
            reason: Reason for closing
        """
        try:
            if self.generation_task and not self.generation_task.done():
                self.generation_task.cancel()
            
            await self.websocket.close(code=code, reason=reason)
            self.status = ConnectionStatus.DISCONNECTED
            logger.info(f"Closed WebSocket connection {self.connection_id}: {reason}")
            
        except Exception as e:
            logger.error(f"Error closing WebSocket connection: {e}")


class StreamingService:
    """
    Service for managing WebSocket connections and streaming code generation
    """
    
    def __init__(self):
        """Initialize the streaming service"""
        self.connections: Dict[str, StreamingConnection] = {}
        self.user_connections: Dict[str, Set[str]] = {}  # user_id -> set of connection_ids
        self.generation_connections: Dict[str, str] = {}  # generation_id -> connection_id
        
        self.code_generation_service = VeronicaAIService()
        self.project_context_service = ProjectContextService()
        
        # Configuration
        self.max_connections_per_user = 5
        self.connection_timeout = 300  # 5 minutes
        self.heartbeat_interval = 30  # 30 seconds
        
        # Start background tasks
        self._cleanup_task = None
        self._heartbeat_task = None
    
    async def connect_websocket(
        self,
        websocket: WebSocket,
        user_id: str,
        project_id: str,
        generation_id: Optional[str] = None
    ) -> Optional[StreamingConnection]:
        """
        Accept and manage a new WebSocket connection
        
        Args:
            websocket: WebSocket connection
            user_id: ID of the user
            project_id: ID of the project
            generation_id: Optional ID of existing generation
            
        Returns:
            StreamingConnection object or None if connection failed
        """
        try:
            # Check connection limits
            user_connection_count = len(self.user_connections.get(user_id, set()))
            if user_connection_count >= self.max_connections_per_user:
                await websocket.close(code=1008, reason="Too many connections")
                logger.warning(f"Connection limit exceeded for user {user_id}")
                return None
            
            # Accept the WebSocket connection
            await websocket.accept()
            
            # Create connection object
            connection_id = f"{user_id}_{project_id}_{datetime.now().timestamp()}"
            connection = StreamingConnection(
                websocket=websocket,
                connection_id=connection_id,
                user_id=user_id,
                project_id=project_id,
                generation_id=generation_id
            )
            
            # Store connection
            self.connections[connection_id] = connection
            
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(connection_id)
            
            if generation_id:
                self.generation_connections[generation_id] = connection_id
            
            connection.status = ConnectionStatus.CONNECTED
            
            # Send connection acknowledgment
            await connection.send_event(StreamingEventType.CONNECTION_ACK, {
                "connection_id": connection_id,
                "user_id": user_id,
                "project_id": project_id,
                "generation_id": generation_id,
                "status": "connected"
            })
            
            logger.info(f"WebSocket connected: {connection_id}")
            
            # Start background tasks if not already running
            if not self._cleanup_task:
                self._cleanup_task = asyncio.create_task(self._cleanup_connections())
            if not self._heartbeat_task:
                self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            
            return connection
            
        except Exception as e:
            logger.error(f"Error connecting WebSocket: {e}")
            try:
                await websocket.close(code=1011, reason="Internal server error")
            except:
                pass
            return None
    
    async def disconnect_websocket(self, connection_id: str) -> None:
        """
        Disconnect and clean up a WebSocket connection
        
        Args:
            connection_id: ID of the connection to disconnect
        """
        try:
            connection = self.connections.get(connection_id)
            if not connection:
                return
            
            # Cancel any ongoing generation
            if connection.generation_task and not connection.generation_task.done():
                connection.generation_task.cancel()
            
            # Remove from tracking
            self.connections.pop(connection_id, None)
            
            if connection.user_id in self.user_connections:
                self.user_connections[connection.user_id].discard(connection_id)
                if not self.user_connections[connection.user_id]:
                    del self.user_connections[connection.user_id]
            
            if connection.generation_id in self.generation_connections:
                del self.generation_connections[connection.generation_id]
            
            # Close the WebSocket
            await connection.close()
            
            logger.info(f"WebSocket disconnected: {connection_id}")
            
        except Exception as e:
            logger.error(f"Error disconnecting WebSocket: {e}")
    
    async def start_code_generation_stream(
        self,
        connection_id: str,
        generation_params: Dict[str, Any]
    ) -> bool:
        """
        Start streaming code generation for a connection
        
        Args:
            connection_id: ID of the WebSocket connection
            generation_params: Parameters for code generation
            
        Returns:
            True if generation started successfully, False otherwise
        """
        try:
            connection = self.connections.get(connection_id)
            if not connection:
                logger.error(f"Connection {connection_id} not found")
                return False
            
            if connection.status == ConnectionStatus.GENERATING:
                await connection.send_event(StreamingEventType.ERROR, {
                    "message": "Code generation already in progress"
                })
                return False
            
            # Get project context
            project_context = await self.project_context_service.getProjectContext(
                connection.project_id
            )
            
            if not project_context:
                await connection.send_event(StreamingEventType.ERROR, {
                    "message": "Project not found or inaccessible"
                })
                return False
            
            # Parse generation parameters
            try:
                params = GenerationParams(
                    platform=Platform(generation_params.get("platform", "web")),
                    complexity_level=ComplexityLevel(generation_params.get("complexity_level", "intermediate")),
                    include_comments=generation_params.get("include_comments", True),
                    include_tests=generation_params.get("include_tests", False),
                    custom_requirements=generation_params.get("custom_requirements")
                )
            except ValueError as e:
                await connection.send_event(StreamingEventType.ERROR, {
                    "message": f"Invalid generation parameters: {e}"
                })
                return False
            
            # Start generation task
            connection.status = ConnectionStatus.GENERATING
            connection.generation_task = asyncio.create_task(
                self._stream_generation(connection, project_context, params)
            )
            
            logger.info(f"Started code generation stream for connection {connection_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error starting code generation stream: {e}")
            if connection_id in self.connections:
                await self.connections[connection_id].send_event(StreamingEventType.ERROR, {
                    "message": f"Failed to start code generation: {str(e)}"
                })
            return False
    
    async def _stream_generation(
        self,
        connection: StreamingConnection,
        project_context,
        params: GenerationParams
    ) -> None:
        """
        Stream code generation progress to WebSocket client
        
        Args:
            connection: WebSocket connection
            project_context: Project context for generation
            params: Generation parameters
        """
        try:
            await connection.send_event(StreamingEventType.STATUS_UPDATE, {
                "status": "starting",
                "message": "Initializing code generation..."
            })
            
            file_count = 0
            total_files_estimate = 3  # Default estimate
            
            # Stream generation progress
            async for status_message, code_file in self.code_generation_service.generate_code(
                project_context, params, connection.user_id
            ):
                # Send status update
                await connection.send_event(StreamingEventType.STATUS_UPDATE, {
                    "status": "generating",
                    "message": status_message,
                    "progress": min((file_count / total_files_estimate) * 100, 95)
                })
                
                # Send file generated event if a file was created
                if code_file:
                    file_count += 1
                    await connection.send_event(StreamingEventType.FILE_GENERATED, {
                        "file_name": code_file.file_name,
                        "file_path": code_file.file_path,
                        "file_type": code_file.file_type,
                        "size_bytes": code_file.size_bytes,
                        "is_main_file": code_file.is_main_file,
                        "description": code_file.description,
                        "content_preview": code_file.content[:200] + "..." if len(code_file.content) > 200 else code_file.content
                    })
                
                # Update progress
                if file_count > 0:
                    await connection.send_event(StreamingEventType.PROGRESS_UPDATE, {
                        "files_generated": file_count,
                        "estimated_total": max(total_files_estimate, file_count),
                        "progress_percentage": min((file_count / max(total_files_estimate, file_count)) * 100, 95)
                    })
            
            # Send completion event
            connection.status = ConnectionStatus.COMPLETED
            await connection.send_event(StreamingEventType.COMPLETION, {
                "status": "completed",
                "message": "Code generation completed successfully!",
                "files_generated": file_count,
                "progress": 100
            })
            
        except asyncio.CancelledError:
            logger.info(f"Code generation cancelled for connection {connection.connection_id}")
            await connection.send_event(StreamingEventType.STATUS_UPDATE, {
                "status": "cancelled",
                "message": "Code generation was cancelled"
            })
        except Exception as e:
            logger.error(f"Error during code generation streaming: {e}")
            connection.status = ConnectionStatus.ERROR
            await connection.send_event(StreamingEventType.ERROR, {
                "status": "error",
                "message": f"Code generation failed: {str(e)}"
            })
    
    async def cancel_generation(self, connection_id: str) -> bool:
        """
        Cancel ongoing code generation for a connection
        
        Args:
            connection_id: ID of the connection
            
        Returns:
            True if cancellation successful, False otherwise
        """
        try:
            connection = self.connections.get(connection_id)
            if not connection:
                return False
            
            if connection.generation_task and not connection.generation_task.done():
                connection.generation_task.cancel()
                connection.status = ConnectionStatus.CONNECTED
                
                await connection.send_event(StreamingEventType.STATUS_UPDATE, {
                    "status": "cancelled",
                    "message": "Code generation cancelled by user"
                })
                
                logger.info(f"Cancelled code generation for connection {connection_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error cancelling generation: {e}")
            return False
    
    async def get_connection_status(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """
        Get status information for a connection
        
        Args:
            connection_id: ID of the connection
            
        Returns:
            Connection status information or None if not found
        """
        try:
            connection = self.connections.get(connection_id)
            if not connection:
                return None
            
            return {
                "connection_id": connection_id,
                "user_id": connection.user_id,
                "project_id": connection.project_id,
                "generation_id": connection.generation_id,
                "status": connection.status.value,
                "connected_at": connection.connected_at.isoformat(),
                "last_activity": connection.last_activity.isoformat(),
                "is_generating": connection.generation_task is not None and not connection.generation_task.done()
            }
            
        except Exception as e:
            logger.error(f"Error getting connection status: {e}")
            return None
    
    async def broadcast_to_user(self, user_id: str, event_type: StreamingEventType, data: Any) -> int:
        """
        Broadcast an event to all connections for a user
        
        Args:
            user_id: ID of the user
            event_type: Type of event to broadcast
            data: Event data
            
        Returns:
            Number of connections that received the broadcast
        """
        try:
            user_connection_ids = self.user_connections.get(user_id, set())
            sent_count = 0
            
            for connection_id in user_connection_ids.copy():  # Copy to avoid modification during iteration
                connection = self.connections.get(connection_id)
                if connection:
                    if await connection.send_event(event_type, data):
                        sent_count += 1
                    else:
                        # Connection failed, clean it up
                        await self.disconnect_websocket(connection_id)
            
            return sent_count
            
        except Exception as e:
            logger.error(f"Error broadcasting to user {user_id}: {e}")
            return 0
    
    async def _cleanup_connections(self) -> None:
        """
        Background task to clean up stale connections
        """
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                current_time = datetime.now(timezone.utc)
                stale_connections = []
                
                for connection_id, connection in self.connections.items():
                    # Check for timeout
                    time_since_activity = (current_time - connection.last_activity).total_seconds()
                    
                    if time_since_activity > self.connection_timeout:
                        stale_connections.append(connection_id)
                
                # Clean up stale connections
                for connection_id in stale_connections:
                    logger.info(f"Cleaning up stale connection: {connection_id}")
                    await self.disconnect_websocket(connection_id)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in connection cleanup: {e}")
    
    async def _heartbeat_loop(self) -> None:
        """
        Background task to send heartbeat messages
        """
        while True:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                
                # Send heartbeat to all active connections
                for connection_id, connection in self.connections.items():
                    if connection.status in [ConnectionStatus.CONNECTED, ConnectionStatus.GENERATING]:
                        await connection.send_event(StreamingEventType.STATUS_UPDATE, {
                            "type": "heartbeat",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}")
    
    async def get_service_stats(self) -> Dict[str, Any]:
        """
        Get service statistics for monitoring
        
        Returns:
            Dictionary with service statistics
        """
        try:
            active_connections = len(self.connections)
            generating_connections = sum(
                1 for conn in self.connections.values()
                if conn.status == ConnectionStatus.GENERATING
            )
            
            user_count = len(self.user_connections)
            
            return {
                "active_connections": active_connections,
                "generating_connections": generating_connections,
                "connected_users": user_count,
                "total_generations": len(self.generation_connections),
                "service_uptime": datetime.now(timezone.utc).isoformat(),
                "connection_limit_per_user": self.max_connections_per_user,
                "connection_timeout": self.connection_timeout
            }
            
        except Exception as e:
            logger.error(f"Error getting service stats: {e}")
            return {"error": str(e)}
    
    async def shutdown(self) -> None:
        """
        Gracefully shutdown the streaming service
        """
        try:
            logger.info("Shutting down streaming service...")
            
            # Cancel background tasks
            if self._cleanup_task:
                self._cleanup_task.cancel()
            if self._heartbeat_task:
                self._heartbeat_task.cancel()
            
            # Close all connections
            for connection_id in list(self.connections.keys()):
                await self.disconnect_websocket(connection_id)
            
            logger.info("Streaming service shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during streaming service shutdown: {e}")


# Global streaming service instance
streaming_service = StreamingService()


async def get_streaming_service() -> StreamingService:
    """
    Get the global streaming service instance
    
    Returns:
        StreamingService instance
    """
    return streaming_service