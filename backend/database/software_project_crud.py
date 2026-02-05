# Software Project CRUD Operations  
# Phase 1: Backend Foundation - Supabase Database Operations

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from database.connection import get_db_client
from models.software_project import (
    SoftwareProject,
    ArchitectureDiagram,
    DatabaseSchema,
    APISpecification,
    CodeTemplate
)

logger = logging.getLogger(__name__)


# Helper function to convert Supabase response to model
def dict_to_model(data: Dict[str, Any], model_class):
    """Convert dictionary from Supabase to Pydantic model"""
    try:
        # Convert timestamp strings to datetime if needed
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
        
        return model_class(**data)
    except Exception as e:
        logger.error(f"Error converting dict to model: {e}")
        logger.error(f"Data: {data}")
        raise


class SoftwareProjectCRUD:
    """CRUD operations for software projects"""
    
    @staticmethod
    async def create_project(project: SoftwareProject) -> str:
        """
        Create a new software project
        
        Args:
            project: Software project model
            
        Returns:
            Project ID
        """
        try:
            client = await get_db_client()
            
            project_data = project.dict()
            project_data['created_at'] = datetime.now(timezone.utc).isoformat()
            project_data['updated_at'] = datetime.now(timezone.utc).isoformat()
            
            result = client.table('software_projects').insert(project_data).execute()
            
            if result.data:
                logger.info(f"Created software project {project.id}")
                return result.data[0]['id']
            else:
                raise Exception("Failed to create project")
                
        except Exception as e:
            logger.error(f"Error creating project: {e}")
            raise
    
    @staticmethod
    async def get_project(project_id: str) -> Optional[SoftwareProject]:
        """
        Get software project by ID
        
        Args:
            project_id: Project ID
            
        Returns:
            Software project or None
        """
        try:
            client = await get_db_client()
            
            result = client.table('software_projects').select('*').eq('id', project_id).execute()
            
            if result.data:
                return SoftwareProject(**result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting project {project_id}: {e}")
            return None
    
    @staticmethod
    async def get_user_projects(user_id: str, limit: int = 50) -> List[SoftwareProject]:
        """
        Get all projects for a user
        
        Args:
            user_id: User ID
            limit: Maximum number of projects to return
            
        Returns:
            List of software projects
        """
        try:
            client = await get_db_client()
            
            result = client.table('software_projects') \
                .select('*') \
                .eq('user_id', user_id) \
                .order('created_at', desc=True) \
                .limit(limit) \
                .execute()
            
            projects = []
            if result.data:
                for data in result.data:
                    projects.append(SoftwareProject(**data))
            
            return projects
            
        except Exception as e:
            logger.error(f"Error getting projects for user {user_id}: {e}")
            return []
    
    @staticmethod
    async def update_project(project_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update software project
        
        Args:
            project_id: Project ID
            updates: Fields to update
            
        Returns:
            True if successful
        """
        try:
            client = await get_db_client()
            
            updates['updated_at'] = datetime.now(timezone.utc).isoformat()
            
            result = client.table('software_projects') \
                .update(updates) \
                .eq('id', project_id) \
                .execute()
            
            if result.data:
                logger.info(f"Updated project {project_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error updating project {project_id}: {e}")
            return False
    
    @staticmethod
    async def delete_project(project_id: str) -> bool:
        """
        Delete software project
        
        Args:
            project_id: Project ID
            
        Returns:
            True if successful
        """
        try:
            client = await get_db_client()
            
            result = client.table('software_projects').delete().eq('id', project_id).execute()
            
            if result.data:
                logger.info(f"Deleted project {project_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error deleting project {project_id}: {e}")
            return False


class ArchitectureDiagramCRUD:
    """CRUD operations for architecture diagrams"""
    
    @staticmethod
    async def create_diagram(diagram: ArchitectureDiagram) -> str:
        """Create architecture diagram"""
        try:
            client = await get_db_client()
            
            diagram_data = diagram.dict()
            result = client.table('architecture_diagrams').insert(diagram_data).execute()
            
            if result.data:
                return result.data[0]['id']
            raise Exception("Failed to create diagram")
            
        except Exception as e:
            logger.error(f"Error creating diagram: {e}")
            raise
    
    @staticmethod
    async def get_project_diagrams(project_id: str) -> List[ArchitectureDiagram]:
        """Get all diagrams for a project"""
        try:
            client = await get_db_client()
            
            result = client.table('architecture_diagrams') \
                .select('*') \
                .eq('project_id', project_id) \
                .execute()
            
            diagrams = []
            if result.data:
                for data in result.data:
                    diagrams.append(ArchitectureDiagram(**data))
            
            return diagrams
            
        except Exception as e:
            logger.error(f"Error getting diagrams: {e}")
            return []


class DatabaseSchemaCRUD:
    """CRUD operations for database schemas"""
    
    @staticmethod
    async def create_schema(schema: DatabaseSchema) -> str:
        """Create database schema"""
        try:
            client = await get_db_client()
            
            schema_data = schema.dict()
            result = client.table('database_schemas').insert(schema_data).execute()
            
            if result.data:
                return result.data[0]['id']
            raise Exception("Failed to create schema")
            
        except Exception as e:
            logger.error(f"Error creating schema: {e}")
            raise
    
    @staticmethod
    async def get_project_schema(project_id: str) -> Optional[DatabaseSchema]:
        """Get database schema for a project"""
        try:
            client = await get_db_client()
            
            result = client.table('database_schemas') \
                .select('*') \
                .eq('project_id', project_id) \
                .order('created_at', desc=True) \
                .limit(1) \
                .execute()
            
            if result.data:
                return DatabaseSchema(**result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting schema: {e}")
            return None


class APISpecificationCRUD:
    """CRUD operations for API specifications"""
    
    @staticmethod
    async def create_specification(spec: APISpecification) -> str:
        """Create API specification"""
        try:
            client = await get_db_client()
            
            spec_data = spec.dict()
            result = client.table('api_specifications').insert(spec_data).execute()
            
            if result.data:
                return result.data[0]['id']
            raise Exception("Failed to create specification")
            
        except Exception as e:
            logger.error(f"Error creating API spec: {e}")
            raise
    
    @staticmethod
    async def get_project_specification(project_id: str) -> Optional[APISpecification]:
        """Get API specification for a project"""
        try:
            client = await get_db_client()
            
            result = client.table('api_specifications') \
                .select('*') \
                .eq('project_id', project_id) \
                .order('created_at', desc=True) \
                .limit(1) \
                .execute()
            
            if result.data:
                return APISpecification(**result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting API spec: {e}")
            return None


class CodeTemplateCRUD:
    """CRUD operations for code templates"""
    
    @staticmethod
    async def get_templates_by_platform(platform: str) -> List[CodeTemplate]:
        """Get all templates for a platform"""
        try:
            client = await get_db_client()
            
            result = client.table('code_templates') \
                .select('*') \
                .eq('platform', platform) \
                .execute()
            
            templates = []
            if result.data:
                for data in result.data:
                    templates.append(CodeTemplate(**data))
            
            return templates
            
        except Exception as e:
            logger.error(f"Error getting templates: {e}")
            return []
    
    @staticmethod
    async def create_template(template: CodeTemplate) -> str:
        """Create code template"""
        try:
            client = await get_db_client()
            
            template_data = template.dict()
            result = client.table('code_templates').insert(template_data).execute()
            
            if result.data:
                return result.data[0]['id']
            raise Exception("Failed to create template")
            
        except Exception as e:
            logger.error(f"Error creating template: {e}")
            raise
