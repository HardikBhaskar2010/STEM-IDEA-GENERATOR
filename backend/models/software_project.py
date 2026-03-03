# Software Project Models
# Phase 1: Backend Foundation - MongoDB Models

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class ProjectType(str, Enum):
    """Software project types"""
    WEB_APP = "web_app"
    MOBILE_APP = "mobile_app"
    DESKTOP_APP = "desktop_app"
    API = "api"
    FULL_STACK = "full_stack"
    MICROSERVICES = "microservices"
    PWA = "progressive_web_app"


class Platform(str, Enum):
    """Target platforms"""
    WEB = "web"
    IOS = "ios"
    ANDROID = "android"
    DESKTOP = "desktop"
    ALL = "all"


class ComplexityLevel(str, Enum):
    """Project complexity levels"""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    ENTERPRISE = "enterprise"


class ArchitectureType(str, Enum):
    """Architecture patterns"""
    MONOLITH = "monolith"
    MODULAR_MONOLITH = "modular_monolith"
    MICROSERVICES = "microservices"
    SPA = "spa"
    MVC = "mvc"
    SERVERLESS = "serverless"
    EVENT_DRIVEN = "event_driven"


class Feature(BaseModel):
    """Software feature model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., max_length=1000)
    priority: str = Field(default="medium")  # low, medium, high, critical
    acceptance_criteria: List[str] = Field(default_factory=list)
    estimated_hours: Optional[int] = None
    dependencies: List[str] = Field(default_factory=list)
    status: str = Field(default="pending")  # pending, in_progress, completed


class UserStory(BaseModel):
    """User story model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    as_a: str = Field(..., min_length=1)
    i_want: str = Field(..., min_length=1)
    so_that: str = Field(..., min_length=1)
    acceptance_criteria: List[str] = Field(default_factory=list)
    story_points: Optional[int] = Field(None, ge=1, le=21)
    priority: str = Field(default="medium")


class DatabaseRecommendation(BaseModel):
    """Database recommendation model"""
    name: str
    type: str  # SQL, NoSQL, Graph, etc.
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    best_for: List[str] = Field(default_factory=list)
    recommended: bool = False
    estimated_cost: Optional[str] = None


class TechnologyStackRecommendation(BaseModel):
    """Technology stack recommendation model"""
    name: str
    frontend: Optional[str] = None
    backend: Optional[str] = None
    database: str
    reasoning: str
    additional_tools: List[str] = Field(default_factory=list)
    learning_curve: str = "moderate"  # easy, moderate, steep
    community_size: str = "large"  # small, medium, large, very_large
    popularity_score: int = Field(default=70, ge=0, le=100)


class TeamComposition(BaseModel):
    """Team composition recommendation"""
    recommended_size: int = Field(..., ge=1)
    roles: List[Dict[str, Any]] = Field(default_factory=list)
    estimated_cost: Optional[str] = None


class DeploymentRecommendation(BaseModel):
    """Deployment platform recommendation"""
    name: str
    type: str  # cloud, on-premise, hybrid
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    pricing: str
    best_for: List[str] = Field(default_factory=list)
    recommended: bool = False


class NonFunctionalRequirements(BaseModel):
    """Non-functional requirements"""
    performance: Dict[str, Any] = Field(default_factory=dict)
    security: Dict[str, Any] = Field(default_factory=dict)
    scalability: Dict[str, Any] = Field(default_factory=dict)
    availability: Dict[str, Any] = Field(default_factory=dict)
    maintainability: Dict[str, Any] = Field(default_factory=dict)


class ArchitectureDiagram(BaseModel):
    """Architecture diagram model (Mermaid format)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    diagram_type: str = Field(default="flowchart")  # flowchart, sequence, class, er
    mermaid_code: str  # Mermaid diagram syntax
    description: str
    components: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DatabaseSchema(BaseModel):
    """Database schema design"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    database_type: str  # postgresql, mongodb, mysql, etc.
    tables: List[Dict[str, Any]] = Field(default_factory=list)
    relationships: List[Dict[str, Any]] = Field(default_factory=list)
    indexes: List[Dict[str, Any]] = Field(default_factory=list)
    schema_sql: Optional[str] = None  # Generated SQL for relational databases
    schema_json: Optional[Dict[str, Any]] = None  # JSON schema for NoSQL
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class APIEndpoint(BaseModel):
    """API endpoint specification"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    method: str  # GET, POST, PUT, DELETE, PATCH
    path: str
    description: str
    request_body: Optional[Dict[str, Any]] = None
    response_body: Optional[Dict[str, Any]] = None
    query_parameters: List[Dict[str, Any]] = Field(default_factory=list)
    headers: List[Dict[str, Any]] = Field(default_factory=list)
    authentication: Optional[str] = None
    rate_limit: Optional[str] = None
    status_codes: Dict[str, str] = Field(default_factory=dict)


class APISpecification(BaseModel):
    """Complete API specification (OpenAPI format)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    title: str
    version: str = "1.0.0"
    description: str
    base_url: str
    endpoints: List[APIEndpoint] = Field(default_factory=list)
    authentication_scheme: Optional[str] = None
    openapi_spec: Dict[str, Any] = Field(default_factory=dict)  # OpenAPI 3.0 spec
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CodeTemplate(BaseModel):
    """Code generation template"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    platform: Platform
    framework: str
    description: str
    files: List[Dict[str, str]] = Field(default_factory=list)  # {path, content, description}
    dependencies: List[str] = Field(default_factory=list)
    setup_instructions: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SoftwareProject(BaseModel):
    """Complete software project model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., max_length=5000)
    
    # Project classification
    project_type: ProjectType
    platforms: List[Platform]
    complexity_level: ComplexityLevel
    
    # Requirements and features
    features: List[Feature] = Field(default_factory=list)
    user_stories: List[UserStory] = Field(default_factory=list)
    
    # Technical recommendations
    recommended_tech_stack: Optional[TechnologyStackRecommendation] = None
    architecture_type: Optional[ArchitectureType] = None
    database_recommendations: List[DatabaseRecommendation] = Field(default_factory=list)
    
    # Architecture & Design
    architecture_diagram: Optional[ArchitectureDiagram] = None
    database_schema: Optional[DatabaseSchema] = None
    api_specification: Optional[APISpecification] = None
    
    # Project planning
    estimated_timeline: Optional[str] = None
    estimated_budget: Optional[str] = None
    team_recommendations: Optional[TeamComposition] = None
    deployment_recommendations: List[DeploymentRecommendation] = Field(default_factory=list)
    
    # Non-functional requirements
    non_functional_requirements: Optional[NonFunctionalRequirements] = None
    
    # Project metadata
    status: str = Field(default="planning")  # planning, in_development, completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # AI analysis metadata
    ai_confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    analysis_metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    @validator('user_id', 'id')
    def validate_uuid_fields(cls, v):
        """Validate UUID fields"""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid UUID format: {v}")


# Request/Response Models

class ProjectAnalysisRequest(BaseModel):
    """Request to analyze project requirements"""
    description: str = Field(..., min_length=10, max_length=5000)
    target_platforms: List[str] = Field(..., min_items=1)
    budget: Optional[str] = None
    timeline: Optional[str] = None
    team_size: Optional[int] = Field(None, ge=1, le=100)
    team_expertise: Optional[str] = None  # beginner, intermediate, advanced, expert
    custom_requirements: Optional[str] = None


class ProjectAnalysisResponse(BaseModel):
    """Response from project analysis"""
    project_id: str
    project_type: ProjectType
    platforms: List[Platform]
    complexity_level: ComplexityLevel
    features: List[Feature]
    user_stories: List[UserStory]
    tech_stack: TechnologyStackRecommendation
    architecture_type: ArchitectureType
    database_recommendations: List[DatabaseRecommendation]
    estimated_timeline: str
    estimated_budget: str
    team_recommendations: TeamComposition
    deployment_recommendations: List[DeploymentRecommendation]
    non_functional_requirements: NonFunctionalRequirements
    ai_confidence_score: float


class ArchitectureDiagramRequest(BaseModel):
    """Request to generate architecture diagram"""
    project_id: str
    diagram_type: str = "flowchart"  # flowchart, sequence, class, er
    include_database: bool = True
    include_frontend: bool = True
    include_backend: bool = True
    include_external_services: bool = False


class DatabaseSchemaRequest(BaseModel):
    """Request to generate database schema"""
    project_id: str
    database_type: str  # postgresql, mongodb, mysql, etc.
    include_sample_data: bool = False
    normalize_level: str = "3NF"  # For SQL databases


class APISpecificationRequest(BaseModel):
    """Request to generate API specification"""
    project_id: str
    include_authentication: bool = True
    include_rate_limiting: bool = False
    api_version: str = "1.0.0"


class CodeGenerationRequest(BaseModel):
    """Request to generate code from project plan"""
    project_id: str
    platform: Platform
    template_id: Optional[str] = None
    include_tests: bool = False
    include_documentation: bool = True
