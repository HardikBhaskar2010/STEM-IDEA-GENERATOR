# Unified Chat Service Models
# Requirements: 8.1, 8.2, 8.3, 8.5, 8.6

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator
import uuid


class ChatContext(str, Enum):
    """
    Enumeration for chat context types
    
    Defines the different contexts in which chat sessions can occur:
    - PROJECT: Chat within a specific project context
    - UNIVERSAL: General chat without project context
    - CODE_GENERATION: Chat specifically for code generation tasks
    """
    PROJECT = "project"
    UNIVERSAL = "universal"
    CODE_GENERATION = "code_generation"


class MessageSender(str, Enum):
    """
    Enumeration for message sender types
    
    Defines who sent a message:
    - USER: Message from the user
    - AI: Message from the AI assistant
    - SYSTEM: System-generated message (notifications, status updates)
    """
    USER = "user"
    AI = "ai"
    SYSTEM = "system"


class IntentType(str, Enum):
    """
    Enumeration for user intent types
    
    Defines the detected intent of user messages:
    - GENERATE_CODE: User wants to generate new code
    - MODIFY_CODE: User wants to modify existing code
    - EXPLAIN_CODE: User wants code explanation
    - DOWNLOAD_CODE: User wants to download code
    - GENERAL_QUESTION: General question not related to code
    - PROJECT_HELP: User needs help with project planning/management
    """
    GENERATE_CODE = "generate_code"
    MODIFY_CODE = "modify_code"
    EXPLAIN_CODE = "explain_code"
    DOWNLOAD_CODE = "download_code"
    GENERAL_QUESTION = "general_question"
    PROJECT_HELP = "project_help"


class ChatSession(BaseModel):
    """
    Represents a chat session in the unified chat service
    
    A chat session maintains the conversation state and metadata for a user's
    interaction with the AI assistant in a specific context.
    
    Attributes:
        session_id: Unique identifier for the session
        user_id: ID of the user who owns this session
        context: The context type for this session (PROJECT, UNIVERSAL, CODE_GENERATION)
        context_id: Optional ID of the related context (e.g., project_id for PROJECT context)
        title: Optional human-readable title for the session
        metadata: Additional metadata for the session
        created_at: Timestamp when the session was created
        updated_at: Timestamp when the session was last updated
        last_activity: Timestamp of the last activity in this session
        message_count: Number of messages in this session
        is_active: Whether the session is active or archived
    """
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., min_length=1)
    context: ChatContext
    context_id: Optional[str] = None
    title: Optional[str] = Field(None, max_length=200)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message_count: int = Field(default=0, ge=0)
    is_active: bool = True

    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate that user_id is not empty"""
        if not v or not v.strip():
            raise ValueError("user_id cannot be empty")
        return v.strip()

    @validator('context_id', always=True)
    def validate_context_id(cls, v, values):
        """Validate context_id based on context type"""
        if 'context' in values:
            context = values['context']
            # PROJECT and CODE_GENERATION contexts should have a context_id
            if context in [ChatContext.PROJECT, ChatContext.CODE_GENERATION]:
                if not v:
                    raise ValueError(f"context_id is required for {context.value} context")
        return v

    @validator('message_count')
    def validate_message_count(cls, v):
        """Validate message count is non-negative"""
        if v < 0:
            raise ValueError("message_count must be non-negative")
        return v

    @validator('last_activity')
    def validate_last_activity(cls, v, values):
        """Validate last_activity is not before created_at"""
        if 'created_at' in values and v < values['created_at']:
            raise ValueError("last_activity cannot be before created_at")
        return v

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ChatMessage(BaseModel):
    """
    Represents a single message in a chat session
    
    Stores the content and metadata for a message sent by a user, AI, or system.
    Supports voice transcription metadata for voice-based interactions.
    
    Attributes:
        message_id: Unique identifier for the message
        session_id: ID of the session this message belongs to
        content: The text content of the message
        sender: Who sent the message (USER, AI, or SYSTEM)
        metadata: Additional metadata for the message
        voice_transcript: Optional voice transcription text
        voice_duration: Optional duration of voice message in seconds
        voice_confidence: Optional confidence score of voice transcription (0.0-1.0)
        created_at: Timestamp when the message was created
    """
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1, max_length=10000)
    sender: MessageSender
    metadata: Dict[str, Any] = Field(default_factory=dict)
    voice_transcript: Optional[str] = Field(None, max_length=10000)
    voice_duration: Optional[float] = Field(None, gt=0)
    voice_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validator('session_id')
    def validate_session_id(cls, v):
        """Validate that session_id is not empty"""
        if not v or not v.strip():
            raise ValueError("session_id cannot be empty")
        return v.strip()

    @validator('content')
    def validate_content(cls, v):
        """Validate message content is not empty"""
        if not v or not v.strip():
            raise ValueError("content cannot be empty or whitespace only")
        return v.strip()

    @validator('voice_duration')
    def validate_voice_duration(cls, v):
        """Validate voice duration is positive if provided"""
        if v is not None and v <= 0:
            raise ValueError("voice_duration must be positive")
        return v

    @validator('voice_confidence')
    def validate_voice_confidence(cls, v):
        """Validate voice confidence is between 0.0 and 1.0"""
        if v is not None and not (0.0 <= v <= 1.0):
            raise ValueError("voice_confidence must be between 0.0 and 1.0")
        return v

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class IntentDetectionResult(BaseModel):
    """
    Result of intent detection from a user message
    
    Represents the detected intent, confidence level, and extracted entities
    from analyzing a user's message.
    
    Attributes:
        intent_type: The detected intent type
        confidence: Confidence score of the detection (0.0-1.0)
        entities: Extracted entities from the message (e.g., file names, languages)
        suggested_action: Optional suggested action based on the intent
    """
    intent_type: IntentType
    confidence: float = Field(..., ge=0.0, le=1.0)
    entities: Dict[str, Any] = Field(default_factory=dict)
    suggested_action: Optional[str] = Field(None, max_length=500)

    @validator('confidence')
    def validate_confidence(cls, v):
        """Validate confidence is between 0.0 and 1.0"""
        if not (0.0 <= v <= 1.0):
            raise ValueError("confidence must be between 0.0 and 1.0")
        return v

    @validator('suggested_action')
    def validate_suggested_action(cls, v):
        """Validate suggested action is not empty if provided"""
        if v is not None and not v.strip():
            raise ValueError("suggested_action cannot be empty if provided")
        return v.strip() if v else None


class ConversationContext(BaseModel):
    """
    Context information for maintaining conversation continuity
    
    Provides the AI with recent conversation history, detected intents,
    user preferences, and project context to maintain coherent conversations.
    
    Attributes:
        session_id: ID of the session this context belongs to
        recent_messages: List of recent messages in the conversation
        detected_intents: List of detected intents from recent messages
        user_preferences: User preferences relevant to the conversation
        project_context: Optional project context if in PROJECT context
    """
    session_id: str = Field(..., min_length=1)
    recent_messages: List[ChatMessage] = Field(default_factory=list)
    detected_intents: List[IntentDetectionResult] = Field(default_factory=list)
    user_preferences: Dict[str, Any] = Field(default_factory=dict)
    project_context: Optional[Dict[str, Any]] = None

    @validator('session_id')
    def validate_session_id(cls, v):
        """Validate that session_id is not empty"""
        if not v or not v.strip():
            raise ValueError("session_id cannot be empty")
        return v.strip()

    @validator('recent_messages')
    def validate_recent_messages(cls, v):
        """Validate recent messages list"""
        # Ensure messages are in chronological order
        if len(v) > 1:
            for i in range(len(v) - 1):
                if v[i].created_at > v[i + 1].created_at:
                    raise ValueError("recent_messages must be in chronological order")
        return v


# Request/Response Models for API endpoints

class CreateSessionRequest(BaseModel):
    """Request model for creating a new chat session"""
    user_id: str = Field(..., min_length=1)
    context: ChatContext
    context_id: Optional[str] = None
    title: Optional[str] = Field(None, max_length=200)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate that user_id is not empty"""
        if not v or not v.strip():
            raise ValueError("user_id cannot be empty")
        return v.strip()

    @validator('context_id', always=True)
    def validate_context_id(cls, v, values):
        """Validate context_id based on context type"""
        if 'context' in values:
            context = values['context']
            if context in [ChatContext.PROJECT, ChatContext.CODE_GENERATION]:
                if not v:
                    raise ValueError(f"context_id is required for {context.value} context")
        return v


class SendMessageRequest(BaseModel):
    """Request model for sending a message in a chat session"""
    session_id: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1, max_length=10000)
    sender: MessageSender
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    voice_transcript: Optional[str] = Field(None, max_length=10000)
    voice_duration: Optional[float] = Field(None, gt=0)
    voice_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)

    @validator('session_id')
    def validate_session_id(cls, v):
        """Validate that session_id is not empty"""
        if not v or not v.strip():
            raise ValueError("session_id cannot be empty")
        return v.strip()

    @validator('content')
    def validate_content(cls, v):
        """Validate message content is not empty"""
        if not v or not v.strip():
            raise ValueError("content cannot be empty or whitespace only")
        return v.strip()


class GetHistoryRequest(BaseModel):
    """Request model for retrieving chat history"""
    session_id: str = Field(..., min_length=1)
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
    include_context: bool = True

    @validator('session_id')
    def validate_session_id(cls, v):
        """Validate that session_id is not empty"""
        if not v or not v.strip():
            raise ValueError("session_id cannot be empty")
        return v.strip()

    @validator('limit')
    def validate_limit(cls, v):
        """Validate limit is within acceptable range"""
        if not (1 <= v <= 200):
            raise ValueError("limit must be between 1 and 200")
        return v


class ArchiveSessionRequest(BaseModel):
    """Request model for archiving a chat session"""
    session_id: str = Field(..., min_length=1)
    user_id: str = Field(..., min_length=1)

    @validator('session_id', 'user_id')
    def validate_ids(cls, v):
        """Validate that IDs are not empty"""
        if not v or not v.strip():
            raise ValueError("ID cannot be empty")
        return v.strip()


class ChatHistoryResponse(BaseModel):
    """Response model for chat history"""
    session_id: str
    messages: List[ChatMessage]
    total_count: int = Field(ge=0)
    has_more: bool

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class IntentDetectionResponse(BaseModel):
    """Response model for intent detection"""
    intent: IntentDetectionResult
    context: ChatContext
    session_id: str


class ConversationContextResponse(BaseModel):
    """Response model for conversation context"""
    context: ConversationContext
    window_size: int = Field(ge=1)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
