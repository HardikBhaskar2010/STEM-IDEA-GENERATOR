# Request Validator
# Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7

"""
Centralized request validation with Pydantic models.

This module provides the RequestValidator class for validating and sanitizing
incoming requests, supporting partial validation for PATCH requests, and
providing detailed validation error responses.
"""

from typing import Dict, Any, List, Optional, Type
from pydantic import BaseModel, ValidationError as PydanticValidationError
import html
import re


class ValidationError(Exception):
    """Custom validation error with detailed error information"""
    
    def __init__(self, errors: List[Dict[str, Any]]):
        self.errors = errors
        super().__init__(f"Validation failed with {len(errors)} error(s)")


class RequestValidator:
    """
    Centralized request validation using Pydantic models.
    
    Provides methods for:
    - Full validation against Pydantic models
    - Partial validation for PATCH requests
    - Input sanitization for XSS/injection prevention
    - Pagination parameter validation
    """
    
    @staticmethod
    def validate(
        data: Dict[str, Any],
        model: Type[BaseModel]
    ) -> BaseModel:
        """
        Validate request data against a Pydantic model.
        
        Args:
            data: Dictionary of request data to validate
            model: Pydantic model class to validate against
            
        Returns:
            Validated Pydantic model instance
            
        Raises:
            ValidationError: If validation fails with detailed error information
            
        Requirements: 6.1, 6.2
        """
        try:
            return model(**data)
        except PydanticValidationError as e:
            # Transform Pydantic errors into our custom format
            errors = []
            for error in e.errors():
                field_path = ".".join(str(loc) for loc in error["loc"])
                error_detail = {
                    "field": field_path,
                    "message": error["msg"],
                    "type": error["type"],
                }
                
                # Add context information if available
                if "ctx" in error:
                    error_detail["context"] = error["ctx"]
                
                errors.append(error_detail)
            
            raise ValidationError(errors)
    
    @staticmethod
    def validate_partial(
        data: Dict[str, Any],
        model: Type[BaseModel],
        fields: Optional[List[str]] = None
    ) -> Any:
        """
        Validate only specified fields for PATCH requests.
        
        This method allows partial validation where only the fields present
        in the data are validated, making it suitable for PATCH operations.
        
        Args:
            data: Dictionary of request data to validate
            model: Pydantic model class to validate against
            fields: Optional list of field names to validate. If None, validates all present fields.
            
        Returns:
            Object with validated fields as attributes
            
        Raises:
            ValidationError: If validation fails with detailed error information
            
        Requirements: 6.4
        """
        try:
            # If specific fields are provided, filter data to only those fields
            if fields is not None:
                filtered_data = {k: v for k, v in data.items() if k in fields}
            else:
                filtered_data = data
            
            # Validate each field individually
            validated_data = {}
            errors = []
            
            for field_name, field_value in filtered_data.items():
                # Check if field exists in model
                if field_name not in model.model_fields:
                    errors.append({
                        "field": field_name,
                        "message": f"Field '{field_name}' is not defined in model",
                        "type": "value_error.extra"
                    })
                    continue
                
                # Get the field info
                field_info = model.model_fields[field_name]
                
                # Try to validate the field value using Pydantic's validation
                try:
                    # Create a minimal model instance with just this field to validate it properly
                    # We'll use model_validate with a dict that has default/None for other fields
                    from pydantic_core import PydanticUndefined
                    
                    temp_dict = {field_name: field_value}
                    
                    # Add default values for other required fields to allow validation
                    for other_field_name, other_field_info in model.model_fields.items():
                        if other_field_name != field_name and other_field_name not in temp_dict:
                            # Use default if available (check for PydanticUndefined)
                            if hasattr(other_field_info, 'default') and other_field_info.default is not PydanticUndefined:
                                temp_dict[other_field_name] = other_field_info.default
                            elif hasattr(other_field_info, 'default_factory') and other_field_info.default_factory is not None:
                                temp_dict[other_field_name] = other_field_info.default_factory()
                            else:
                                # For required fields without defaults, provide type-appropriate placeholders
                                # Get the annotation - handle both direct types and Optional types
                                import typing
                                annotation = other_field_info.annotation
                                
                                # Handle Optional types
                                origin = typing.get_origin(annotation)
                                if origin is typing.Union:
                                    args = typing.get_args(annotation)
                                    # Get the first non-None type
                                    annotation = next((arg for arg in args if arg is not type(None)), str)
                                
                                # Provide appropriate defaults based on type
                                if annotation == str or annotation == 'str':
                                    temp_dict[other_field_name] = "placeholder"
                                elif annotation == int or annotation == 'int':
                                    temp_dict[other_field_name] = 1
                                elif annotation == float or annotation == 'float':
                                    temp_dict[other_field_name] = 1.0
                                elif annotation == bool or annotation == 'bool':
                                    temp_dict[other_field_name] = True
                                else:
                                    temp_dict[other_field_name] = None
                    
                    # Validate using the model
                    temp_model = model.model_validate(temp_dict)
                    validated_value = getattr(temp_model, field_name)
                    validated_data[field_name] = validated_value
                    
                except PydanticValidationError as e:
                    # Only report errors for the field we're validating
                    for error in e.errors():
                        if error["loc"][0] == field_name:
                            field_path = ".".join(str(loc) for loc in error["loc"])
                            error_detail = {
                                "field": field_path,
                                "message": error["msg"],
                                "type": error["type"],
                            }
                            if "ctx" in error:
                                error_detail["context"] = error["ctx"]
                            errors.append(error_detail)
            
            if errors:
                raise ValidationError(errors)
            
            # Return a simple object with the validated fields
            class PartialModel:
                def __init__(self, data):
                    for key, value in data.items():
                        setattr(self, key, value)
                
                def __repr__(self):
                    attrs = ', '.join(f'{k}={v!r}' for k, v in self.__dict__.items())
                    return f'PartialModel({attrs})'
            
            return PartialModel(validated_data)
            
        except ValidationError:
            raise
        except Exception as e:
            # Catch any other unexpected errors
            raise ValidationError([{
                "field": "unknown",
                "message": str(e),
                "type": "value_error"
            }])
    
    @staticmethod
    def sanitize_input(data: str) -> str:
        """
        Sanitize user input to prevent XSS and injection attacks.
        
        This method:
        - HTML-escapes special characters to prevent XSS
        - Removes potentially dangerous SQL injection patterns
        - Strips null bytes and control characters
        
        Args:
            data: String input to sanitize
            
        Returns:
            Sanitized string safe for storage and display
            
        Requirements: 6.3, 13.5
        """
        if not isinstance(data, str):
            return data
        
        # Remove null bytes and control characters (except newlines and tabs)
        sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', data)
        
        # HTML escape to prevent XSS
        sanitized = html.escape(sanitized, quote=True)
        
        # Remove common SQL injection patterns (basic protection)
        # Note: This is defense in depth; parameterized queries are the primary defense
        sql_patterns = [
            r'(\bUNION\b.*\bSELECT\b)',
            r'(\bDROP\b.*\bTABLE\b)',
            r'(\bINSERT\b.*\bINTO\b)',
            r'(\bDELETE\b.*\bFROM\b)',
            r'(\bUPDATE\b.*\bSET\b)',
            r'(--\s)',
            r'(;\s*$)',
        ]
        
        for pattern in sql_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        return sanitized
    
    @staticmethod
    def validate_pagination(
        limit: int,
        offset: int,
        max_limit: int = 100
    ) -> tuple[int, int]:
        """
        Validate and normalize pagination parameters.
        
        Args:
            limit: Number of items to return
            offset: Number of items to skip
            max_limit: Maximum allowed limit value (default: 100)
            
        Returns:
            Tuple of (validated_limit, validated_offset)
            
        Raises:
            ValidationError: If pagination parameters are invalid
            
        Requirements: 6.7
        """
        errors = []
        
        # Validate limit
        if limit < 1:
            errors.append({
                "field": "limit",
                "message": "Limit must be at least 1",
                "type": "value_error.number.not_ge",
                "context": {"limit_value": 1}
            })
        
        # Validate offset
        if offset < 0:
            errors.append({
                "field": "offset",
                "message": "Offset must be non-negative",
                "type": "value_error.number.not_ge",
                "context": {"limit_value": 0}
            })
        
        if errors:
            raise ValidationError(errors)
        
        # Normalize limit to max_limit if it exceeds (don't raise error, just cap it)
        normalized_limit = min(limit, max_limit)
        
        return (normalized_limit, offset)
    
    @staticmethod
    def create_error_response(
        validation_error: ValidationError
    ) -> Dict[str, Any]:
        """
        Create a detailed validation error response.
        
        Args:
            validation_error: ValidationError instance with error details
            
        Returns:
            Dictionary with structured error information suitable for API response
            
        Requirements: 6.2, 6.5, 6.6
        """
        return {
            "error": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": {
                "errors": validation_error.errors,
                "error_count": len(validation_error.errors)
            }
        }


# Example validation models for common request types

class PaginationParams(BaseModel):
    """Standard pagination parameters"""
    limit: int = 50
    offset: int = 0
    
    class Config:
        extra = "forbid"


class ChatMessageRequest(BaseModel):
    """Request model for chat messages"""
    session_id: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        extra = "forbid"
    
    @classmethod
    def validate_content(cls, v):
        if not v.strip():
            raise ValueError('Content cannot be empty')
        return v.strip()


class ProjectCreateRequest(BaseModel):
    """Request model for creating projects"""
    title: str
    description: str
    project_type: str
    difficulty: str
    user_id: str
    
    class Config:
        extra = "forbid"
    
    @classmethod
    def validate_project_type(cls, v):
        allowed = ['iot', 'robotics', 'web', 'mobile', 'general']
        if v not in allowed:
            raise ValueError(f'Invalid project type. Must be one of {allowed}')
        return v
