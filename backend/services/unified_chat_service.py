"""
Unified Chat Service
Consolidates all chat functionality into a single, cohesive service.

This service manages chat sessions across all contexts (PROJECT, UNIVERSAL, CODE_GENERATION),
handles message storage and retrieval, detects user intents, and maintains conversation context.

Requirements: 1.1, 8.1, 8.2, 8.7, 9.6
"""

import logging
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone

from backend.infrastructure.base_service import BaseService
from backend.infrastructure.redis_client import RedisClient
from backend.infrastructure.db_pool import DatabaseConnectionPool
from backend.models.unified_chat import (
    ChatSession,
    ChatMessage,
    ChatContext,
    MessageSender,
    IntentType,
    IntentDetectionResult,
    ConversationContext,
    CreateSessionRequest,
    SendMessageRequest,
)

logger = logging.getLogger(__name__)


class UnifiedChatService(BaseService[ChatSession]):
    """
    Unified chat service consolidating all chat functionality.
    
    Provides:
    - Chat session management across all contexts
    - Message storage and retrieval
    - Intent detection from user messages
    - Conversation context for AI continuity
    - Session lifecycle management (active/archived)
    - Caching for active sessions (30 min TTL)
    
    Requirements:
    - 1.1: Consolidate chat services functionality
    - 8.1: Support creating chat sessions with different contexts
    - 8.2: Store session metadata and assign unique session IDs
    - 8.7: Archive sessions while preserving message history
    - 9.6: Cache active sessions and chat history (30 min TTL)
    """
    
    # Cache TTL constants
    SESSION_CACHE_TTL = timedelta(minutes=30)
    HISTORY_CACHE_TTL = timedelta(minutes=30)
    CONTEXT_CACHE_TTL = timedelta(minutes=30)
    
    def __init__(
        self,
        cache: Optional[RedisClient] = None,
        logger_instance: Optional[logging.Logger] = None,
        db_client: Optional[DatabaseConnectionPool] = None
    ):
        """
        Initialize unified chat service.
        
        Args:
            cache: Redis client for caching operations
            logger_instance: Logger instance for structured logging
            db_client: Database connection pool for data access
        """
        super().__init__(cache, logger_instance, db_client)
        self.logger.info("UnifiedChatService initialized")
    
    async def create_session(
        self,
        user_id: str,
        context: ChatContext,
        context_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ChatSession:
        """
        Create a new chat session with context.
        
        Creates a new chat session in the database and caches it for quick access.
        Sessions are created with a unique session_id and stored with metadata.
        
        Args:
            user_id: ID of the user creating the session
            context: Chat context type (PROJECT, UNIVERSAL, CODE_GENERATION)
            context_id: Optional ID of related context (e.g., project_id)
            metadata: Optional additional metadata for the session
        
        Returns:
            ChatSession: The created chat session
        
        Raises:
            ValueError: If context requires context_id but none provided
            RuntimeError: If database operation fails
        
        Requirements:
        - 8.1: Support creating chat sessions with different contexts
        - 8.2: Assign unique session ID and store session metadata
        - 9.6: Cache active sessions with 30 min TTL
        """
        self.logger.info(
            f"Creating chat session for user {user_id} with context {context.value}"
        )
        
        # Validate context_id requirement
        if context in [ChatContext.PROJECT, ChatContext.CODE_GENERATION]:
            if not context_id:
                raise ValueError(
                    f"context_id is required for {context.value} context"
                )
        
        # Create session object
        session = ChatSession(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
            context=context,
            context_id=context_id,
            title=f"New {context.value.replace('_', ' ').title()} Chat",
            metadata=metadata or {},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            last_activity=datetime.now(timezone.utc),
            message_count=0,
            is_active=True
        )
        
        # Store in database
        if not self.db:
            raise RuntimeError("Database client not configured")
        
        try:
            async with self.db.acquire() as conn:
                # Insert session into universal_chat_sessions table
                await conn.execute(
                    """
                    INSERT INTO universal_chat_sessions (
                        id, session_id, user_id, title, message_count,
                        last_message_at, session_metadata, is_active,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    """,
                    uuid.UUID(session.session_id) if len(session.session_id) == 36 else uuid.uuid4(),
                    session.session_id,
                    uuid.UUID(user_id) if len(user_id) == 36 else None,
                    session.title,
                    session.message_count,
                    session.last_activity,
                    {
                        "context": session.context.value,
                        "context_id": session.context_id,
                        **session.metadata
                    },
                    session.is_active,
                    session.created_at,
                    session.updated_at
                )
            
            self.logger.info(f"Created session {session.session_id} in database")
            
        except Exception as e:
            self.logger.error(f"Failed to create session in database: {e}")
            raise RuntimeError(f"Failed to create session: {e}") from e
        
        # Cache the session (use model_dump for Pydantic v2 compatibility)
        cache_key = f"session:{session.session_id}"
        try:
            # Try Pydantic v2 method first
            session_data = session.model_dump(mode='json')
        except AttributeError:
            # Fall back to Pydantic v1 method
            session_data = session.dict()
        
        await self.set_cache(
            cache_key,
            session_data,
            ttl=self.SESSION_CACHE_TTL
        )
        
        self.logger.info(
            f"Successfully created and cached session {session.session_id}"
        )
        
        return session
    
    async def get_session(self, session_id: str) -> Optional[ChatSession]:
        """
        Get a chat session by ID.
        
        Retrieves session from cache if available, otherwise fetches from database.
        
        Args:
            session_id: ID of the session to retrieve
        
        Returns:
            ChatSession if found, None otherwise
        
        Requirements:
        - 9.6: Cache active sessions with 30 min TTL
        """
        cache_key = f"session:{session_id}"
        
        # Try cache first
        cached_data = await self.get_cache(cache_key)
        if cached_data:
            self.logger.debug(f"Session {session_id} found in cache")
            return ChatSession(**cached_data)
        
        # Fetch from database
        if not self.db:
            return None
        
        try:
            async with self.db.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT session_id, user_id, title, message_count,
                           last_message_at, session_metadata, is_active,
                           created_at, updated_at
                    FROM universal_chat_sessions
                    WHERE session_id = $1
                    """,
                    session_id
                )
                
                if not row:
                    self.logger.debug(f"Session {session_id} not found in database")
                    return None
                
                # Extract context from metadata
                metadata = row['session_metadata'] or {}
                context_str = metadata.pop('context', 'universal')
                context_id = metadata.pop('context_id', None)
                
                session = ChatSession(
                    session_id=row['session_id'],
                    user_id=str(row['user_id']),
                    context=ChatContext(context_str),
                    context_id=context_id,
                    title=row['title'],
                    metadata=metadata,
                    created_at=row['created_at'],
                    updated_at=row['updated_at'],
                    last_activity=row['last_message_at'] or row['updated_at'],
                    message_count=row['message_count'],
                    is_active=row['is_active']
                )
                
                # Cache the session (use model_dump for Pydantic v2 compatibility)
                try:
                    # Try Pydantic v2 method first
                    session_data = session.model_dump(mode='json')
                except AttributeError:
                    # Fall back to Pydantic v1 method
                    session_data = session.dict()
                
                await self.set_cache(
                    cache_key,
                    session_data,
                    ttl=self.SESSION_CACHE_TTL
                )
                
                self.logger.debug(f"Session {session_id} fetched from database and cached")
                return session
                
        except Exception as e:
            self.logger.error(f"Failed to fetch session {session_id}: {e}")
            return None
    
    async def send_message(
        self,
        session_id: str,
        content: str,
        sender: MessageSender,
        metadata: Optional[Dict[str, Any]] = None,
        voice_transcript: Optional[str] = None,
        voice_duration: Optional[float] = None,
        voice_confidence: Optional[float] = None
    ) -> ChatMessage:
        """
        Send a message in a chat session.
        
        Stores the message in the database with timestamps and metadata.
        Supports voice transcription metadata (duration, confidence).
        Increments session message count and updates last_activity timestamp.
        Invalidates session cache to ensure fresh data.
        
        Args:
            session_id: ID of the session to send message in
            content: Message content text
            sender: Who is sending the message (USER, AI, SYSTEM)
            metadata: Optional additional metadata for the message
            voice_transcript: Optional voice transcription text
            voice_duration: Optional duration of voice message in seconds
            voice_confidence: Optional confidence score of voice transcription (0.0-1.0)
        
        Returns:
            ChatMessage: The created message
        
        Raises:
            ValueError: If session not found or validation fails
            RuntimeError: If database operation fails
        
        Requirements:
        - 8.3: Store messages with sender information, content, and timestamp
        - 8.6: Support voice transcription metadata (duration, confidence)
        """
        self.logger.info(
            f"Sending message in session {session_id} from {sender.value}"
        )
        
        # Validate session exists
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Validate voice metadata consistency
        if voice_duration is not None or voice_confidence is not None:
            if voice_transcript is None:
                raise ValueError(
                    "voice_transcript is required when voice_duration or "
                    "voice_confidence is provided"
                )
        
        # Create message object
        message = ChatMessage(
            message_id=str(uuid.uuid4()),
            session_id=session_id,
            content=content,
            sender=sender,
            metadata=metadata or {},
            voice_transcript=voice_transcript,
            voice_duration=voice_duration,
            voice_confidence=voice_confidence,
            created_at=datetime.now(timezone.utc)
        )
        
        # Store in database
        if not self.db:
            raise RuntimeError("Database client not configured")
        
        try:
            async with self.db.acquire() as conn:
                # Map MessageSender to database role
                role_mapping = {
                    MessageSender.USER: 'user',
                    MessageSender.AI: 'assistant',
                    MessageSender.SYSTEM: 'assistant'  # System messages stored as assistant
                }
                role = role_mapping.get(sender, 'user')
                
                # Determine message type
                message_type = 'voice' if voice_transcript else 'text'
                
                # Prepare response metadata
                response_metadata = metadata.copy() if metadata else {}
                if sender == MessageSender.AI:
                    response_metadata['sender_type'] = 'ai'
                elif sender == MessageSender.SYSTEM:
                    response_metadata['sender_type'] = 'system'
                
                # Insert message into universal_chat_messages table
                await conn.execute(
                    """
                    INSERT INTO universal_chat_messages (
                        id, user_id, session_id, role, content, message_type,
                        voice_transcript, voice_duration, voice_confidence,
                        response_metadata, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    """,
                    uuid.UUID(message.message_id) if len(message.message_id) == 36 else uuid.uuid4(),
                    uuid.UUID(session.user_id) if len(session.user_id) == 36 else None,
                    session_id,
                    role,
                    content,
                    message_type,
                    voice_transcript,
                    voice_duration,
                    voice_confidence,
                    response_metadata,
                    message.created_at,
                    message.created_at
                )
                
                self.logger.info(
                    f"Stored message {message.message_id} in database"
                )
                
                # Update session: increment message count and update last_activity
                # Note: The database trigger update_session_on_new_message will handle
                # updating the universal_chat_sessions table automatically, but we
                # also update it explicitly here for consistency
                await conn.execute(
                    """
                    UPDATE universal_chat_sessions
                    SET message_count = message_count + 1,
                        last_message_at = $1,
                        updated_at = $2
                    WHERE session_id = $3
                    """,
                    message.created_at,
                    datetime.now(timezone.utc),
                    session_id
                )
                
                self.logger.info(
                    f"Updated session {session_id} message count and last_activity"
                )
                
        except Exception as e:
            self.logger.error(f"Failed to store message in database: {e}")
            raise RuntimeError(f"Failed to send message: {e}") from e
        
        # Invalidate session cache to ensure fresh data
        cache_key = f"session:{session_id}"
        await self.delete_cache(cache_key)
        
        # Also invalidate history cache for this session
        await self.invalidate_cache(f"history:{session_id}:*")
        
        self.logger.info(
            f"Successfully sent message {message.message_id} and invalidated cache"
        )
        
        return message
    
    async def get_history(
        self,
        session_id: str,
        limit: int = 50,
        offset: int = 0,
        include_context: bool = True,
        sender_filter: Optional[MessageSender] = None
    ) -> Dict[str, Any]:
        """
        Get chat history with pagination support.
        
        Retrieves messages from a chat session in chronological order (oldest first).
        Supports pagination, optional context inclusion, and filtering by sender type.
        Caches recent history with 30 minute TTL for performance.
        
        Args:
            session_id: ID of the session to retrieve history for
            limit: Maximum number of messages to return (1-200, default 50)
            offset: Number of messages to skip (default 0)
            include_context: Whether to include session context (default True)
            sender_filter: Optional filter by sender type (USER, AI, SYSTEM)
        
        Returns:
            Dict containing:
                - session_id: The session ID
                - messages: List of ChatMessage objects in chronological order
                - total_count: Total number of messages in the session
                - has_more: Whether there are more messages beyond this page
                - session: Optional session context if include_context=True
        
        Raises:
            ValueError: If session not found or validation fails
            RuntimeError: If database operation fails
        
        Requirements:
        - 8.4: Return messages in chronological order with pagination support
        - 9.6: Cache recent history with 30 min TTL
        """
        self.logger.info(
            f"Retrieving history for session {session_id} "
            f"(limit={limit}, offset={offset}, sender_filter={sender_filter})"
        )
        
        # Validate limit
        if not (1 <= limit <= 200):
            raise ValueError("limit must be between 1 and 200")
        
        if offset < 0:
            raise ValueError("offset must be non-negative")
        
        # Validate session exists
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Build cache key based on parameters
        sender_key = sender_filter.value if sender_filter else "all"
        cache_key = f"history:{session_id}:{limit}:{offset}:{sender_key}"
        
        # Try cache first (only for recent history without filters)
        if offset == 0 and not sender_filter:
            cached_data = await self.get_cache(cache_key)
            if cached_data:
                self.logger.debug(f"History for session {session_id} found in cache")
                # Add session context if requested
                if include_context:
                    try:
                        # Try Pydantic v2 method first
                        cached_data['session'] = session.model_dump(mode='json')
                    except AttributeError:
                        # Fall back to Pydantic v1 method
                        cached_data['session'] = session.dict()
                return cached_data
        
        # Fetch from database
        if not self.db:
            raise RuntimeError("Database client not configured")
        
        try:
            async with self.db.acquire() as conn:
                # Build query with optional sender filter
                base_query = """
                    SELECT id, session_id, role, content, message_type,
                           voice_transcript, voice_duration, voice_confidence,
                           response_metadata, created_at
                    FROM universal_chat_messages
                    WHERE session_id = $1
                """
                
                params = [session_id]
                param_count = 1
                
                # Add sender filter if provided
                if sender_filter:
                    # Map MessageSender to database role
                    role_mapping = {
                        MessageSender.USER: 'user',
                        MessageSender.AI: 'assistant',
                        MessageSender.SYSTEM: 'assistant'
                    }
                    role = role_mapping.get(sender_filter, 'user')
                    
                    param_count += 1
                    base_query += f" AND role = ${param_count}"
                    params.append(role)
                    
                    # For SYSTEM messages, also filter by metadata
                    if sender_filter == MessageSender.SYSTEM:
                        base_query += " AND response_metadata->>'sender_type' = 'system'"
                    elif sender_filter == MessageSender.AI:
                        # AI messages are assistant role but not system
                        base_query += " AND (response_metadata->>'sender_type' IS NULL OR response_metadata->>'sender_type' != 'system')"
                
                # Add ordering and pagination
                base_query += f" ORDER BY created_at ASC LIMIT ${param_count + 1} OFFSET ${param_count + 2}"
                params.extend([limit, offset])
                
                # Execute query
                rows = await conn.fetch(base_query, *params)
                
                # Get total count
                count_query = """
                    SELECT COUNT(*) FROM universal_chat_messages
                    WHERE session_id = $1
                """
                count_params = [session_id]
                
                if sender_filter:
                    role_mapping = {
                        MessageSender.USER: 'user',
                        MessageSender.AI: 'assistant',
                        MessageSender.SYSTEM: 'assistant'
                    }
                    role = role_mapping.get(sender_filter, 'user')
                    count_query += " AND role = $2"
                    count_params.append(role)
                    
                    if sender_filter == MessageSender.SYSTEM:
                        count_query += " AND response_metadata->>'sender_type' = 'system'"
                    elif sender_filter == MessageSender.AI:
                        count_query += " AND (response_metadata->>'sender_type' IS NULL OR response_metadata->>'sender_type' != 'system')"
                
                total_count = await conn.fetchval(count_query, *count_params)
                
                # Convert rows to ChatMessage objects
                messages = []
                for row in rows:
                    # Determine sender from role and metadata
                    role = row['role']
                    metadata = row['response_metadata'] or {}
                    
                    if role == 'user':
                        sender = MessageSender.USER
                    elif metadata.get('sender_type') == 'system':
                        sender = MessageSender.SYSTEM
                    else:
                        sender = MessageSender.AI
                    
                    message = ChatMessage(
                        message_id=str(row['id']),
                        session_id=row['session_id'],
                        content=row['content'],
                        sender=sender,
                        metadata=metadata,
                        voice_transcript=row['voice_transcript'],
                        voice_duration=float(row['voice_duration']) if row['voice_duration'] else None,
                        voice_confidence=float(row['voice_confidence']) if row['voice_confidence'] else None,
                        created_at=row['created_at']
                    )
                    messages.append(message)
                
                self.logger.info(
                    f"Retrieved {len(messages)} messages for session {session_id} "
                    f"(total: {total_count})"
                )
                
        except Exception as e:
            self.logger.error(f"Failed to retrieve history for session {session_id}: {e}")
            raise RuntimeError(f"Failed to retrieve history: {e}") from e
        
        # Build response
        has_more = (offset + len(messages)) < total_count
        
        # Convert messages to dict for caching
        messages_data = []
        for msg in messages:
            try:
                # Try Pydantic v2 method first
                messages_data.append(msg.model_dump(mode='json'))
            except AttributeError:
                # Fall back to Pydantic v1 method
                messages_data.append(msg.dict())
        
        result = {
            "session_id": session_id,
            "messages": messages_data,
            "total_count": total_count,
            "has_more": has_more
        }
        
        # Cache the result (only for recent history without filters)
        if offset == 0 and not sender_filter:
            await self.set_cache(
                cache_key,
                result,
                ttl=self.HISTORY_CACHE_TTL
            )
            self.logger.debug(f"Cached history for session {session_id}")
        
        # Add session context if requested
        if include_context:
            try:
                # Try Pydantic v2 method first
                result['session'] = session.model_dump(mode='json')
            except AttributeError:
                # Fall back to Pydantic v1 method
                result['session'] = session.dict()
        
        # Convert messages back to ChatMessage objects for return
        result['messages'] = messages
        
        return result
    
    async def archive_session(
        self,
        session_id: str,
        user_id: str
    ) -> bool:
        """
        Archive a chat session.
        
        Marks a session as inactive while preserving all message history.
        Validates user ownership before archiving.
        
        Args:
            session_id: ID of the session to archive
            user_id: ID of the user requesting archival (for ownership validation)
        
        Returns:
            True if session was archived, False otherwise
        
        Requirements:
        - 8.7: Archive sessions while preserving message history
        - 8.7: Validate user ownership before archiving
        """
        self.logger.info(f"Archiving session {session_id} for user {user_id}")
        
        # Get session to validate ownership
        session = await self.get_session(session_id)
        if not session:
            self.logger.warning(f"Session {session_id} not found")
            return False
        
        # Validate user ownership
        if session.user_id != user_id:
            self.logger.warning(
                f"User {user_id} attempted to archive session {session_id} "
                f"owned by {session.user_id}"
            )
            return False
        
        # Update database
        if not self.db:
            raise RuntimeError("Database client not configured")
        
        try:
            async with self.db.acquire() as conn:
                result = await conn.execute(
                    """
                    UPDATE universal_chat_sessions
                    SET is_active = false, updated_at = NOW()
                    WHERE session_id = $1
                    """,
                    session_id
                )
                
                if result == "UPDATE 0":
                    self.logger.warning(f"No session updated for {session_id}")
                    return False
            
            self.logger.info(f"Archived session {session_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to archive session {session_id}: {e}")
            return False
        
        # Invalidate cache
        cache_key = f"session:{session_id}"
        await self.delete_cache(cache_key)
        
        return True

    async def detect_intent(
        self,
        message: str,
        context: ChatContext
    ) -> IntentDetectionResult:
        """
        Detect user intent from message.

        Analyzes a user message to detect the intent, extract entities,
        and provide suggested actions. Uses pattern matching for common intents.

        Args:
            message: The user message to analyze
            context: The chat context (PROJECT, UNIVERSAL, CODE_GENERATION)

        Returns:
            IntentDetectionResult with detected intent, confidence, entities, and suggested action

        Requirements:
        - 8.5: Detect user intent from messages
        - 8.5: Return confidence scores for detected intents
        - 8.5: Extract entities from messages (file names, languages, etc.)
        - 8.5: Provide suggested actions based on intent
        """
        import re

        self.logger.info(f"Detecting intent for message in {context.value} context")

        # Normalize message for pattern matching
        message_lower = message.lower().strip()

        # Initialize result variables
        detected_intent = IntentType.GENERAL_QUESTION
        confidence = 0.5
        entities: Dict[str, Any] = {}
        suggested_action = None

        # Pattern matching for intent detection
        # Each pattern has: (intent_type, patterns, confidence_boost, entity_extractors)

        intent_patterns = [
            # GENERATE_CODE patterns
            (
                IntentType.GENERATE_CODE,
                [
                    r'\b(generate|create|write|make|build|develop)\b.*\b(code|function|class|method|script|program|app|application)\b',
                    r'\b(can you|could you|please)\b.*\b(write|create|generate)\b',
                    r'\b(need|want|looking for)\b.*\b(code|function|implementation)\b',
                    r'\b(how to|how do i)\b.*\b(implement|code|write|create)\b',
                ],
                0.85,
                lambda m: self._extract_code_entities(m)
            ),
            # MODIFY_CODE patterns
            (
                IntentType.MODIFY_CODE,
                [
                    r'\b(modify|change|update|edit|fix|refactor|improve|optimize)\b.*\b(code|function|class|method|file)\b',
                    r'\b(modify|change|update|edit|fix)\b.*\.(py|js|ts|tsx|jsx|java|cpp|c|h|rb|go|rs|php|swift|kt)\b',
                    r'\b(add|remove|delete)\b.*\b(to|from)\b.*\b(code|function|class)\b',
                    r'\b(can you|could you)\b.*\b(change|update|modify|fix)\b',
                    r'\b(make it|make this)\b.*\b(better|faster|cleaner)\b',
                ],
                0.85,
                lambda m: self._extract_code_entities(m)
            ),
            # EXPLAIN_CODE patterns
            (
                IntentType.EXPLAIN_CODE,
                [
                    r'\b(explain|describe|what does|what is|how does|how works?)\b.*\b(code|function|class|method|this|api|endpoint|component)\b',
                    r'\b(can you|could you)\b.*\b(explain|describe|tell me about)\b',
                    r'\b(what|why|how)\b.*\b(does this|is this|works)\b',
                    r'\b(help me understand|i don\'t understand)\b',
                ],
                0.80,
                lambda m: self._extract_code_entities(m)
            ),
            # DOWNLOAD_CODE patterns
            (
                IntentType.DOWNLOAD_CODE,
                [
                    r'\b(download|export|save|get)\b.*\b(code|file|project|archive)\b',
                    r'\b(download|export|save|get)\b.*\.(zip|tar|gz|rar|7z|tgz)\b',
                    r'\b(can i|how to|how do i)\b.*\b(download|export|save)\b',
                    r'\b(give me|send me|provide)\b.*\b(file|code)\b',
                ],
                0.90,
                lambda m: self._extract_file_entities(m)
            ),
            # PROJECT_HELP patterns
            (
                IntentType.PROJECT_HELP,
                [
                    r'\b(project|planning|plan|organize|structure)\b',
                    r'\b(help with|assistance with|guide me)\b.*\b(project|planning)\b',
                    r'\b(how to|how do i)\b.*\b(start|begin|organize)\b.*\b(project)\b',
                    r'\b(what should i|where should i)\b.*\b(start|begin)\b',
                ],
                0.80,
                lambda m: self._extract_project_entities(m)
            ),
        ]

        # Check each pattern
        best_match_score = 0.0
        best_match_intent = None
        best_match_entities = {}

        for intent_type, patterns, base_confidence, entity_extractor in intent_patterns:
            for pattern in patterns:
                match = re.search(pattern, message_lower, re.IGNORECASE)
                if match:
                    # Calculate confidence based on pattern match and context
                    match_confidence = base_confidence

                    # Boost confidence if context matches intent
                    if context == ChatContext.CODE_GENERATION and intent_type in [
                        IntentType.GENERATE_CODE, IntentType.MODIFY_CODE, IntentType.EXPLAIN_CODE
                    ]:
                        match_confidence = min(1.0, match_confidence + 0.1)
                    elif context == ChatContext.PROJECT and intent_type == IntentType.PROJECT_HELP:
                        match_confidence = min(1.0, match_confidence + 0.1)

                    # Keep track of best match
                    if match_confidence > best_match_score:
                        best_match_score = match_confidence
                        best_match_intent = intent_type
                        best_match_entities = entity_extractor(message)

                    break  # Found a match for this intent, move to next

        # Use best match if found
        if best_match_intent:
            detected_intent = best_match_intent
            confidence = best_match_score
            entities = best_match_entities

        # Generate suggested action based on detected intent
        suggested_action = self._generate_suggested_action(
            detected_intent, entities, context
        )

        self.logger.info(
            f"Detected intent: {detected_intent.value} "
            f"(confidence: {confidence:.2f}, entities: {len(entities)})"
        )

        return IntentDetectionResult(
            intent_type=detected_intent,
            confidence=confidence,
            entities=entities,
            suggested_action=suggested_action
        )

    async def get_conversation_context(
        self,
        session_id: str,
        window_size: int = 10
    ) -> ConversationContext:
        """
        Get conversation context for AI continuity.

        Retrieves recent messages, detected intents, user preferences, and project context
        to provide the AI with comprehensive context for maintaining coherent conversations.
        Results are cached with 30 minute TTL for performance.

        Args:
            session_id: ID of the session to get context for
            window_size: Number of recent messages to include (default 10, max 50)

        Returns:
            ConversationContext with recent messages, intents, preferences, and project context

        Raises:
            ValueError: If session not found or validation fails
            RuntimeError: If database operation fails

        Requirements:
        - 8.4: Retrieve recent messages with configurable window
        - 9.6: Cache conversation context with 30 min TTL
        """
        self.logger.info(
            f"Getting conversation context for session {session_id} "
            f"(window_size={window_size})"
        )

        # Validate window size
        if not (1 <= window_size <= 50):
            raise ValueError("window_size must be between 1 and 50")

        # Check cache first
        cache_key = f"context:{session_id}:{window_size}"
        cached_context = await self.get_cache(cache_key)
        if cached_context:
            self.logger.debug(f"Conversation context for session {session_id} found in cache")
            return ConversationContext(**cached_context)

        # Validate session exists
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Get recent messages
        history_result = await self.get_history(
            session_id=session_id,
            limit=window_size,
            offset=0,
            include_context=False
        )
        recent_messages = history_result['messages']

        self.logger.debug(
            f"Retrieved {len(recent_messages)} recent messages for context"
        )

        # Detect intents from recent user messages
        detected_intents = []
        for message in recent_messages:
            if message.sender == MessageSender.USER:
                try:
                    intent_result = await self.detect_intent(
                        message.content,
                        session.context
                    )
                    detected_intents.append(intent_result)
                except Exception as e:
                    self.logger.warning(
                        f"Failed to detect intent for message {message.message_id}: {e}"
                    )

        self.logger.debug(
            f"Detected {len(detected_intents)} intents from recent messages"
        )

        # Get user preferences (from session metadata or database)
        user_preferences = {}

        # Extract preferences from session metadata
        if session.metadata:
            user_preferences = session.metadata.copy()

        # Fetch additional user preferences from database if available
        if self.db:
            try:
                async with self.db.acquire() as conn:
                    # Try to get user preferences from users table
                    user_row = await conn.fetchrow(
                        """
                        SELECT preferences
                        FROM users
                        WHERE id = $1
                        """,
                        uuid.UUID(session.user_id) if len(session.user_id) == 36 else None
                    )

                    if user_row and user_row['preferences']:
                        # Merge database preferences with session metadata
                        user_preferences.update(user_row['preferences'])
                        self.logger.debug("Retrieved user preferences from database")

            except Exception as e:
                self.logger.warning(f"Failed to fetch user preferences: {e}")

        # Get project context if session is in PROJECT context
        project_context = None
        if session.context == ChatContext.PROJECT and session.context_id:
            project_context = await self._get_project_context(session.context_id)

        # Build conversation context
        context = ConversationContext(
            session_id=session_id,
            recent_messages=recent_messages,
            detected_intents=detected_intents,
            user_preferences=user_preferences,
            project_context=project_context
        )

        # Cache the context (use model_dump for Pydantic v2 compatibility)
        try:
            # Try Pydantic v2 method first
            context_data = context.model_dump(mode='json')
        except AttributeError:
            # Fall back to Pydantic v1 method
            context_data = context.dict()

        await self.set_cache(
            cache_key,
            context_data,
            ttl=self.CONTEXT_CACHE_TTL
        )

        self.logger.info(
            f"Successfully built and cached conversation context for session {session_id}"
        )

        return context

    async def _get_project_context(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Get project context from database.

        Retrieves project information including title, description, technology stack,
        and other relevant metadata.

        Args:
            project_id: ID of the project to retrieve context for

        Returns:
            Dict with project context or None if not found
        """
        if not self.db:
            return None

        try:
            async with self.db.acquire() as conn:
                # Try to get project from projects table
                project_row = await conn.fetchrow(
                    """
                    SELECT id, title, description, project_type, difficulty,
                           technology_stack, created_at, updated_at
                    FROM projects
                    WHERE id = $1
                    """,
                    uuid.UUID(project_id) if len(project_id) == 36 else None
                )

                if project_row:
                    project_context = {
                        "project_id": str(project_row['id']),
                        "title": project_row['title'],
                        "description": project_row['description'],
                        "project_type": project_row['project_type'],
                        "difficulty": project_row['difficulty'],
                        "technology_stack": project_row['technology_stack'] or [],
                        "created_at": project_row['created_at'].isoformat() if project_row['created_at'] else None,
                        "updated_at": project_row['updated_at'].isoformat() if project_row['updated_at'] else None
                    }

                    self.logger.debug(f"Retrieved project context for project {project_id}")
                    return project_context

                # Try software_projects table as fallback
                software_project_row = await conn.fetchrow(
                    """
                    SELECT id, name, description, project_type, tech_stack,
                           created_at, updated_at
                    FROM software_projects
                    WHERE id = $1
                    """,
                    uuid.UUID(project_id) if len(project_id) == 36 else None
                )

                if software_project_row:
                    project_context = {
                        "project_id": str(software_project_row['id']),
                        "title": software_project_row['name'],
                        "description": software_project_row['description'],
                        "project_type": software_project_row['project_type'],
                        "technology_stack": software_project_row['tech_stack'] or [],
                        "created_at": software_project_row['created_at'].isoformat() if software_project_row['created_at'] else None,
                        "updated_at": software_project_row['updated_at'].isoformat() if software_project_row['updated_at'] else None
                    }

                    self.logger.debug(f"Retrieved software project context for project {project_id}")
                    return project_context

                self.logger.debug(f"No project found for project_id {project_id}")
                return None

        except Exception as e:
            self.logger.error(f"Failed to fetch project context for {project_id}: {e}")
            return None


    def _extract_code_entities(self, message: str) -> Dict[str, Any]:
        """
        Extract code-related entities from message.

        Extracts:
        - Programming languages (python, javascript, java, etc.)
        - File names and extensions
        - Frameworks and libraries
        - Code concepts (function, class, method, etc.)

        Args:
            message: The message to extract entities from

        Returns:
            Dict of extracted entities
        """
        import re

        entities: Dict[str, Any] = {}
        message_lower = message.lower()

        # Extract programming languages
        languages = [
            'python', 'javascript', 'typescript', 'java', 'c++', 'cpp', 'c#', 'csharp',
            'ruby', 'go', 'golang', 'rust', 'php', 'swift', 'kotlin', 'scala',
            'r', 'matlab', 'sql', 'html', 'css', 'bash', 'shell', 'powershell'
        ]
        detected_languages = []
        for lang in languages:
            if re.search(rf'\b{re.escape(lang)}\b', message_lower):
                detected_languages.append(lang)
        if detected_languages:
            entities['languages'] = detected_languages

        # Extract file names (e.g., main.py, index.js, App.tsx)
        file_pattern = r'\b([a-zA-Z0-9_-]+\.(py|js|ts|tsx|jsx|java|cpp|c|h|rb|go|rs|php|swift|kt|scala|r|m|sql|html|css|sh|ps1))\b'
        file_matches = re.findall(file_pattern, message, re.IGNORECASE)
        if file_matches:
            entities['file_names'] = [match[0] for match in file_matches]

        # Extract frameworks and libraries
        frameworks = [
            'react', 'vue', 'angular', 'django', 'flask', 'fastapi', 'express',
            'spring', 'rails', 'laravel', 'asp.net', 'dotnet', '.net',
            'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn',
            'jquery', 'bootstrap', 'tailwind', 'next.js', 'nuxt', 'gatsby'
        ]
        detected_frameworks = []
        for framework in frameworks:
            if re.search(rf'\b{re.escape(framework)}\b', message_lower):
                detected_frameworks.append(framework)
        if detected_frameworks:
            entities['frameworks'] = detected_frameworks

        # Extract code concepts
        concepts = ['function', 'class', 'method', 'variable', 'constant', 'module',
                   'component', 'service', 'controller', 'model', 'view', 'api',
                   'endpoint', 'route', 'middleware', 'hook', 'interface', 'type']
        detected_concepts = []
        for concept in concepts:
            if re.search(rf'\b{concept}s?\b', message_lower):
                detected_concepts.append(concept)
        if detected_concepts:
            entities['concepts'] = detected_concepts

        return entities

    def _extract_file_entities(self, message: str) -> Dict[str, Any]:
        """
        Extract file-related entities from message.

        Extracts:
        - File names and extensions
        - File types (zip, tar, pdf, etc.)

        Args:
            message: The message to extract entities from

        Returns:
            Dict of extracted entities
        """
        import re

        entities: Dict[str, Any] = {}

        # Extract file names with common extensions
        file_pattern = r'\b([a-zA-Z0-9_-]+\.([a-zA-Z0-9]+))\b'
        file_matches = re.findall(file_pattern, message, re.IGNORECASE)
        if file_matches:
            entities['file_names'] = [match[0] for match in file_matches]
            entities['file_extensions'] = list(set([match[1] for match in file_matches]))

        # Extract archive types
        archive_types = ['zip', 'tar', 'gz', 'rar', '7z', 'tar.gz', 'tgz']
        detected_archives = []
        for archive_type in archive_types:
            if re.search(rf'\b{re.escape(archive_type)}\b', message.lower()):
                detected_archives.append(archive_type)
        if detected_archives:
            entities['archive_types'] = detected_archives

        return entities

    def _extract_project_entities(self, message: str) -> Dict[str, Any]:
        """
        Extract project-related entities from message.

        Extracts:
        - Project types (web, mobile, iot, robotics, etc.)
        - Technologies and tools
        - Project phases (planning, design, development, testing, etc.)

        Args:
            message: The message to extract entities from

        Returns:
            Dict of extracted entities
        """
        import re

        entities: Dict[str, Any] = {}
        message_lower = message.lower()

        # Extract project types
        project_types = ['web', 'mobile', 'desktop', 'iot', 'robotics', 'embedded',
                        'game', 'ai', 'ml', 'data science', 'blockchain', 'cloud']
        detected_types = []
        for proj_type in project_types:
            if re.search(rf'\b{re.escape(proj_type)}\b', message_lower):
                detected_types.append(proj_type)
        if detected_types:
            entities['project_types'] = detected_types

        # Extract project phases
        phases = ['planning', 'design', 'development', 'testing', 'deployment',
                 'maintenance', 'documentation', 'architecture']
        detected_phases = []
        for phase in phases:
            if re.search(rf'\b{phase}\b', message_lower):
                detected_phases.append(phase)
        if detected_phases:
            entities['project_phases'] = detected_phases

        # Extract technologies (reuse from code entities)
        code_entities = self._extract_code_entities(message)
        if 'languages' in code_entities:
            entities['languages'] = code_entities['languages']
        if 'frameworks' in code_entities:
            entities['frameworks'] = code_entities['frameworks']

        return entities

    def _generate_suggested_action(
        self,
        intent: IntentType,
        entities: Dict[str, Any],
        context: ChatContext
    ) -> str:
        """
        Generate a suggested action based on detected intent and entities.

        Args:
            intent: The detected intent type
            entities: Extracted entities from the message
            context: The chat context

        Returns:
            A suggested action string
        """
        # Build action based on intent
        if intent == IntentType.GENERATE_CODE:
            language = entities.get('languages', [''])[0] if entities.get('languages') else 'code'
            framework = entities.get('frameworks', [''])[0] if entities.get('frameworks') else ''

            if framework:
                return f"Generate {language} code using {framework}"
            elif language:
                return f"Generate {language} code"
            else:
                return "Generate code based on requirements"

        elif intent == IntentType.MODIFY_CODE:
            file_name = entities.get('file_names', [''])[0] if entities.get('file_names') else 'code'
            return f"Modify {file_name} according to specifications"

        elif intent == IntentType.EXPLAIN_CODE:
            concept = entities.get('concepts', [''])[0] if entities.get('concepts') else 'code'
            return f"Explain the {concept} and how it works"

        elif intent == IntentType.DOWNLOAD_CODE:
            file_name = entities.get('file_names', [''])[0] if entities.get('file_names') else 'project files'
            archive_type = entities.get('archive_types', ['zip'])[0] if entities.get('archive_types') else 'zip'
            return f"Prepare {file_name} for download as {archive_type}"

        elif intent == IntentType.PROJECT_HELP:
            project_type = entities.get('project_types', [''])[0] if entities.get('project_types') else ''
            phase = entities.get('project_phases', [''])[0] if entities.get('project_phases') else 'planning'

            if project_type:
                return f"Provide guidance for {project_type} project {phase}"
            else:
                return f"Provide project {phase} assistance"

        else:  # GENERAL_QUESTION
            return "Provide helpful information and guidance"

    async def health_check(self) -> Dict[str, Any]:
        """
        Service-specific health check.
        
        Checks:
        - Base service health (cache, database)
        - Ability to query sessions table
        
        Returns:
            Dict with health status information
        """
        health = await self.base_health_check()
        health["service"] = "UnifiedChatService"
        
        # Test database query
        if self.db:
            try:
                async with self.db.acquire() as conn:
                    count = await conn.fetchval(
                        "SELECT COUNT(*) FROM universal_chat_sessions"
                    )
                    health["sessions_count"] = count
                    health["database_query"] = "success"
            except Exception as e:
                health["database_query"] = f"failed: {e}"
                health["healthy"] = False
        
        return health
