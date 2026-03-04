# Request/Response Validation Models
# Requirements: 6.1, 6.2, 6.5, 6.6, 10.5, 10.6

"""
Pydantic models for API request/response validation.

This module provides validation models for all API endpoints to ensure
consistent validation and error handling across the backend services.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field, validator
import uuid


# ============================================================================
# Chat Service Validation Models
# ============================================================================

class ChatMessageRequest(BaseModel):
    """
    Request model for sending a chat message
    
    Validates chat message content and metadata to ensure messages
    meet minimum quality standards and prevent empty or malicious content.
    
    Attributes:
        session_id: ID of the chat session
        content: Message content (1-10000 characters)
        metadata: Optional metadata for the message
    
    Requirements: 6.1, 6.2
    """
    session_id: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=10000)
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('session_id')
    def validate_session_id(cls, v):
        """Validate session_id is not empty or whitespace"""
        if not v or not v.strip():
            raise ValueError('session_id cannot be empty or whitespace')
        return v.strip()
    
    @validator('content')
    def validate_content(cls, v):
        """Validate content is not empty or whitespace"""
        if not v or not v.strip():
            raise ValueError('content cannot be empty or whitespace')
        # Check for minimum meaningful content (at least 1 non-whitespace character)
        if len(v.strip()) < 1:
            raise ValueError('content must contain at least 1 character')
        return v.strip()
    
    @validator('metadata')
    def validate_metadata(cls, v):
        """Validate metadata doesn't contain sensitive keys"""
        if v is not None:
            # Prevent storing sensitive data in metadata
            sensitive_keys = ['password', 'token', 'secret', 'api_key', 'private_key']
            for key in v.keys():
                if any(sensitive in key.lower() for sensitive in sensitive_keys):
                    raise ValueError(f'metadata cannot contain sensitive key: {key}')
        return v
    
    class Config:
        extra = "forbid"
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "content": "How do I create a REST API in Python?",
                "metadata": {"source": "web", "language": "en"}
            }
        }


# ============================================================================
# Project Service Validation Models
# ============================================================================

class ProjectType(str, Enum):
    """Valid project types"""
    IOT = "iot"
    ROBOTICS = "robotics"
    WEB = "web"
    MOBILE = "mobile"
    GENERAL = "general"
    DATA_SCIENCE = "data_science"
    GAME_DEV = "game_dev"


class DifficultyLevel(str, Enum):
    """Valid difficulty levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class ProjectCreateRequest(BaseModel):
    """
    Request model for creating a new project
    
    Validates project creation data including title, description,
    type, and difficulty level.
    
    Attributes:
        title: Project title (1-200 characters)
        description: Project description (1-5000 characters)
        project_type: Type of project (iot, robotics, web, mobile, general, etc.)
        difficulty: Difficulty level (beginner, intermediate, advanced, expert)
        user_id: ID of the user creating the project
        metadata: Optional additional project metadata
    
    Requirements: 6.1, 6.2
    """
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    project_type: ProjectType
    difficulty: DifficultyLevel
    user_id: str = Field(..., min_length=1)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    @validator('title')
    def validate_title(cls, v):
        """Validate title is not empty or whitespace"""
        if not v or not v.strip():
            raise ValueError('title cannot be empty or whitespace')
        # Check for minimum meaningful content
        if len(v.strip()) < 3:
            raise ValueError('title must be at least 3 characters long')
        return v.strip()
    
    @validator('description')
    def validate_description(cls, v):
        """Validate description is not empty or whitespace"""
        if not v or not v.strip():
            raise ValueError('description cannot be empty or whitespace')
        # Check for minimum meaningful content
        if len(v.strip()) < 10:
            raise ValueError('description must be at least 10 characters long')
        return v.strip()
    
    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate user_id is not empty"""
        if not v or not v.strip():
            raise ValueError('user_id cannot be empty')
        return v.strip()
    
    class Config:
        extra = "forbid"
        json_schema_extra = {
            "example": {
                "title": "Smart Home Automation System",
                "description": "Build an IoT-based home automation system using Raspberry Pi and sensors",
                "project_type": "iot",
                "difficulty": "intermediate",
                "user_id": "user_123",
                "metadata": {"tags": ["iot", "raspberry-pi", "automation"]}
            }
        }


class ProjectUpdateRequest(BaseModel):
    """
    Request model for updating an existing project
    
    Supports partial updates where only provided fields are updated.
    All fields are optional to support PATCH operations.
    
    Attributes:
        title: Optional new project title
        description: Optional new project description
        project_type: Optional new project type
        difficulty: Optional new difficulty level
        metadata: Optional new metadata
    
    Requirements: 6.4
    """
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=5000)
    project_type: Optional[ProjectType] = None
    difficulty: Optional[DifficultyLevel] = None
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('title')
    def validate_title(cls, v):
        """Validate title if provided"""
        if v is not None:
            if not v.strip():
                raise ValueError('title cannot be empty or whitespace')
            if len(v.strip()) < 3:
                raise ValueError('title must be at least 3 characters long')
            return v.strip()
        return v
    
    @validator('description')
    def validate_description(cls, v):
        """Validate description if provided"""
        if v is not None:
            if not v.strip():
                raise ValueError('description cannot be empty or whitespace')
            if len(v.strip()) < 10:
                raise ValueError('description must be at least 10 characters long')
            return v.strip()
        return v
    
    class Config:
        extra = "forbid"


# ============================================================================
# Pagination Models
# ============================================================================

class PaginationParams(BaseModel):
    """
    Standard pagination parameters for list endpoints
    
    Provides consistent pagination across all API endpoints with
    configurable limits and offsets.
    
    Attributes:
        limit: Number of items to return (1-100, default: 50)
        offset: Number of items to skip (default: 0)
    
    Requirements: 6.7
    """
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    
    @validator('limit')
    def validate_limit(cls, v):
        """Validate limit is within acceptable range"""
        if v < 1:
            raise ValueError('limit must be at least 1')
        if v > 100:
            raise ValueError('limit cannot exceed 100')
        return v
    
    @validator('offset')
    def validate_offset(cls, v):
        """Validate offset is non-negative"""
        if v < 0:
            raise ValueError('offset must be non-negative')
        return v
    
    class Config:
        extra = "forbid"
        json_schema_extra = {
            "example": {
                "limit": 50,
                "offset": 0
            }
        }


class PaginatedResponse(BaseModel):
    """
    Generic paginated response wrapper
    
    Wraps list responses with pagination metadata to help clients
    navigate through large result sets.
    
    Attributes:
        items: List of items in the current page
        total: Total number of items available
        limit: Number of items per page
        offset: Current offset
        has_more: Whether more items are available
    
    Requirements: 6.7
    """
    items: List[Any] = Field(default_factory=list)
    total: int = Field(..., ge=0)
    limit: int = Field(..., ge=1)
    offset: int = Field(..., ge=0)
    has_more: bool
    
    @validator('has_more', always=True)
    def calculate_has_more(cls, v, values):
        """Calculate has_more based on total, limit, and offset"""
        if 'total' in values and 'limit' in values and 'offset' in values:
            total = values['total']
            limit = values['limit']
            offset = values['offset']
            return (offset + limit) < total
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [],
                "total": 150,
                "limit": 50,
                "offset": 0,
                "has_more": True
            }
        }


# ============================================================================
# Health Check Models
# ============================================================================

class HealthStatus(str, Enum):
    """Health check status values"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"


class ComponentHealth(BaseModel):
    """
    Health status for a single component
    
    Represents the health status of an individual service component
    or dependency (database, cache, external API, etc.).
    
    Attributes:
        name: Component name
        status: Health status (healthy, unhealthy, degraded)
        response_time_ms: Response time in milliseconds
        error_count: Number of recent errors
        message: Optional status message
        details: Optional additional details
    
    Requirements: 10.7
    """
    name: str = Field(..., min_length=1)
    status: HealthStatus
    response_time_ms: Optional[float] = Field(None, ge=0)
    error_count: int = Field(default=0, ge=0)
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    
    @validator('name')
    def validate_name(cls, v):
        """Validate component name is not empty"""
        if not v or not v.strip():
            raise ValueError('name cannot be empty')
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "database",
                "status": "healthy",
                "response_time_ms": 15.3,
                "error_count": 0,
                "message": "Database connection is healthy"
            }
        }


class HealthCheckResponse(BaseModel):
    """
    Complete health check response
    
    Aggregates health status from all system components and provides
    an overall system health status.
    
    Attributes:
        status: Overall system health status
        timestamp: Time of health check
        components: Health status of individual components
        version: Optional API version
        uptime_seconds: Optional system uptime in seconds
    
    Requirements: 10.5, 10.6
    """
    status: HealthStatus
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    components: List[ComponentHealth] = Field(default_factory=list)
    version: Optional[str] = None
    uptime_seconds: Optional[float] = Field(None, ge=0)
    
    @validator('components', always=True)
    def calculate_overall_status(cls, v, values):
        """Calculate overall status based on component statuses"""
        # This validator runs after components are set, so we can update status
        # We'll use model_validator instead for proper post-validation
        return v
    
    def __init__(self, **data):
        """Override init to calculate status after validation"""
        super().__init__(**data)
        
        # Recalculate status based on components
        if self.components:
            # If any component is unhealthy, system is unhealthy
            if any(c.status == HealthStatus.UNHEALTHY for c in self.components):
                object.__setattr__(self, 'status', HealthStatus.UNHEALTHY)
            # If any component is degraded, system is degraded
            elif any(c.status == HealthStatus.DEGRADED for c in self.components):
                object.__setattr__(self, 'status', HealthStatus.DEGRADED)
            # All components healthy
            else:
                object.__setattr__(self, 'status', HealthStatus.HEALTHY)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": "2024-01-15T10:30:00Z",
                "components": [
                    {
                        "name": "database",
                        "status": "healthy",
                        "response_time_ms": 15.3,
                        "error_count": 0
                    },
                    {
                        "name": "redis",
                        "status": "healthy",
                        "response_time_ms": 2.1,
                        "error_count": 0
                    }
                ],
                "version": "1.0.0",
                "uptime_seconds": 86400.0
            }
        }


# ============================================================================
# AI Service Validation Models
# ============================================================================

class AITaskType(str, Enum):
    """Types of AI tasks"""
    CODE_GENERATION = "code_generation"
    CODE_EXPLANATION = "code_explanation"
    CODE_REVIEW = "code_review"
    QUESTION_ANSWER = "question_answer"
    PROJECT_PLANNING = "project_planning"


class AIGenerationRequest(BaseModel):
    """
    Request model for AI generation tasks
    
    Validates AI generation requests including task type, prompt,
    and optional context information.
    
    Attributes:
        task_type: Type of AI task to perform
        prompt: User prompt or question
        context: Optional context information
        max_tokens: Optional maximum tokens to generate
        temperature: Optional temperature for generation (0.0-2.0)
    
    Requirements: 6.1, 6.2
    """
    task_type: AITaskType
    prompt: str = Field(..., min_length=1, max_length=10000)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    max_tokens: Optional[int] = Field(None, ge=1, le=4000)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    
    @validator('prompt')
    def validate_prompt(cls, v):
        """Validate prompt is not empty"""
        if not v or not v.strip():
            raise ValueError('prompt cannot be empty or whitespace')
        return v.strip()
    
    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        """Validate max_tokens if provided"""
        if v is not None:
            if v < 1:
                raise ValueError('max_tokens must be at least 1')
            if v > 4000:
                raise ValueError('max_tokens cannot exceed 4000')
        return v
    
    @validator('temperature')
    def validate_temperature(cls, v):
        """Validate temperature if provided"""
        if v is not None:
            if not (0.0 <= v <= 2.0):
                raise ValueError('temperature must be between 0.0 and 2.0')
        return v
    
    class Config:
        extra = "forbid"
        json_schema_extra = {
            "example": {
                "task_type": "code_generation",
                "prompt": "Create a Python function to calculate fibonacci numbers",
                "context": {"language": "python", "style": "functional"},
                "max_tokens": 500,
                "temperature": 0.7
            }
        }


# ============================================================================
# File Service Validation Models
# ============================================================================

class FileUploadRequest(BaseModel):
    """
    Request model for file upload validation
    
    Validates file upload metadata before processing the actual file.
    
    Attributes:
        filename: Name of the file
        content_type: MIME type of the file
        size_bytes: Size of the file in bytes
        project_id: Optional project ID to associate with
    
    Requirements: 6.1, 6.2
    """
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., min_length=1)
    size_bytes: int = Field(..., ge=1, le=10485760)  # Max 10MB
    project_id: Optional[str] = None
    
    @validator('filename')
    def validate_filename(cls, v):
        """Validate filename is safe"""
        if not v or not v.strip():
            raise ValueError('filename cannot be empty')
        
        # Check for path traversal attempts
        if '..' in v or '/' in v or '\\' in v:
            raise ValueError('filename cannot contain path separators or parent directory references')
        
        # Check for valid file extension
        valid_extensions = [
            '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h',
            '.cs', '.go', '.rs', '.rb', '.php', '.html', '.css', '.json',
            '.xml', '.yaml', '.yml', '.md', '.txt'
        ]
        
        if not any(v.lower().endswith(ext) for ext in valid_extensions):
            raise ValueError(f'filename must have a valid extension: {", ".join(valid_extensions)}')
        
        return v.strip()
    
    @validator('content_type')
    def validate_content_type(cls, v):
        """Validate content type is allowed"""
        allowed_types = [
            'text/plain', 'text/html', 'text/css', 'text/javascript',
            'application/json', 'application/xml', 'application/x-yaml',
            'application/x-python', 'application/javascript',
            'application/typescript', 'text/x-python'
        ]
        
        if not any(v.startswith(allowed) or allowed.startswith(v) for allowed in allowed_types):
            raise ValueError(f'content_type must be one of: {", ".join(allowed_types)}')
        
        return v
    
    @validator('size_bytes')
    def validate_size(cls, v):
        """Validate file size is within limits"""
        max_size = 10485760  # 10MB
        if v > max_size:
            raise ValueError(f'file size cannot exceed {max_size} bytes (10MB)')
        return v
    
    class Config:
        extra = "forbid"
        json_schema_extra = {
            "example": {
                "filename": "main.py",
                "content_type": "text/x-python",
                "size_bytes": 1024,
                "project_id": "proj_123"
            }
        }


# ============================================================================
# Error Response Models
# ============================================================================

class ErrorDetail(BaseModel):
    """
    Detailed error information
    
    Provides structured error details for validation and other errors.
    
    Attributes:
        field: Field name that caused the error
        message: Human-readable error message
        type: Error type code
        context: Optional additional context
    """
    field: str
    message: str
    type: str
    context: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """
    Standard error response format
    
    Provides consistent error responses across all API endpoints.
    
    Attributes:
        error: Error code
        message: Human-readable error message
        details: Optional detailed error information
        timestamp: Time of error
        request_id: Optional request ID for tracing
        path: Optional request path
    
    Requirements: 7.1, 7.2
    """
    error: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    request_id: Optional[str] = None
    path: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        json_schema_extra = {
            "example": {
                "error": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {
                    "errors": [
                        {
                            "field": "title",
                            "message": "title must be at least 3 characters long",
                            "type": "value_error"
                        }
                    ]
                },
                "timestamp": "2024-01-15T10:30:00Z",
                "request_id": "req_123",
                "path": "/api/projects"
            }
        }
