# Enhanced Software Project Planning Service with AI
# Phase 1: Backend Foundation - AI-Powered Project Analysis
# Integrates OpenRouter for intelligent requirement extraction and planning

import logging
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum

from models.software_project import (
    ProjectType, Platform, ComplexityLevel, ArchitectureType,
    Feature, UserStory, TechnologyStackRecommendation,
    DatabaseRecommendation, TeamComposition, DeploymentRecommendation,
    NonFunctionalRequirements, SoftwareProject,
    ArchitectureDiagram, DatabaseSchema, APISpecification, APIEndpoint
)
from database.software_project_crud import SoftwareProjectCRUD
from services.software_project_planning_service import software_planning_service

logger = logging.getLogger(__name__)


class EnhancedSoftwarePlanningService:
    """
    Enhanced software project planning service with AI-powered analysis.
    Uses OpenRouter for intelligent requirement extraction and recommendations.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.openrouter_client = None
        self.openrouter_config = None
        
        # Import OpenRouter client
        try:
            from server import openrouter_client, openrouter_config
            self.openrouter_client = openrouter_client
            self.openrouter_config = openrouter_config
            
            if self.openrouter_client:
                self.logger.info("Enhanced Planning Service initialized with OpenRouter AI")
            else:
                self.logger.warning("OpenRouter not available - using rule-based analysis")
        except ImportError as e:
            self.logger.warning(f"OpenRouter import failed: {e}")
        
        # Use base service for fallback
        self.base_service = software_planning_service
    
    async def analyze_project_requirements(
        self,
        description: str,
        target_platforms: List[str],
        user_id: str,
        budget: Optional[str] = None,
        timeline: Optional[str] = None,
        team_size: Optional[int] = None,
        team_expertise: Optional[str] = None,
        custom_requirements: Optional[str] = None
    ) -> SoftwareProject:
        """
        AI-powered project requirement analysis.
        
        Args:
            description: Project description
            target_platforms: Target platforms
            user_id: User ID
            budget: Budget constraint
            timeline: Timeline constraint
            team_size: Team size
            team_expertise: Team expertise level
            custom_requirements: Additional requirements
            
        Returns:
            Complete SoftwareProject with AI-generated analysis
        """
        self.logger.info(f"Analyzing project requirements with AI for user {user_id}")
        
        try:
            # Use AI if available, otherwise fall back to rule-based
            if self.openrouter_client:
                project = await self._ai_powered_analysis(
                    description, target_platforms, user_id, budget, timeline,
                    team_size, team_expertise, custom_requirements
                )
            else:
                # Fallback to base service
                plan = await self.base_service.analyze_requirements(
                    description, target_platforms, budget, timeline, team_size, team_expertise
                )
                project = self._convert_plan_to_project(plan, user_id)
            
            # Save to database
            project_id = await SoftwareProjectCRUD.create_project(project)
            project.id = project_id
            
            self.logger.info(f"Project analysis completed: {project_id}")
            return project
            
        except Exception as e:
            self.logger.error(f"Error analyzing project: {e}")
            raise
    
    async def _ai_powered_analysis(
        self,
        description: str,
        target_platforms: List[str],
        user_id: str,
        budget: Optional[str],
        timeline: Optional[str],
        team_size: Optional[int],
        team_expertise: Optional[str],
        custom_requirements: Optional[str]
    ) -> SoftwareProject:
        """
        Use OpenRouter AI for intelligent project analysis.
        """
        self.logger.info("Using AI-powered analysis")
        
        # Build AI prompt
        prompt = self._build_analysis_prompt(
            description, target_platforms, budget, timeline,
            team_size, team_expertise, custom_requirements
        )
        
        # Call OpenRouter
        messages = [
            {
                "role": "system",
                "content": "You are an expert software architect and project planner. Analyze project requirements and provide comprehensive technical recommendations in JSON format."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response = await self.openrouter_client.generate_completion(
            messages=messages,
            max_tokens=6000,
            temperature=0.5
        )
        
        # Parse AI response
        analysis = self._parse_ai_response(response)
        
        # Create project object
        project = self._create_project_from_analysis(
            analysis, description, target_platforms, user_id
        )
        
        return project
    
    def _build_analysis_prompt(
        self,
        description: str,
        target_platforms: List[str],
        budget: Optional[str],
        timeline: Optional[str],
        team_size: Optional[int],
        team_expertise: Optional[str],
        custom_requirements: Optional[str]
    ) -> str:
        """Build comprehensive analysis prompt for AI."""
        
        prompt_parts = [
            "Analyze the following software project requirements and provide a comprehensive technical plan.",
            "",
            "=== PROJECT REQUIREMENTS ===",
            f"Description: {description}",
            f"Target Platforms: {', '.join(target_platforms)}",
        ]
        
        if budget:
            prompt_parts.append(f"Budget: {budget}")
        if timeline:
            prompt_parts.append(f"Timeline: {timeline}")
        if team_size:
            prompt_parts.append(f"Team Size: {team_size} developers")
        if team_expertise:
            prompt_parts.append(f"Team Expertise: {team_expertise}")
        if custom_requirements:
            prompt_parts.append(f"Additional Requirements: {custom_requirements}")
        
        prompt_parts.extend([
            "",
            "=== REQUIRED ANALYSIS ===",
            "Provide a detailed analysis in the following JSON format:",
            "",
            "{",
            '  "project_type": "web_app|mobile_app|desktop_app|api|full_stack|microservices|pwa",',
            '  "complexity_level": "simple|moderate|complex|enterprise",',
            '  "features": [',
            '    {',
            '      "name": "Feature name",',
            '      "description": "Detailed description",',
            '      "priority": "low|medium|high|critical",',
            '      "acceptance_criteria": ["Criterion 1", "Criterion 2"],',
            '      "estimated_hours": 20',
            '    }',
            '  ],',
            '  "user_stories": [',
            '    {',
            '      "as_a": "user type",',
            '      "i_want": "action",',
            '      "so_that": "benefit",',
            '      "acceptance_criteria": ["AC 1", "AC 2"],',
            '      "story_points": 5',
            '    }',
            '  ],',
            '  "tech_stack": {',
            '    "name": "Stack name",',
            '    "frontend": "React",',
            '    "backend": "FastAPI",',
            '    "database": "PostgreSQL",',
            '    "reasoning": "Why this stack",',
            '    "additional_tools": ["Tool1", "Tool2"]',
            '  },',
            '  "architecture_type": "monolith|spa|microservices|modular_monolith",',
            '  "estimated_timeline": "2-4 weeks|1-2 months|3-6 months",',
            '  "estimated_budget": "$5,000 - $15,000"',
            '}',
            "",
            "Focus on practical, actionable recommendations suitable for the team's expertise level."
        ])
        
        return "\n".join(prompt_parts)
    
    def _parse_ai_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse OpenRouter response and extract JSON analysis."""
        try:
            # Extract content from response
            if 'choices' in response and len(response['choices']) > 0:
                content = response['choices'][0]['message']['content']
            else:
                content = str(response)
            
            # Try to find JSON in the response
            start_idx = content.find('{')
            end_idx = content.rfind('}')
            
            if start_idx != -1 and end_idx != -1:
                json_str = content[start_idx:end_idx + 1]
                analysis = json.loads(json_str)
                return analysis
            else:
                # Fallback to basic analysis
                self.logger.warning("Could not extract JSON from AI response")
                return self._create_fallback_analysis()
                
        except Exception as e:
            self.logger.error(f"Error parsing AI response: {e}")
            return self._create_fallback_analysis()
    
    def _create_fallback_analysis(self) -> Dict[str, Any]:
        """Create basic analysis when AI parsing fails."""
        return {
            "project_type": "web_app",
            "complexity_level": "moderate",
            "features": [],
            "user_stories": [],
            "tech_stack": {
                "name": "MERN Stack",
                "frontend": "React",
                "backend": "Node.js + Express",
                "database": "MongoDB",
                "reasoning": "Popular full-stack JavaScript solution",
                "additional_tools": ["Redux", "JWT"]
            },
            "architecture_type": "spa",
            "estimated_timeline": "1-2 months",
            "estimated_budget": "$10,000 - $30,000"
        }
    
    def _create_project_from_analysis(
        self,
        analysis: Dict[str, Any],
        description: str,
        target_platforms: List[str],
        user_id: str
    ) -> SoftwareProject:
        """Create SoftwareProject object from AI analysis."""
        
        # Parse features
        features = []
        for f_data in analysis.get('features', []):
            feature = Feature(
                name=f_data.get('name', 'Feature'),
                description=f_data.get('description', ''),
                priority=f_data.get('priority', 'medium'),
                acceptance_criteria=f_data.get('acceptance_criteria', []),
                estimated_hours=f_data.get('estimated_hours')
            )
            features.append(feature)
        
        # Parse user stories
        user_stories = []
        for us_data in analysis.get('user_stories', []):
            user_story = UserStory(
                as_a=us_data.get('as_a', 'user'),
                i_want=us_data.get('i_want', ''),
                so_that=us_data.get('so_that', ''),
                acceptance_criteria=us_data.get('acceptance_criteria', []),
                story_points=us_data.get('story_points')
            )
            user_stories.append(user_story)
        
        # Parse tech stack
        tech_stack_data = analysis.get('tech_stack', {})
        tech_stack = TechnologyStackRecommendation(
            name=tech_stack_data.get('name', 'Custom Stack'),
            frontend=tech_stack_data.get('frontend'),
            backend=tech_stack_data.get('backend'),
            database=tech_stack_data.get('database', 'PostgreSQL'),
            reasoning=tech_stack_data.get('reasoning', ''),
            additional_tools=tech_stack_data.get('additional_tools', [])
        )
        
        # Convert platforms
        platforms = []
        for p in target_platforms:
            try:
                platforms.append(Platform(p.lower()))
            except ValueError:
                self.logger.warning(f"Invalid platform: {p}")
        
        if not platforms:
            platforms = [Platform.WEB]
        
        # Create project
        project = SoftwareProject(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=f"Project: {description[:50]}...",
            description=description,
            project_type=ProjectType(analysis.get('project_type', 'web_app')),
            platforms=platforms,
            complexity_level=ComplexityLevel(analysis.get('complexity_level', 'moderate')),
            features=features,
            user_stories=user_stories,
            recommended_tech_stack=tech_stack,
            architecture_type=ArchitectureType(analysis.get('architecture_type', 'spa')),
            estimated_timeline=analysis.get('estimated_timeline', '1-2 months'),
            estimated_budget=analysis.get('estimated_budget', '$10,000 - $50,000'),
            ai_confidence_score=0.85
        )
        
        return project
    
    def _convert_plan_to_project(self, plan: Any, user_id: str) -> SoftwareProject:
        """Convert old SoftwareProjectPlan to new SoftwareProject format."""
        
        # Convert tech stack
        tech_stack = TechnologyStackRecommendation(
            name=plan.recommended_tech_stack.get('name', 'Custom Stack'),
            frontend=plan.recommended_tech_stack.get('frontend'),
            backend=plan.recommended_tech_stack.get('backend'),
            database=plan.recommended_tech_stack.get('database', 'PostgreSQL'),
            reasoning=plan.recommended_tech_stack.get('reasoning', ''),
            additional_tools=plan.recommended_tech_stack.get('additional_tools', [])
        )
        
        # Create project
        project = SoftwareProject(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=f"Software Project Plan",
            description="Generated project plan",
            project_type=plan.project_type,
            platforms=plan.platforms,
            complexity_level=plan.complexity_level,
            features=plan.features,
            user_stories=plan.user_stories,
            recommended_tech_stack=tech_stack,
            architecture_type=ArchitectureType(plan.architecture_type) if hasattr(ArchitectureType, plan.architecture_type.upper()) else ArchitectureType.SPA,
            estimated_timeline=plan.estimated_timeline,
            estimated_budget=plan.estimated_budget
        )
        
        return project
    
    async def generate_architecture_diagram(
        self,
        project_id: str,
        diagram_type: str = "flowchart",
        include_database: bool = True,
        include_frontend: bool = True,
        include_backend: bool = True
    ) -> ArchitectureDiagram:
        """
        Generate Mermaid architecture diagram for project.
        
        Args:
            project_id: Project ID
            diagram_type: Type of diagram (flowchart, sequence, class)
            include_database: Include database in diagram
            include_frontend: Include frontend components
            include_backend: Include backend components
            
        Returns:
            ArchitectureDiagram with Mermaid code
        """
        self.logger.info(f"Generating architecture diagram for project {project_id}")
        
        # Get project
        project = await SoftwareProjectCRUD.get_project(project_id)
        if not project:
            raise ValueError(f"Project not found: {project_id}")
        
        # Generate Mermaid diagram
        mermaid_code = self._generate_mermaid_diagram(
            project, diagram_type, include_database, include_frontend, include_backend
        )
        
        # Create diagram object
        diagram = ArchitectureDiagram(
            project_id=project_id,
            diagram_type=diagram_type,
            mermaid_code=mermaid_code,
            description=f"{diagram_type.capitalize()} diagram for {project.title}",
            components=self._extract_components(project)
        )
        
        return diagram
    
    def _generate_mermaid_diagram(
        self,
        project: SoftwareProject,
        diagram_type: str,
        include_database: bool,
        include_frontend: bool,
        include_backend: bool
    ) -> str:
        """Generate Mermaid diagram code."""
        
        if diagram_type == "flowchart":
            return self._generate_flowchart(project, include_database, include_frontend, include_backend)
        elif diagram_type == "sequence":
            return self._generate_sequence_diagram(project)
        elif diagram_type == "class":
            return self._generate_class_diagram(project)
        elif diagram_type == "er":
            return self._generate_er_diagram(project)
        else:
            return self._generate_flowchart(project, include_database, include_frontend, include_backend)
    
    def _generate_flowchart(
        self,
        project: SoftwareProject,
        include_database: bool,
        include_frontend: bool,
        include_backend: bool
    ) -> str:
        """Generate flowchart diagram in Mermaid format."""
        
        lines = ["graph TD"]
        
        # User/Client
        lines.append("    User[👤 User/Client]")
        
        # Frontend
        if include_frontend:
            frontend_tech = project.recommended_tech_stack.frontend if project.recommended_tech_stack else "Frontend"
            lines.append(f"    Frontend[🖥️ {frontend_tech}<br/>Frontend Application]")
            lines.append("    User -->|Interacts| Frontend")
        
        # Backend
        if include_backend:
            backend_tech = project.recommended_tech_stack.backend if project.recommended_tech_stack else "Backend"
            lines.append(f"    Backend[⚙️ {backend_tech}<br/>Backend API]")
            
            if include_frontend:
                lines.append("    Frontend -->|API Calls| Backend")
            else:
                lines.append("    User -->|API Calls| Backend")
        
        # Database
        if include_database:
            db_tech = project.recommended_tech_stack.database if project.recommended_tech_stack else "Database"
            lines.append(f"    Database[(🗄️ {db_tech}<br/>Database)]")
            
            if include_backend:
                lines.append("    Backend -->|Queries| Database")
            else:
                lines.append("    Frontend -->|Queries| Database")
        
        # Authentication
        if any(f for f in project.features if 'auth' in f.name.lower() or 'login' in f.name.lower()):
            lines.append("    Auth[🔐 Authentication<br/>Service]")
            if include_backend:
                lines.append("    Backend -->|Verify| Auth")
            else:
                lines.append("    Frontend -->|Verify| Auth")
        
        # Payment (if e-commerce)
        if any(f for f in project.features if 'payment' in f.name.lower() or 'checkout' in f.name.lower()):
            lines.append("    Payment[💳 Payment<br/>Gateway]")
            if include_backend:
                lines.append("    Backend -->|Process| Payment")
            else:
                lines.append("    Frontend -->|Process| Payment")
        
        # Styling
        lines.extend([
            "    classDef userClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px",
            "    classDef frontendClass fill:#fff3e0,stroke:#e65100,stroke-width:2px",
            "    classDef backendClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px",
            "    classDef dbClass fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px",
            "    class User userClass",
            "    class Frontend frontendClass",
            "    class Backend backendClass",
            "    class Database dbClass"
        ])
        
        return "\n".join(lines)
    
    def _generate_sequence_diagram(self, project: SoftwareProject) -> str:
        """Generate sequence diagram."""
        lines = ["sequenceDiagram"]
        lines.append("    participant User")
        lines.append("    participant Frontend")
        lines.append("    participant Backend")
        lines.append("    participant Database")
        lines.append("")
        lines.append("    User->>Frontend: Access Application")
        lines.append("    Frontend->>Backend: API Request")
        lines.append("    Backend->>Database: Query Data")
        lines.append("    Database-->>Backend: Return Data")
        lines.append("    Backend-->>Frontend: API Response")
        lines.append("    Frontend-->>User: Display Result")
        
        return "\n".join(lines)
    
    def _generate_class_diagram(self, project: SoftwareProject) -> str:
        """Generate class diagram."""
        lines = ["classDiagram"]
        lines.append("    class User {")
        lines.append("        +String id")
        lines.append("        +String email")
        lines.append("        +String name")
        lines.append("    }")
        
        # Add classes based on features
        for feature in project.features[:5]:  # Limit to first 5
            class_name = feature.name.replace(' ', '')
            lines.append(f"    class {class_name} {{")
            lines.append("        +String id")
            lines.append(f"        +{feature.description[:50]}")
            lines.append("    }")
        
        return "\n".join(lines)
    
    def _generate_er_diagram(self, project: SoftwareProject) -> str:
        """Generate Entity-Relationship diagram."""
        lines = ["erDiagram"]
        lines.append("    USER ||--o{ PROJECT : creates")
        lines.append("    USER {")
        lines.append("        string id PK")
        lines.append("        string email")
        lines.append("        string name")
        lines.append("    }")
        lines.append("    PROJECT {")
        lines.append("        string id PK")
        lines.append("        string user_id FK")
        lines.append("        string title")
        lines.append("        text description")
        lines.append("    }")
        
        return "\n".join(lines)
    
    def _extract_components(self, project: SoftwareProject) -> List[str]:
        """Extract components list from project."""
        components = []
        
        if project.recommended_tech_stack:
            if project.recommended_tech_stack.frontend:
                components.append(project.recommended_tech_stack.frontend)
            if project.recommended_tech_stack.backend:
                components.append(project.recommended_tech_stack.backend)
            if project.recommended_tech_stack.database:
                components.append(project.recommended_tech_stack.database)
        
        return components
    
    async def generate_database_schema(
        self,
        project_id: str,
        database_type: str = "postgresql"
    ) -> DatabaseSchema:
        """
        Generate database schema for project.
        
        Args:
            project_id: Project ID
            database_type: Database type (postgresql, mongodb, mysql)
            
        Returns:
            DatabaseSchema with table definitions and SQL
        """
        self.logger.info(f"Generating database schema for project {project_id}")
        
        # Get project
        project = await SoftwareProjectCRUD.get_project(project_id)
        if not project:
            raise ValueError(f"Project not found: {project_id}")
        
        # Generate schema based on features
        tables = self._generate_tables_from_features(project.features)
        relationships = self._generate_relationships(tables)
        indexes = self._generate_indexes(tables)
        
        # Generate SQL
        schema_sql = None
        schema_json = None
        
        if database_type in ['postgresql', 'mysql', 'sqlite']:
            schema_sql = self._generate_sql_schema(tables, relationships, indexes, database_type)
        elif database_type in ['mongodb', 'firebase']:
            schema_json = self._generate_nosql_schema(tables)
        
        # Create schema object
        schema = DatabaseSchema(
            project_id=project_id,
            database_type=database_type,
            tables=tables,
            relationships=relationships,
            indexes=indexes,
            schema_sql=schema_sql,
            schema_json=schema_json
        )
        
        return schema
    
    def _generate_tables_from_features(self, features: List[Feature]) -> List[Dict[str, Any]]:
        """Generate table definitions from features."""
        tables = []
        
        # Always include users table
        tables.append({
            "name": "users",
            "columns": [
                {"name": "id", "type": "UUID", "primary_key": True, "default": "gen_random_uuid()"},
                {"name": "email", "type": "VARCHAR(255)", "unique": True, "not_null": True},
                {"name": "password_hash", "type": "VARCHAR(255)", "not_null": True},
                {"name": "name", "type": "VARCHAR(200)"},
                {"name": "created_at", "type": "TIMESTAMP", "default": "NOW()"},
                {"name": "updated_at", "type": "TIMESTAMP", "default": "NOW()"}
            ]
        })
        
        # Generate tables based on features
        for feature in features:
            if 'product' in feature.name.lower() or 'catalog' in feature.name.lower():
                tables.append({
                    "name": "products",
                    "columns": [
                        {"name": "id", "type": "UUID", "primary_key": True},
                        {"name": "name", "type": "VARCHAR(200)", "not_null": True},
                        {"name": "description", "type": "TEXT"},
                        {"name": "price", "type": "DECIMAL(10,2)", "not_null": True},
                        {"name": "stock_quantity", "type": "INTEGER", "default": "0"},
                        {"name": "image_url", "type": "VARCHAR(500)"},
                        {"name": "created_at", "type": "TIMESTAMP", "default": "NOW()"}
                    ]
                })
            
            elif 'cart' in feature.name.lower() or 'order' in feature.name.lower():
                tables.append({
                    "name": "orders",
                    "columns": [
                        {"name": "id", "type": "UUID", "primary_key": True},
                        {"name": "user_id", "type": "UUID", "not_null": True, "foreign_key": {"table": "users", "column": "id"}},
                        {"name": "total_amount", "type": "DECIMAL(10,2)", "not_null": True},
                        {"name": "status", "type": "VARCHAR(50)", "default": "'pending'"},
                        {"name": "created_at", "type": "TIMESTAMP", "default": "NOW()"}
                    ]
                })
            
            elif 'post' in feature.name.lower() or 'feed' in feature.name.lower():
                tables.append({
                    "name": "posts",
                    "columns": [
                        {"name": "id", "type": "UUID", "primary_key": True},
                        {"name": "user_id", "type": "UUID", "not_null": True, "foreign_key": {"table": "users", "column": "id"}},
                        {"name": "content", "type": "TEXT", "not_null": True},
                        {"name": "image_url", "type": "VARCHAR(500)"},
                        {"name": "likes_count", "type": "INTEGER", "default": "0"},
                        {"name": "created_at", "type": "TIMESTAMP", "default": "NOW()"}
                    ]
                })
        
        return tables
    
    def _generate_relationships(self, tables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate foreign key relationships."""
        relationships = []
        
        for table in tables:
            for column in table.get('columns', []):
                if 'foreign_key' in column:
                    relationships.append({
                        "from_table": table['name'],
                        "from_column": column['name'],
                        "to_table": column['foreign_key']['table'],
                        "to_column": column['foreign_key']['column'],
                        "on_delete": "CASCADE"
                    })
        
        return relationships
    
    def _generate_indexes(self, tables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate index definitions."""
        indexes = []
        
        for table in tables:
            # Index on foreign keys
            for column in table.get('columns', []):
                if 'foreign_key' in column:
                    indexes.append({
                        "table": table['name'],
                        "columns": [column['name']],
                        "name": f"idx_{table['name']}_{column['name']}"
                    })
            
            # Index on created_at
            if any(col['name'] == 'created_at' for col in table.get('columns', [])):
                indexes.append({
                    "table": table['name'],
                    "columns": ['created_at'],
                    "name": f"idx_{table['name']}_created_at",
                    "order": "DESC"
                })
        
        return indexes
    
    def _generate_sql_schema(
        self,
        tables: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]],
        indexes: List[Dict[str, Any]],
        database_type: str
    ) -> str:
        """Generate SQL schema."""
        lines = []
        lines.append(f"-- Database Schema for {database_type}")
        lines.append(f"-- Generated: {datetime.now(timezone.utc).isoformat()}")
        lines.append("")
        
        # Create tables
        for table in tables:
            lines.append(f"CREATE TABLE {table['name']} (")
            
            column_defs = []
            for column in table['columns']:
                col_def = f"    {column['name']} {column['type']}"
                
                if column.get('primary_key'):
                    col_def += " PRIMARY KEY"
                if column.get('not_null'):
                    col_def += " NOT NULL"
                if column.get('unique'):
                    col_def += " UNIQUE"
                if column.get('default'):
                    col_def += f" DEFAULT {column['default']}"
                
                column_defs.append(col_def)
            
            lines.append(",\n".join(column_defs))
            lines.append(");")
            lines.append("")
        
        # Create indexes
        for index in indexes:
            columns_str = ', '.join(index['columns'])
            order_str = f" {index['order']}" if index.get('order') else ""
            lines.append(f"CREATE INDEX {index['name']} ON {index['table']}({columns_str}{order_str});")
        
        return "\n".join(lines)
    
    def _generate_nosql_schema(self, tables: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate NoSQL schema (MongoDB/Firebase format)."""
        collections = {}
        
        for table in tables:
            schema = {
                "type": "object",
                "properties": {},
                "required": []
            }
            
            for column in table['columns']:
                prop_type = self._sql_to_json_type(column['type'])
                schema['properties'][column['name']] = {"type": prop_type}
                
                if column.get('not_null'):
                    schema['required'].append(column['name'])
            
            collections[table['name']] = schema
        
        return collections
    
    def _sql_to_json_type(self, sql_type: str) -> str:
        """Convert SQL type to JSON Schema type."""
        sql_type = sql_type.upper()
        
        if 'INT' in sql_type:
            return "integer"
        elif 'DECIMAL' in sql_type or 'FLOAT' in sql_type or 'DOUBLE' in sql_type:
            return "number"
        elif 'BOOL' in sql_type:
            return "boolean"
        elif 'TIMESTAMP' in sql_type or 'DATE' in sql_type:
            return "string"  # ISO date string
        else:
            return "string"
    
    async def generate_api_specification(
        self,
        project_id: str,
        include_authentication: bool = True
    ) -> APISpecification:
        """
        Generate OpenAPI specification for project.
        
        Args:
            project_id: Project ID
            include_authentication: Include auth endpoints
            
        Returns:
            APISpecification with OpenAPI format
        """
        self.logger.info(f"Generating API specification for project {project_id}")
        
        # Get project
        project = await SoftwareProjectCRUD.get_project(project_id)
        if not project:
            raise ValueError(f"Project not found: {project_id}")
        
        # Generate endpoints
        endpoints = self._generate_api_endpoints(project.features, include_authentication)
        
        # Generate OpenAPI spec
        openapi_spec = self._generate_openapi_spec(project, endpoints)
        
        # Create specification object
        spec = APISpecification(
            project_id=project_id,
            title=f"{project.title} API",
            version="1.0.0",
            description=f"API specification for {project.title}",
            base_url="https://api.example.com/v1",
            endpoints=endpoints,
            authentication_scheme="JWT" if include_authentication else None,
            openapi_spec=openapi_spec
        )
        
        return spec
    
    def _generate_api_endpoints(
        self,
        features: List[Feature],
        include_authentication: bool
    ) -> List[APIEndpoint]:
        """Generate API endpoints from features."""
        endpoints = []
        
        # Authentication endpoints
        if include_authentication:
            endpoints.extend([
                APIEndpoint(
                    method="POST",
                    path="/auth/register",
                    description="Register a new user",
                    request_body={"email": "string", "password": "string", "name": "string"},
                    response_body={"user_id": "string", "token": "string"},
                    status_codes={"201": "Created", "400": "Bad Request", "409": "Conflict"}
                ),
                APIEndpoint(
                    method="POST",
                    path="/auth/login",
                    description="Login user",
                    request_body={"email": "string", "password": "string"},
                    response_body={"user_id": "string", "token": "string"},
                    status_codes={"200": "OK", "401": "Unauthorized"}
                )
            ])
        
        # Feature-based endpoints
        for feature in features:
            if 'product' in feature.name.lower():
                endpoints.extend([
                    APIEndpoint(
                        method="GET",
                        path="/products",
                        description="Get all products",
                        response_body={"products": "array"},
                        query_parameters=[{"name": "page", "type": "integer"}, {"name": "limit", "type": "integer"}],
                        status_codes={"200": "OK"}
                    ),
                    APIEndpoint(
                        method="GET",
                        path="/products/{id}",
                        description="Get product by ID",
                        response_body={"id": "string", "name": "string", "price": "number"},
                        status_codes={"200": "OK", "404": "Not Found"}
                    ),
                    APIEndpoint(
                        method="POST",
                        path="/products",
                        description="Create new product",
                        request_body={"name": "string", "price": "number", "description": "string"},
                        authentication="JWT",
                        status_codes={"201": "Created", "401": "Unauthorized"}
                    )
                ])
        
        return endpoints
    
    def _generate_openapi_spec(
        self,
        project: SoftwareProject,
        endpoints: List[APIEndpoint]
    ) -> Dict[str, Any]:
        """Generate OpenAPI 3.0 specification."""
        
        spec = {
            "openapi": "3.0.0",
            "info": {
                "title": f"{project.title} API",
                "version": "1.0.0",
                "description": project.description
            },
            "servers": [
                {"url": "https://api.example.com/v1", "description": "Production"},
                {"url": "http://localhost:8001/api", "description": "Development"}
            ],
            "paths": {}
        }
        
        # Add endpoints to paths
        for endpoint in endpoints:
            if endpoint.path not in spec['paths']:
                spec['paths'][endpoint.path] = {}
            
            spec['paths'][endpoint.path][endpoint.method.lower()] = {
                "summary": endpoint.description,
                "responses": {
                    code: {"description": desc}
                    for code, desc in endpoint.status_codes.items()
                }
            }
            
            if endpoint.request_body:
                spec['paths'][endpoint.path][endpoint.method.lower()]['requestBody'] = {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": endpoint.request_body
                            }
                        }
                    }
                }
        
        return spec


# Export singleton instance
enhanced_planning_service = EnhancedSoftwarePlanningService()
