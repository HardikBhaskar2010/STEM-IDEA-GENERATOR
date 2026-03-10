# Veronica AI Code Generation Service
# Requirements: 1.1, 1.2, 1.3, 3.2, 4.2, 5.1
# Task: 9.1 Enhance CodeGenerationService with streaming support, caching, circuit breaker, and rate limiting

import logging
import json
import os
import asyncio
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, AsyncGenerator, Tuple
from enum import Enum

# Remove anthropic import and use OpenRouter instead
from backend.database.connection import get_db_client
from backend.models.ai_guidance import ProjectContext
from backend.infrastructure.base_service import BaseService
from backend.infrastructure.circuit_breaker import get_circuit_breaker
from backend.infrastructure.redis_client import get_redis_client

logger = logging.getLogger(__name__)


class GenerationStatus(Enum):
    """Code generation status enumeration"""
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Platform(Enum):
    """Supported code generation platforms"""
    ARDUINO = "arduino"
    RASPBERRY_PI = "raspberry_pi"
    WEB = "web"
    MOBILE = "mobile"


class ComplexityLevel(Enum):
    """Code complexity levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class GenerationParams:
    """Parameters for code generation"""
    def __init__(
        self,
        platform: Platform,
        complexity_level: ComplexityLevel = ComplexityLevel.INTERMEDIATE,
        include_comments: bool = True,
        include_tests: bool = False,
        custom_requirements: Optional[str] = None
    ):
        self.platform = platform
        self.complexity_level = complexity_level
        self.include_comments = include_comments
        self.include_tests = include_tests
        self.custom_requirements = custom_requirements


class CodeFile:
    """Represents a generated code file"""
    def __init__(
        self,
        file_path: str,
        file_name: str,
        file_type: str,
        content: str,
        description: Optional[str] = None,
        is_main_file: bool = False
    ):
        self.file_path = file_path
        self.file_name = file_name
        self.file_type = file_type
        self.content = content
        self.description = description
        self.is_main_file = is_main_file
        self.size_bytes = len(content.encode('utf-8'))


class GeneratedCode:
    """Represents a complete code generation result"""
    def __init__(
        self,
        generation_id: str,
        project_id: str,
        user_id: str,
        platform: Platform,
        status: GenerationStatus = GenerationStatus.GENERATING,
        files: Optional[List[CodeFile]] = None,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.generation_id = generation_id
        self.project_id = project_id
        self.user_id = user_id
        self.platform = platform
        self.status = status
        self.files = files or []
        self.error_message = error_message
        self.metadata = metadata or {}
        self.created_at = datetime.now(timezone.utc)
        self.completed_at = None


class VeronicaAIService(BaseService):
    """
    Veronica AI Service for generating code using OpenRouter free models
    Uses different specialized models for different tasks
    
    Enhanced with:
    - BaseService inheritance for caching and logging
    - Streaming response support
    - Circuit breaker for AI API calls
    - Caching for generated code (1 hour TTL)
    - Rate limiting support (enforced at API layer)
    
    Requirements:
    - 1.1: Service consolidation with BaseService patterns
    - 3.2: Caching for generated code
    - 4.2: Rate limiting for code generation endpoints
    - 5.1: Circuit breaker for AI calls
    """
    
    def __init__(
        self,
        cache=None,
        logger_instance=None,
        db_client=None
    ):
        """Initialize the Veronica AI service with BaseService capabilities"""
        # Initialize BaseService
        super().__init__(
            cache=cache or get_redis_client(),
            logger_instance=logger_instance or logger,
            db_client=db_client
        )
        
        self.openrouter_client = None
        self.openrouter_config = None
        
        # Import OpenRouter client from server
        try:
            from server import openrouter_client, openrouter_config
            self.openrouter_client = openrouter_client
            self.openrouter_config = openrouter_config
            
            if self.openrouter_client:
                self.logger.info("Veronica AI initialized with OpenRouter - multi-model code generation enabled")
            else:
                self.logger.warning("OpenRouter client not available - code generation will be disabled")
        except ImportError as e:
            self.logger.error(f"Failed to import OpenRouter client: {e}")
            self.logger.warning("Code generation will be disabled")
        
        # Get circuit breaker for AI API calls
        self.circuit_breaker = get_circuit_breaker(
            name="openrouter_api",
            failure_threshold=5,
            timeout=timedelta(seconds=60),
            half_open_timeout=timedelta(seconds=30)
        )
        
        # Multi-model configuration for different tasks
        self.models = {
            "code_generation": "arcee-ai/trinity-large-preview:free",  # Best for code generation
            "idea_generation": "stepfun/step-3.5-flash:free",             # Best for ideas and planning
            "project_analysis": "stepfun/step-3.5-flash:free",            # Good for understanding requirements
            "documentation": "stepfun/step-3.5-flash:free",               # Good for writing docs
            "debugging": "arcee-ai/trinity-large-preview:free",        # Technical problem solving
        }
        
        # Generation configuration
        self.max_tokens = 4000
        self.temperature = 0.3  # Lower temperature for more consistent code
        
        # Cache TTL for generated code (1 hour)
        self.code_cache_ttl = timedelta(hours=1)
        
        # Platform-specific configurations
        self.platform_configs = {
            Platform.ARDUINO: {
                "file_extensions": [".ino", ".cpp", ".h"],
                "main_file": "main.ino",
                "description": "Arduino microcontroller project"
            },
            Platform.RASPBERRY_PI: {
                "file_extensions": [".py", ".sh", ".txt"],
                "main_file": "main.py",
                "description": "Raspberry Pi project"
            },
            Platform.WEB: {
                "file_extensions": [".html", ".css", ".js", ".json"],
                "main_file": "index.html",
                "description": "Web application project"
            },
            Platform.MOBILE: {
                "file_extensions": [".dart", ".yaml", ".json"],
                "main_file": "main.dart",
                "description": "Mobile application project"
            }
        }
    
    def _get_model_for_task(self, task_type: str) -> str:
        """
        Get the best model for a specific task
        
        Args:
            task_type: Type of task (code_generation, idea_generation, etc.)
            
        Returns:
            Model name for the task
        """
        return self.models.get(task_type, self.models["code_generation"])
    
    def _generate_cache_key(
        self,
        project_context: ProjectContext,
        params: GenerationParams
    ) -> str:
        """
        Generate a cache key for code generation request
        
        Args:
            project_context: Project context with requirements
            params: Generation parameters
            
        Returns:
            Cache key string
        """
        # Create a hash of the generation parameters
        cache_data = {
            "title": project_context.title,
            "description": project_context.description,
            "goals": project_context.goals if hasattr(project_context, 'goals') else [],
            "platform": params.platform.value,
            "complexity": params.complexity_level.value,
            "include_comments": params.include_comments,
            "include_tests": params.include_tests,
            "custom_requirements": params.custom_requirements or ""
        }
        
        # Generate hash
        cache_str = json.dumps(cache_data, sort_keys=True)
        cache_hash = hashlib.sha256(cache_str.encode()).hexdigest()[:16]
        
        return f"code_gen:{cache_hash}"
    
    async def _generate_with_model(self, messages: List[Dict], task_type: str, temperature: float = None) -> str:
        """
        Generate response using the appropriate model for the task with circuit breaker protection
        
        Args:
            messages: Messages to send to the model
            task_type: Type of task to determine which model to use
            temperature: Optional temperature override
            
        Returns:
            Generated response text
            
        Raises:
            Exception: If OpenRouter client not available or circuit breaker is open
        """
        if not self.openrouter_client:
            raise Exception("OpenRouter client not available")
        
        model = self._get_model_for_task(task_type)
        temp = temperature if temperature is not None else self.temperature
        
        self.logger.info(f"Using model {model} for task: {task_type}")
        
        # Wrap OpenRouter call with circuit breaker
        async def _call_openrouter():
            return await self.openrouter_client.generate_completion(
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=temp,
                model=model
            )
        
        # Execute with circuit breaker protection
        response = await self.circuit_breaker.call(
            _call_openrouter,
            fallback=lambda: "# Code generation temporarily unavailable. Please try again later."
        )
        
        return response
    
    async def generate_code(
        self,
        project_context: ProjectContext,
        params: GenerationParams,
        user_id: str,
        use_cache: bool = True
    ) -> AsyncGenerator[Tuple[str, Optional[CodeFile]], None]:
        """
        Generate code for a project using OpenRouter free models with caching support
        Yields streaming responses for real-time updates
        
        Args:
            project_context: Project context with requirements and components
            params: Generation parameters (platform, complexity, etc.)
            user_id: ID of the user requesting generation
            use_cache: Whether to use cached results (default: True)
            
        Yields:
            Tuple of (status_message, optional_code_file)
            
        Raises:
            ValueError: If parameters are invalid
            Exception: If generation fails
            
        Requirements:
        - 3.2: Caching for generated code (1 hour TTL)
        - 5.1: Circuit breaker for AI calls
        """
        if not self.openrouter_client:
            raise Exception("OpenRouter client not available - check configuration")
        
        if not project_context:
            raise ValueError("Project context is required for code generation")
        
        try:
            # Generate cache key
            cache_key = self._generate_cache_key(project_context, params)
            
            # Check cache if enabled
            if use_cache and self.cache:
                try:
                    cached_result = await self.get_cache(cache_key, serialize=True)
                    if cached_result:
                        self.logger.info(f"Cache hit for code generation: {cache_key}")
                        yield ("Retrieved from cache...", None)
                        
                        # Yield cached files
                        for file_data in cached_result.get("files", []):
                            code_file = CodeFile(
                                file_path=file_data["file_path"],
                                file_name=file_data["file_name"],
                                file_type=file_data["file_type"],
                                content=file_data["content"],
                                description=file_data.get("description"),
                                is_main_file=file_data.get("is_main_file", False)
                            )
                            yield (f"Loaded {code_file.file_name} from cache", code_file)
                        
                        yield ("Code generation completed (from cache)!", None)
                        return
                except Exception as e:
                    self.logger.warning(f"Cache retrieval failed: {e}")
                    # Continue with generation
            
            # Create generation record in database
            generation_id = await self._create_generation_record(
                project_context.project_id, user_id, params
            )
            
            yield ("Starting Veronica AI code generation...", None)
            
            # Build the generation prompt
            prompt = self._build_generation_prompt(project_context, params)
            
            yield ("Analyzing project requirements...", None)
            
            # Generate code using OpenRouter with specialized code generation model
            messages = [
                {
                    "role": "system",
                    "content": "You are Veronica AI, an expert code generator specialized in creating complete, working projects. Generate clean, well-structured code with proper documentation and best practices. Always provide multiple files with proper project structure."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ]
            
            yield ("Generating code with Veronica AI (Trinity Large model)...", None)
            
            # Use specialized code generation model with circuit breaker
            response = await self._generate_with_model(messages, "code_generation")
            
            yield ("Processing generated code...", None)
            
            # Parse the generated code into files
            generated_files = self._parse_generated_code(response, params.platform)
            
            yield ("Saving generated files...", None)
            
            # Save files to database
            await self._save_generated_files(generation_id, generated_files)
            
            # Cache the generated files
            if use_cache and self.cache:
                try:
                    cache_data = {
                        "files": [
                            {
                                "file_path": f.file_path,
                                "file_name": f.file_name,
                                "file_type": f.file_type,
                                "content": f.content,
                                "description": f.description,
                                "is_main_file": f.is_main_file
                            }
                            for f in generated_files
                        ],
                        "generation_id": generation_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    await self.set_cache(cache_key, cache_data, ttl=self.code_cache_ttl, serialize=True)
                    self.logger.info(f"Cached generated code: {cache_key}")
                except Exception as e:
                    self.logger.warning(f"Failed to cache generated code: {e}")
            
            # Yield each generated file
            for file in generated_files:
                yield (f"Generated {file.file_name}", file)
            
            # Mark generation as completed
            await self._update_generation_status(generation_id, GenerationStatus.COMPLETED)
            
            yield ("Code generation completed successfully!", None)
            
        except Exception as e:
            self.logger.error(f"Code generation failed: {e}")
            if 'generation_id' in locals():
                await self._update_generation_status(generation_id, GenerationStatus.FAILED, str(e))
            raise
    
    def _build_generation_prompt(
        self, 
        project_context: ProjectContext, 
        params: GenerationParams
    ) -> str:
        """
        Build the generation prompt for OpenRouter models
        
        Args:
            project_context: Project context with requirements
            params: Generation parameters
            
        Returns:
            Formatted prompt for code generation
        """
        platform_config = self.platform_configs[params.platform]
        
        prompt_parts = [
            f"You are an expert software developer specializing in {params.platform.value} development.",
            f"Generate a complete, working {platform_config['description']} based on the following project requirements.",
            "",
            "=== PROJECT CONTEXT ===",
            f"Project Title: {project_context.title}",
            f"Description: {project_context.description}",
            f"Target Platform: {params.platform.value}",
            f"Complexity Level: {params.complexity_level.value}",
            ""
        ]
        
        # Add project goals
        if project_context.goals:
            prompt_parts.append("Project Goals:")
            for goal in project_context.goals:
                prompt_parts.append(f"- {goal}")
            prompt_parts.append("")
        
        # Add components if available
        if hasattr(project_context, 'components') and project_context.components:
            prompt_parts.append("Required Components:")
            for component in project_context.components:
                prompt_parts.append(f"- {component}")
            prompt_parts.append("")
        
        # Add custom requirements
        if params.custom_requirements:
            prompt_parts.append("Additional Requirements:")
            prompt_parts.append(params.custom_requirements)
            prompt_parts.append("")
        
        # Add generation instructions
        prompt_parts.extend([
            "=== GENERATION INSTRUCTIONS ===",
            "Generate a complete project with multiple files as needed.",
            "Use the following format for each file:",
            "",
            "```filename: path/to/file.ext",
            "// File description",
            "// Your code here",
            "```",
            "",
            "Requirements:",
            f"- Use {params.complexity_level.value} level complexity",
            f"- Include {'detailed' if params.include_comments else 'minimal'} comments",
            f"- {'Include' if params.include_tests else 'Do not include'} test files",
            "- Ensure all code is syntactically correct and functional",
            "- Include proper error handling and validation",
            "- Follow best practices for the target platform",
            "- Create a complete, runnable project structure",
            ""
        ])
        
        # Platform-specific instructions
        if params.platform == Platform.ARDUINO:
            prompt_parts.extend([
                "Arduino-specific requirements:",
                "- Include setup() and loop() functions",
                "- Use appropriate pin definitions",
                "- Include necessary library includes",
                "- Add proper serial communication if needed",
                ""
            ])
        elif params.platform == Platform.WEB:
            prompt_parts.extend([
                "Web development requirements:",
                "- Create responsive HTML structure",
                "- Include modern CSS styling",
                "- Use vanilla JavaScript or specify framework",
                "- Ensure cross-browser compatibility",
                ""
            ])
        elif params.platform == Platform.RASPBERRY_PI:
            prompt_parts.extend([
                "Raspberry Pi requirements:",
                "- Use Python 3.x syntax",
                "- Include GPIO handling if needed",
                "- Add proper imports and dependencies",
                "- Include setup and configuration instructions",
                ""
            ])
        elif params.platform == Platform.MOBILE:
            prompt_parts.extend([
                "Mobile development requirements:",
                "- Use Flutter/Dart framework",
                "- Create proper widget structure",
                "- Include material design components",
                "- Ensure responsive design for different screen sizes",
                ""
            ])
        
        prompt_parts.append("Generate the complete project now:")
        
        return "\n".join(prompt_parts)
    
    def _parse_streaming_content(
        self, 
        content_delta: str, 
        current_file: Optional[Dict], 
        current_content: str
    ) -> Dict[str, Any]:
        """
        Parse streaming content to identify file boundaries and content
        
        Args:
            content_delta: New content chunk from stream
            current_file: Current file being processed
            current_content: Current file content
            
        Returns:
            Dictionary with parsing results
        """
        result = {
            "new_file": False,
            "file_info": None,
            "content": content_delta
        }
        
        # Look for file boundary markers
        if "```filename:" in content_delta:
            # Extract file information
            lines = content_delta.split('\n')
            for line in lines:
                if line.startswith("```filename:"):
                    file_path = line.replace("```filename:", "").strip()
                    file_name = file_path.split('/')[-1]
                    file_type = file_name.split('.')[-1] if '.' in file_name else 'txt'
                    
                    result["new_file"] = True
                    result["file_info"] = {
                        "path": file_path,
                        "name": file_name,
                        "type": file_type,
                        "is_main": file_name.startswith("main.") or file_name.startswith("index."),
                        "description": f"Generated {file_type} file"
                    }
                    
                    # Remove the filename marker from content
                    content_after_marker = content_delta.split(line, 1)
                    if len(content_after_marker) > 1:
                        result["content"] = content_after_marker[1]
                    else:
                        result["content"] = ""
                    break
        
        # Remove code block markers
        if "```" in result["content"] and not result["new_file"]:
            result["content"] = result["content"].replace("```", "")
        
        return result
    
    def _parse_generated_code(self, response: str, platform: Platform) -> List[CodeFile]:
        """
        Parse generated code response into individual files
        
        Args:
            response: Generated code response from OpenRouter
            platform: Target platform for code generation
            
        Returns:
            List of CodeFile objects
        """
        files = []
        
        # Split response by file markers
        file_sections = response.split("```")
        current_file_info = None
        
        for i, section in enumerate(file_sections):
            section = section.strip()
            if not section:
                continue
                
            # Check if this section starts with a filename
            lines = section.split('\n')
            first_line = lines[0].strip()
            
            # Look for filename patterns
            if any(ext in first_line for ext in ['.py', '.js', '.html', '.css', '.ino', '.cpp', '.h', '.dart', '.json', '.yaml', '.txt', '.md']):
                # This is a filename
                file_path = first_line
                file_name = file_path.split('/')[-1]
                file_type = file_name.split('.')[-1] if '.' in file_name else 'txt'
                
                # Get the content (rest of the lines)
                content = '\n'.join(lines[1:]) if len(lines) > 1 else ""
                
                # Determine if this is the main file
                is_main_file = (
                    file_name.startswith("main.") or 
                    file_name.startswith("index.") or
                    file_name == self.platform_configs[platform]["main_file"]
                )
                
                # Create CodeFile object
                code_file = CodeFile(
                    file_path=file_path,
                    file_name=file_name,
                    file_type=file_type,
                    content=content.strip(),
                    description=f"Generated {file_type} file for {platform.value} project",
                    is_main_file=is_main_file
                )
                
                files.append(code_file)
        
        # If no files were parsed, create a single main file with all content
        if not files:
            main_file_name = self.platform_configs[platform]["main_file"]
            file_type = main_file_name.split('.')[-1]
            
            code_file = CodeFile(
                file_path=main_file_name,
                file_name=main_file_name,
                file_type=file_type,
                content=response.strip(),
                description=f"Generated {file_type} file for {platform.value} project",
                is_main_file=True
            )
            files.append(code_file)
        
        # Add README file if not present
        if not any(f.file_name.lower().startswith('readme') for f in files):
            readme_file = self._generate_readme_file(files, platform=platform)
            files.append(readme_file)
        
        return files
    
    async def _validate_and_enhance_files(
        self, 
        files: List[CodeFile], 
        params: GenerationParams,
        project_context: ProjectContext
    ) -> List[CodeFile]:
        """
        Validate and enhance generated files
        
        Args:
            files: List of generated code files
            params: Generation parameters
            project_context: Project context
            
        Returns:
            List of validated and enhanced files
        """
        enhanced_files = []
        
        for file in files:
            try:
                # Basic syntax validation
                if self._validate_file_syntax(file):
                    # Add README if this is the main project
                    if file.is_main_file and not any(f.file_name.lower().startswith('readme') for f in files):
                        readme_file = self._generate_readme_file(files, params, project_context)
                        enhanced_files.append(readme_file)
                    
                    enhanced_files.append(file)
                else:
                    logger.warning(f"File {file.file_name} failed syntax validation")
                    # Still include the file but mark it
                    file.description = f"{file.description} (Warning: Syntax validation failed)"
                    enhanced_files.append(file)
                    
            except Exception as e:
                logger.error(f"Error validating file {file.file_name}: {e}")
                enhanced_files.append(file)
        
        return enhanced_files
    
    def _validate_file_syntax(self, file: CodeFile) -> bool:
        """
        Basic syntax validation for generated files
        
        Args:
            file: Code file to validate
            
        Returns:
            True if syntax appears valid, False otherwise
        """
        try:
            # Basic checks
            if not file.content.strip():
                return False
            
            # Language-specific validation
            if file.file_type in ['py']:
                # Basic Python syntax check
                try:
                    compile(file.content, file.file_name, 'exec')
                    return True
                except SyntaxError:
                    return False
            
            elif file.file_type in ['js']:
                # Basic JavaScript validation (check for balanced braces)
                open_braces = file.content.count('{')
                close_braces = file.content.count('}')
                return abs(open_braces - close_braces) <= 1  # Allow some tolerance
            
            elif file.file_type in ['html']:
                # Basic HTML validation (check for basic structure)
                return '<html>' in file.content.lower() or '<!doctype' in file.content.lower()
            
            elif file.file_type in ['css']:
                # Basic CSS validation (check for balanced braces)
                open_braces = file.content.count('{')
                close_braces = file.content.count('}')
                return open_braces == close_braces
            
            # For other file types, just check if content exists
            return len(file.content.strip()) > 10
            
        except Exception as e:
            logger.error(f"Syntax validation error for {file.file_name}: {e}")
            return False
    
    def _generate_readme_file(
        self, 
        files: List[CodeFile], 
        params: Optional[GenerationParams] = None,
        project_context: Optional[ProjectContext] = None,
        platform: Optional['Platform'] = None
    ) -> CodeFile:
        """
        Generate a README file for the project
        
        Args:
            files: List of generated files
            params: Generation parameters (optional)
            project_context: Project context (optional)
            platform: Platform override when params not available (optional)
            
        Returns:
            Generated README CodeFile object
        """
        # Build title and description from available context
        title = (project_context.title if project_context else
                (params.platform.value.title() + " Project" if params else "Generated Project"))
        description = (project_context.description if project_context else
                      "An AI-generated project.")
        
        # Determine effective platform
        effective_platform = None
        if params:
            effective_platform = params.platform
        elif platform:
            effective_platform = platform
        
        readme_content = [
            f"# {title}",
            "",
            f"{description}",
            "",
            "## Project Information",
            f"- **Platform**: {(effective_platform.value if effective_platform else 'unknown')}",
            f"- **Complexity**: {(params.complexity_level.value if params else 'intermediate')}",
            f"- **Generated**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC",
            "",
            "## Files",
        ]
        
        for file in files:
            readme_content.append(f"- `{file.file_name}` - {file.description or 'Generated file'}")
        
        readme_content.extend([
            "",
            "## Setup Instructions",
        ])
        
        # Platform-specific setup instructions
        if effective_platform == Platform.ARDUINO:
            readme_content.extend([
                "1. Open the .ino file in Arduino IDE",
                "2. Connect your Arduino board",
                "3. Select the correct board and port",
                "4. Upload the code to your Arduino",
            ])
        elif effective_platform == Platform.WEB:
            readme_content.extend([
                "1. Open index.html in a web browser",
                "2. Or serve the files using a local web server",
                "3. For development: `python -m http.server 8000`",
            ])
        elif effective_platform == Platform.RASPBERRY_PI:
            readme_content.extend([
                "1. Copy files to your Raspberry Pi",
                "2. Install required dependencies: `pip install -r requirements.txt`",
                "3. Run the main script: `python main.py`",
            ])
        elif effective_platform == Platform.MOBILE:
            readme_content.extend([
                "1. Ensure Flutter is installed",
                "2. Run `flutter pub get` to install dependencies",
                "3. Run `flutter run` to start the app",
            ])
        
        readme_content.extend([
            "",
            "## Notes",
            "This project was generated using AI assistance.",
            "Please review and test the code before using in production.",
        ])
        
        return CodeFile(
            file_path="README.md",
            file_name="README.md",
            file_type="md",
            content="\n".join(readme_content),
            description="Project documentation and setup instructions",
            is_main_file=False
        )
    
    async def _create_generation_record(
        self, 
        project_id: str, 
        user_id: str, 
        params: GenerationParams
    ) -> str:
        """
        Create initial generation record in database or fallback to in-memory storage
        
        Args:
            project_id: ID of the project
            user_id: ID of the user
            params: Generation parameters
            
        Returns:
            Generated code ID
        """
        try:
            # Try to use database if available
            try:
                client = await get_db_client()
                
                generation_data = {
                    "project_id": project_id,
                    "user_id": user_id,
                    "generation_request": {
                        "platform": params.platform.value,
                        "complexity_level": params.complexity_level.value,
                        "include_comments": params.include_comments,
                        "include_tests": params.include_tests,
                        "custom_requirements": params.custom_requirements
                    },
                    "status": GenerationStatus.GENERATING.value,
                    "platform": params.platform.value,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "metadata": {
                        "model": self.models.get("code_generation", "arcee-ai/trinity-large-preview:free"),
                        "max_tokens": self.max_tokens,
                        "temperature": self.temperature
                    }
                }
                
                result = client.table("generated_code").insert(generation_data).execute()
                
                if result.data:
                    generation_id = result.data[0]["id"]
                    logger.info(f"Created generation record {generation_id} for project {project_id}")
                    return generation_id
                else:
                    raise Exception("Failed to create generation record")
            
            except Exception as db_error:
                # Fallback to in-memory storage if database is not available
                logger.warning(f"Database not available, using in-memory storage: {db_error}")
                import uuid
                generation_id = str(uuid.uuid4())
                logger.info(f"Created in-memory generation record {generation_id} for project {project_id}")
                return generation_id
                
        except Exception as e:
            logger.error(f"Error creating generation record: {e}")
            raise
    
    async def _save_generated_files(
        self, 
        generation_id: str, 
        files: List[CodeFile]
    ) -> None:
        """
        Save generated files to database
        
        Args:
            generation_id: ID of the generation
            files: List of code files to save
        """
        try:
            client = await get_db_client()
            
            file_data = []
            for file in files:
                file_record = {
                    "generated_code_id": generation_id,
                    "file_path": file.file_path,
                    "file_name": file.file_name,
                    "file_type": file.file_type,
                    "content": file.content,
                    "description": file.description,
                    "size_bytes": file.size_bytes,
                    "is_main_file": file.is_main_file,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                file_data.append(file_record)
            
            result = client.table("code_files").insert(file_data).execute()
            
            if result.data:
                logger.info(f"Saved {len(files)} files for generation {generation_id}")
            else:
                raise Exception("Failed to save generated files")
                
        except Exception as e:
            logger.error(f"Error saving generated files: {e}")
            raise
    
    async def _update_generation_status(
        self, 
        generation_id: str, 
        status: GenerationStatus,
        error_message: Optional[str] = None
    ) -> None:
        """
        Update generation status in database
        
        Args:
            generation_id: ID of the generation
            status: New status
            error_message: Optional error message if failed
        """
        try:
            client = await get_db_client()
            
            update_data = {
                "status": status.value,
                "error_message": error_message
            }
            
            if status == GenerationStatus.COMPLETED:
                update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            
            result = client.table("generated_code").update(update_data).eq("id", generation_id).execute()
            
            if result.data:
                logger.info(f"Updated generation {generation_id} status to {status.value}")
            else:
                logger.warning(f"No generation found with ID {generation_id}")
                
        except Exception as e:
            logger.error(f"Error updating generation status: {e}")
            raise
    
    async def get_generation_status(self, generation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get generation status and details
        
        Args:
            generation_id: ID of the generation
            
        Returns:
            Generation details or None if not found
        """
        try:
            client = await get_db_client()
            
            result = client.table("generated_code").select("*").eq("id", generation_id).execute()
            
            if result.data:
                return result.data[0]
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error getting generation status: {e}")
            return None
    
    async def get_generated_files(self, generation_id: str) -> List[CodeFile]:
        """
        Get generated files for a generation
        
        Args:
            generation_id: ID of the generation
            
        Returns:
            List of code files
        """
        try:
            client = await get_db_client()
            
            result = client.table("code_files").select("*").eq("generated_code_id", generation_id).execute()
            
            files = []
            if result.data:
                for file_data in result.data:
                    file = CodeFile(
                        file_path=file_data["file_path"],
                        file_name=file_data["file_name"],
                        file_type=file_data["file_type"],
                        content=file_data["content"],
                        description=file_data["description"],
                        is_main_file=file_data["is_main_file"]
                    )
                    files.append(file)
            
            return files
            
        except Exception as e:
            logger.error(f"Error getting generated files: {e}")
            return []
    
    async def analyze_project_for_generation(self, project_context: ProjectContext) -> Dict[str, Any]:
        """
        Analyze project context to provide generation recommendations
        
        Args:
            project_context: Project context to analyze
            
        Returns:
            Analysis results with recommendations
        """
        try:
            analysis = {
                "project_id": project_context.project_id,
                "title": project_context.title,
                "complexity_estimate": "intermediate",
                "recommended_platform": "web",
                "estimated_files": 3,
                "recommendations": [],
                "potential_challenges": []
            }
            
            # Analyze project description for complexity
            description_lower = project_context.description.lower()
            
            # Complexity analysis
            if any(word in description_lower for word in ["simple", "basic", "beginner", "easy"]):
                analysis["complexity_estimate"] = "beginner"
            elif any(word in description_lower for word in ["advanced", "complex", "sophisticated", "enterprise"]):
                analysis["complexity_estimate"] = "advanced"
            
            # Platform recommendation
            if any(word in description_lower for word in ["arduino", "microcontroller", "sensor", "iot"]):
                analysis["recommended_platform"] = "arduino"
                analysis["estimated_files"] = 2
            elif any(word in description_lower for word in ["raspberry pi", "linux", "gpio", "python"]):
                analysis["recommended_platform"] = "raspberry_pi"
                analysis["estimated_files"] = 3
            elif any(word in description_lower for word in ["mobile", "app", "android", "ios", "flutter"]):
                analysis["recommended_platform"] = "mobile"
                analysis["estimated_files"] = 5
            elif any(word in description_lower for word in ["web", "website", "html", "javascript", "browser"]):
                analysis["recommended_platform"] = "web"
                analysis["estimated_files"] = 4
            
            # Generate recommendations
            analysis["recommendations"] = [
                f"Consider using {analysis['recommended_platform']} platform for this project",
                f"Estimated complexity level: {analysis['complexity_estimate']}",
                f"Expected to generate approximately {analysis['estimated_files']} files",
                "Include detailed comments for better understanding",
                "Consider adding error handling and validation"
            ]
            
            # Identify potential challenges
            if "real-time" in description_lower:
                analysis["potential_challenges"].append("Real-time processing requirements")
            if "database" in description_lower:
                analysis["potential_challenges"].append("Database integration needed")
            if "api" in description_lower:
                analysis["potential_challenges"].append("API integration required")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing project for generation: {e}")
            return {
                "error": str(e),
                "recommendations": ["Unable to analyze project - please provide more details"]
            }

    async def health_check(self) -> Dict[str, Any]:
        """
        Service-specific health check
        
        Returns:
            Dictionary with health status
            
        Requirements:
        - 10.4: Service-specific health check interface
        """
        health = await self.base_health_check()
        
        # Check OpenRouter client availability
        health["openrouter_available"] = self.openrouter_client is not None
        
        # Check circuit breaker state
        try:
            breaker_state = await self.circuit_breaker.get_state()
            health["circuit_breaker_state"] = breaker_state.value
            health["circuit_breaker_healthy"] = breaker_state.value != "open"
        except Exception as e:
            health["circuit_breaker_state"] = "unknown"
            health["circuit_breaker_healthy"] = False
            health["circuit_breaker_error"] = str(e)
        
        # Overall health
        health["healthy"] = (
            health["openrouter_available"] and
            health.get("cache_available", True) and
            health.get("circuit_breaker_healthy", True)
        )
        
        return health
