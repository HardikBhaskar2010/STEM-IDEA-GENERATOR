# AI Project Guidance Data Models
# Requirements: 7.1, 7.2

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field, validator
import uuid


class MessageSender(str, Enum):
    """Enumeration for message sender types"""
    USER = "user"
    AI = "ai"


class TaskStatus(str, Enum):
    """Enumeration for task status types"""
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"


class TaskPriority(str, Enum):
    """Enumeration for task priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ChatSession(BaseModel):
    """
    Represents a chat session between a user and the AI guidance system
    """
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    user_id: str
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    @validator('project_id', 'user_id')
    def validate_uuid_fields(cls, v):
        """Validate that UUID fields are valid UUIDs"""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid UUID format: {v}")


class ChatMessage(BaseModel):
    """
    Represents an individual message in a chat session
    """
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    content: str = Field(..., min_length=1, max_length=10000)
    sender: MessageSender
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    @validator('session_id')
    def validate_session_id(cls, v):
        """Validate that session_id is a valid UUID"""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid session_id UUID format: {v}")

    @validator('content')
    def validate_content(cls, v):
        """Validate message content"""
        if not v.strip():
            raise ValueError("Message content cannot be empty or whitespace only")
        return v.strip()


class Task(BaseModel):
    """
    Represents a task within a project
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., max_length=1000)
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Milestone(BaseModel):
    """
    Represents a milestone within a project
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., max_length=1000)
    target_date: datetime
    completed: bool = False

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ProjectContext(BaseModel):
    """
    Represents the context information for a project used by the AI
    """
    project_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., max_length=2000)
    goals: List[str] = Field(default_factory=list)
    current_phase: str = Field(..., min_length=1, max_length=100)
    tasks: List[Task] = Field(default_factory=list)
    milestones: List[Milestone] = Field(default_factory=list)
    progress: float = Field(default=0.0, ge=0.0, le=100.0)
    deadlines: List[datetime] = Field(default_factory=list)
    # Enhanced fields for comprehensive context (Requirements 1.2, 9.4)
    technology_stack: List[str] = Field(default_factory=list)
    files: List[Dict[str, Any]] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    ai_suggestions: Optional[Dict[str, Any]] = Field(default=None)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate that project_id is a valid UUID"""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid project_id UUID format: {v}")

    @validator('progress')
    def validate_progress(cls, v):
        """Validate progress percentage"""
        if not 0.0 <= v <= 100.0:
            raise ValueError("Progress must be between 0.0 and 100.0")
        return v


class AIContextCache(BaseModel):
    """
    Represents cached AI context data
    """
    cache_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    context_data: ProjectContext
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate that project_id is a valid UUID"""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid project_id UUID format: {v}")

    @validator('expires_at')
    def validate_expires_at(cls, v, values):
        """Validate that expires_at is after generated_at"""
        if 'generated_at' in values and v <= values['generated_at']:
            raise ValueError("expires_at must be after generated_at")
        return v


# Request/Response Models

class ChatRequest(BaseModel):
    """Request payload for sending a chat message"""
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: Optional[str] = None
    project_context: Optional[Dict[str, Any]] = None  # Project details from localStorage
    conversation_history: Optional[List[Dict[str, Any]]] = None  # Recent conversation history

    @validator('message')
    def validate_message(cls, v):
        """Validate message content"""
        if not v.strip():
            raise ValueError("Message cannot be empty or whitespace only")
        return v.strip()

    @validator('session_id')
    def validate_session_id(cls, v):
        """Validate session_id if provided"""
        if v is not None:
            try:
                uuid.UUID(v)
                return v
            except ValueError:
                raise ValueError(f"Invalid session_id UUID format: {v}")
        return v


class ChatResponse(BaseModel):
    """Response from the AI guidance system"""
    response: str
    session_id: str
    suggestions: List[str] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    requires_clarification: bool = False
    ambiguity_analysis: Optional["AmbiguityAnalysis"] = None


class ContextResponse(BaseModel):
    """Response containing project context information"""
    project: Optional[ProjectContext] = None
    recommendations: List[str] = Field(default_factory=list)


class HistoryResponse(BaseModel):
    """Response containing chat history"""
    messages: List[ChatMessage]
    session_id: str


class GuidanceRequest(BaseModel):
    """AI guidance request with full context"""
    project_id: str
    user_message: str = Field(..., min_length=1, max_length=10000)
    conversation_history: List[ChatMessage] = Field(default_factory=list)

    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate that project_id is a valid UUID"""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid project_id UUID format: {v}")

    @validator('user_message')
    def validate_user_message(cls, v):
        """Validate user message content"""
        if not v.strip():
            raise ValueError("User message cannot be empty or whitespace only")
        return v.strip()


class GuidanceResponse(BaseModel):
    """AI guidance response with detailed information"""
    response: str
    suggestions: List[str] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    ambiguity_analysis: Optional["AmbiguityAnalysis"] = None
    clarification_request: Optional["ClarificationRequest"] = None
    requires_clarification: bool = False

    @validator('confidence')
    def validate_confidence(cls, v):
        """Validate confidence score"""
        if not 0.0 <= v <= 1.0:
            raise ValueError("Confidence must be between 0.0 and 1.0")
        return v


# Database Operation Models

class CreateSessionParams(BaseModel):
    """Parameters for creating a new chat session"""
    project_id: str
    user_id: str

    @validator('project_id', 'user_id')
    def validate_uuid_fields(cls, v):
        """Validate that UUID fields are valid UUIDs"""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid UUID format: {v}")


class UpdateSessionParams(BaseModel):
    """Parameters for updating a chat session"""
    session_id: str
    last_activity: Optional[datetime] = None

    @validator('session_id')
    def validate_session_id(cls, v):
        """Validate that session_id is a valid UUID"""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid session_id UUID format: {v}")


class CreateMessageParams(BaseModel):
    """Parameters for creating a new chat message"""
    session_id: str
    content: str = Field(..., min_length=1, max_length=10000)
    sender: MessageSender
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator('session_id')
    def validate_session_id(cls, v):
        """Validate that session_id is a valid UUID"""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid session_id UUID format: {v}")

    @validator('content')
    def validate_content(cls, v):
        """Validate message content"""
        if not v.strip():
            raise ValueError("Message content cannot be empty or whitespace only")
        return v.strip()


class UpdateContextParams(BaseModel):
    """Parameters for updating project context cache"""
    project_id: str
    context_data: ProjectContext
    expiration_hours: int = Field(default=24, ge=1, le=168)  # 1 hour to 1 week

    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate that project_id is a valid UUID"""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid project_id UUID format: {v}")


# Error Models

class AIGuidanceError(BaseModel):
    """Error response from AI guidance API"""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    retryable: bool = False


# Utility Models

class SessionStats(BaseModel):
    """Chat session statistics"""
    message_count: int = Field(ge=0)
    duration_minutes: float = Field(ge=0.0)
    last_message_time: Optional[datetime] = None
    user_message_count: int = Field(ge=0)
    ai_message_count: int = Field(ge=0)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ProjectAnalysis(BaseModel):
    """Project analysis result from AI"""
    blockers: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    risk_assessment: Dict[str, Union[str, List[str]]] = Field(default_factory=dict)
    progress_insights: Dict[str, Union[float, str, List[str]]] = Field(default_factory=dict)


class AIResponseMetadata(BaseModel):
    """AI model response metadata"""
    model: str
    token_usage: Dict[str, int] = Field(default_factory=dict)
    response_time: float = Field(ge=0.0)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    @validator('confidence')
    def validate_confidence(cls, v):
        """Validate confidence score"""
        if not 0.0 <= v <= 1.0:
            raise ValueError("Confidence must be between 0.0 and 1.0")
        return v


class AmbiguityAnalysis(BaseModel):
    """Analysis result for query ambiguity detection"""
    is_ambiguous: bool = False
    ambiguity_score: float = Field(default=0.0, ge=0.0, le=1.0)
    ambiguous_aspects: List[str] = Field(default_factory=list)
    missing_context: List[str] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
    clarification_needed: bool = False

    @validator('ambiguity_score')
    def validate_ambiguity_score(cls, v):
        """Validate ambiguity score"""
        if not 0.0 <= v <= 1.0:
            raise ValueError("Ambiguity score must be between 0.0 and 1.0")
        return v


class FollowUpQuestion(BaseModel):
    """Represents a follow-up question for clarification"""
    question: str = Field(..., min_length=1, max_length=500)
    category: str = Field(..., min_length=1, max_length=100)  # e.g., "scope", "timeline", "resources"
    priority: int = Field(default=1, ge=1, le=5)  # 1 = highest priority
    context_needed: List[str] = Field(default_factory=list)

    @validator('question')
    def validate_question(cls, v):
        """Validate question content"""
        if not v.strip():
            raise ValueError("Question cannot be empty or whitespace only")
        return v.strip()


class ClarificationRequest(BaseModel):
    """Request for clarification when query is ambiguous"""
    original_query: str
    ambiguity_analysis: AmbiguityAnalysis
    suggested_questions: List[FollowUpQuestion] = Field(default_factory=list)
    clarification_prompt: str
    requires_user_input: bool = True


# Resolve forward references
ChatResponse.model_rebuild()
GuidanceResponse.model_rebuild()