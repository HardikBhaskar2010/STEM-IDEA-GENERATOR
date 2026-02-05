# AI Code Generation Integration Design

## Architecture Overview

This design document outlines the technical architecture for integrating Buddy's AI code generation capabilities into the existing STEM Idea Adventure platform. The integration will maintain the existing React/FastAPI architecture while adding new code generation services and UI components.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/TypeScript)              │
├─────────────────────────────────────────────────────────────┤
│  Existing Components          │  New Code Generation        │
│  ├── Home/Dashboard          │  ├── CodeGenerationModal    │
│  ├── ProjectGenerator        │  ├── CodeEditor             │
│  ├── ComponentLibrary        │  ├── FileTreeView           │
│  ├── UniversalChat           │  ├── LivePreview            │
│  ├── 3D Visualizations       │  └── CodeStreamingView      │
│  └── Learning Hub            │                             │
├─────────────────────────────────────────────────────────────┤
│                    Backend (FastAPI/Python)                 │
├─────────────────────────────────────────────────────────────┤
│  Existing Services           │  New Code Generation         │
│  ├── AI Guidance Service    │  ├── Code Generation Service │
│  ├── Project Service        │  ├── File Management Service │
│  ├── Chat Service           │  ├── Preview Service         │
│  ├── Component Service      │  └── Streaming Service       │
│  └── Auth Service           │                             │
├─────────────────────────────────────────────────────────────┤
│                    Database (Supabase/PostgreSQL)           │
├─────────────────────────────────────────────────────────────┤
│  Existing Tables            │  New Tables                  │
│  ├── projects               │  ├── generated_code          │
│  ├── components             │  ├── code_files              │
│  ├── chat_history           │  ├── generation_history      │
│  ├── users                  │  └── file_metadata          │
│  └── user_preferences       │                             │
└─────────────────────────────────────────────────────────────┘
```

### Integration Strategy

The integration follows a **hybrid approach**:
1. **Preserve existing functionality** - All current features remain unchanged
2. **Add new capabilities** - Code generation features are added as new modules
3. **Shared services** - Leverage existing authentication, database, and AI services
4. **Consistent UI** - New components follow existing design patterns and themes

## Database Design

### New Tables

#### generated_code
```sql
CREATE TABLE generated_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    generation_request JSONB NOT NULL, -- Original request parameters
    status VARCHAR(20) DEFAULT 'generating', -- generating, completed, failed
    platform VARCHAR(50) NOT NULL, -- arduino, raspberry_pi, web, mobile
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_generated_code_project_id ON generated_code(project_id);
CREATE INDEX idx_generated_code_user_id ON generated_code(user_id);
CREATE INDEX idx_generated_code_status ON generated_code(status);
```

#### code_files
```sql
CREATE TABLE code_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_code_id UUID REFERENCES generated_code(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL, -- relative path within project
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- js, py, cpp, html, css, etc.
    content TEXT NOT NULL,
    description TEXT,
    size_bytes INTEGER,
    is_main_file BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_code_files_generated_code_id ON code_files(generated_code_id);
CREATE INDEX idx_code_files_file_type ON code_files(file_type);
```

#### generation_history
```sql
CREATE TABLE generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    generated_code_id UUID REFERENCES generated_code(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- generate, regenerate, modify, download
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generation_history_user_id ON generation_history(user_id);
CREATE INDEX idx_generation_history_project_id ON generation_history(project_id);
```

#### file_metadata
```sql
CREATE TABLE file_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_file_id UUID REFERENCES code_files(id) ON DELETE CASCADE,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    is_modified BOOLEAN DEFAULT FALSE,
    original_content TEXT, -- backup of original AI-generated content
    modification_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Schema Updates to Existing Tables

#### projects table additions
```sql
ALTER TABLE projects ADD COLUMN has_generated_code BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN code_generation_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN last_code_generated_at TIMESTAMP WITH TIME ZONE;
```

## API Design

### New Endpoints

#### Code Generation Endpoints

```python
# Start code generation for a project
POST /api/projects/{project_id}/generate-code
{
    "platform": "arduino|raspberry_pi|web|mobile",
    "complexity_level": "beginner|intermediate|advanced",
    "include_comments": true,
    "include_tests": false,
    "custom_requirements": "Additional specific requirements"
}

# Get code generation status
GET /api/projects/{project_id}/code-generation/{generation_id}

# Stream code generation progress (WebSocket)
WS /api/projects/{project_id}/code-generation/{generation_id}/stream

# Get generated files for a project
GET /api/projects/{project_id}/generated-code
GET /api/projects/{project_id}/generated-code/{generation_id}/files

# File operations
GET /api/generated-code/{generation_id}/files/{file_id}
PUT /api/generated-code/{generation_id}/files/{file_id}
DELETE /api/generated-code/{generation_id}/files/{file_id}

# Download operations
GET /api/generated-code/{generation_id}/download/zip
GET /api/generated-code/{generation_id}/files/{file_id}/download
```

#### Integration with Existing Chat API

```python
# Enhanced chat endpoint with code generation support
POST /api/chat/message
{
    "message": "Generate Arduino code for my robot project",
    "context": {
        "project_id": "uuid",
        "current_generated_code_id": "uuid",
        "action_type": "code_generation"
    }
}
```

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── code-generation/
│   │   ├── CodeGenerationModal.tsx
│   │   ├── CodeGenerationButton.tsx
│   │   ├── StreamingCodeView.tsx
│   │   ├── FileTreeView.tsx
│   │   ├── CodeEditor.tsx
│   │   ├── LivePreview.tsx
│   │   ├── FileOperations.tsx
│   │   └── GenerationHistory.tsx
│   │
│   ├── enhanced-existing/
│   │   ├── EnhancedProjectCard.tsx      # Add code generation status
│   │   ├── EnhancedProjectDetail.tsx    # Add code tabs
│   │   ├── EnhancedUniversalChat.tsx    # Add code generation commands
│   │   └── EnhancedGenerator.tsx        # Add generate code option
│   │
│   └── ui/ (existing components)
│
├── services/
│   ├── codeGenerationService.ts
│   ├── fileManagementService.ts
│   ├── streamingService.ts
│   └── previewService.ts
│
├── hooks/
│   ├── useCodeGeneration.ts
│   ├── useFileOperations.ts
│   ├── useStreamingCode.ts
│   └── useLivePreview.ts
│
└── types/
    ├── codeGeneration.ts
    └── fileManagement.ts
```

### Key Components Design

#### CodeGenerationModal.tsx
```typescript
interface CodeGenerationModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onGenerationStart: (params: GenerationParams) => void;
}

interface GenerationParams {
  platform: 'arduino' | 'raspberry_pi' | 'web' | 'mobile';
  complexityLevel: 'beginner' | 'intermediate' | 'advanced';
  includeComments: boolean;
  includeTests: boolean;
  customRequirements?: string;
}
```

#### StreamingCodeView.tsx
```typescript
interface StreamingCodeViewProps {
  generationId: string;
  onComplete: (files: CodeFile[]) => void;
  onError: (error: string) => void;
}

// Handles real-time streaming of code generation
// Shows animated loading states consistent with existing 3D theme
// Displays partial code as it's being generated
```

#### FileTreeView.tsx
```typescript
interface FileTreeViewProps {
  files: CodeFile[];
  selectedFile: CodeFile | null;
  onFileSelect: (file: CodeFile) => void;
  onFileOperation: (operation: FileOperation, file: CodeFile) => void;
}

interface CodeFile {
  id: string;
  path: string;
  name: string;
  type: string;
  content: string;
  description?: string;
  isMainFile: boolean;
  isModified: boolean;
}
```

### State Management

#### Code Generation Context
```typescript
interface CodeGenerationContextType {
  // Current generation state
  currentGeneration: GeneratedCode | null;
  isGenerating: boolean;
  generationProgress: GenerationProgress;
  
  // File management
  files: CodeFile[];
  selectedFile: CodeFile | null;
  
  // Operations
  startGeneration: (projectId: string, params: GenerationParams) => Promise<void>;
  selectFile: (file: CodeFile) => void;
  updateFile: (fileId: string, content: string) => Promise<void>;
  downloadFile: (file: CodeFile) => void;
  downloadProject: (generationId: string) => void;
  
  // Preview
  previewHtml: string;
  refreshPreview: () => void;
}
```

## Backend Services

### Code Generation Service

```python
class CodeGenerationService:
    def __init__(self, anthropic_client: AnthropicClient, db: Database):
        self.anthropic_client = anthropic_client
        self.db = db
    
    async def generate_code(
        self, 
        project: Project, 
        params: GenerationParams,
        user_id: str
    ) -> AsyncGenerator[str, None]:
        """
        Generate code for a project using Anthropic Claude API
        Yields streaming responses for real-time updates
        """
        
    async def create_generation_record(
        self, 
        project_id: str, 
        user_id: str, 
        params: GenerationParams
    ) -> GeneratedCode:
        """Create initial generation record in database"""
        
    async def save_generated_files(
        self, 
        generation_id: str, 
        files: List[CodeFile]
    ) -> None:
        """Save generated files to database"""
        
    async def get_project_generations(
        self, 
        project_id: str
    ) -> List[GeneratedCode]:
        """Get all code generations for a project"""
```

### File Management Service

```python
class FileManagementService:
    async def create_zip_archive(
        self, 
        generation_id: str
    ) -> bytes:
        """Create ZIP archive of all project files"""
        
    async def update_file_content(
        self, 
        file_id: str, 
        new_content: str,
        user_id: str
    ) -> CodeFile:
        """Update file content and track modifications"""
        
    async def track_file_download(
        self, 
        file_id: str, 
        user_id: str
    ) -> None:
        """Track file download for analytics"""
        
    def generate_readme(
        self, 
        project: Project, 
        files: List[CodeFile]
    ) -> str:
        """Generate README.md with setup instructions"""
```

### Streaming Service

```python
class StreamingService:
    async def stream_code_generation(
        self, 
        generation_id: str,
        websocket: WebSocket
    ) -> None:
        """Handle WebSocket streaming for code generation"""
        
    async def broadcast_generation_update(
        self, 
        generation_id: str, 
        update: GenerationUpdate
    ) -> None:
        """Broadcast updates to connected clients"""
```

## Integration Points

### Enhanced Universal Chat

The existing UniversalChat component will be enhanced to recognize code generation requests:

```typescript
// Enhanced chat message processing
const processMessage = async (message: string, context: ChatContext) => {
  // Existing AI guidance processing
  if (isCodeGenerationRequest(message)) {
    return await handleCodeGenerationRequest(message, context);
  }
  
  // Existing general chat processing
  return await handleGeneralChat(message, context);
};

// New code generation command patterns
const CODE_GENERATION_PATTERNS = [
  /generate code for (.*)/i,
  /create (.*) code/i,
  /build (.*) application/i,
  /write code to (.*)/i
];
```

### Enhanced Project Components

#### Project Cards
```typescript
// Add code generation status to existing project cards
const EnhancedProjectCard = ({ project }: { project: Project }) => {
  const { hasGeneratedCode, codeGenerationCount } = project;
  
  return (
    <Card className="existing-styles">
      {/* Existing project card content */}
      
      {hasGeneratedCode && (
        <Badge className="code-generated-badge">
          <Code className="w-3 h-3 mr-1" />
          Code Generated
        </Badge>
      )}
      
      <CodeGenerationButton 
        project={project}
        variant="compact"
      />
    </Card>
  );
};
```

#### Project Detail View
```typescript
// Add code tabs to existing project detail view
const EnhancedProjectDetail = ({ project }: { project: Project }) => {
  return (
    <div className="existing-layout">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="code">Generated Code</TabsTrigger> {/* New */}
        </TabsList>
        
        {/* Existing tabs */}
        
        <TabsContent value="code">
          <CodeGenerationView project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

## UI/UX Design Consistency

### Theme Integration

The new code generation components will maintain consistency with the existing design system:

```typescript
// Consistent styling with existing theme
const codeGenerationTheme = {
  // Use existing color palette
  primary: 'from-purple-600 to-pink-600',
  secondary: 'bg-black/40 backdrop-blur-xl border-white/10',
  accent: 'text-purple-300',
  
  // Maintain existing animations
  loadingAnimation: 'animate-spin', // Consistent with existing loaders
  particleEffects: true, // Integrate with existing 3D particles
  
  // Typography consistency
  codeFont: 'font-mono text-sm',
  headings: 'text-white font-semibold',
  descriptions: 'text-purple-300 text-sm'
};
```

### Loading States

Code generation loading states will match the existing 3D particle theme:

```typescript
const CodeGenerationLoader = () => (
  <div className="flex flex-col items-center justify-center p-8">
    {/* Existing particle-style animation */}
    <div className="relative w-20 h-20 mb-4">
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
      <div className="absolute inset-2 rounded-full bg-black/60 backdrop-blur-lg" />
      <Code className="absolute inset-0 m-auto w-8 h-8 text-purple-300 animate-bounce" />
    </div>
    
    <h3 className="text-xl font-semibold text-white mb-2">
      AI is Crafting Your Code
    </h3>
    <p className="text-purple-300 text-sm text-center max-w-xs">
      Generating production-ready code tailored to your project requirements
    </p>
  </div>
);
```

## Security Considerations

### Code Execution Security

```typescript
// Sandboxed preview for web projects
const LivePreview = ({ htmlContent }: { htmlContent: string }) => {
  return (
    <iframe
      srcDoc={htmlContent}
      sandbox="allow-scripts allow-forms allow-modals"
      className="w-full h-full border-0"
      title="Code Preview"
    />
  );
};
```

### File Upload/Download Security

```python
# Backend file validation
class FileSecurityService:
    ALLOWED_EXTENSIONS = {
        'code': ['.js', '.ts', '.py', '.cpp', '.h', '.html', '.css'],
        'config': ['.json', '.yaml', '.yml', '.ini'],
        'docs': ['.md', '.txt']
    }
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    def validate_file(self, filename: str, content: str) -> bool:
        """Validate file for security concerns"""
        # Check file extension
        # Scan for malicious content
        # Validate file size
        # Check for executable content
```

## Performance Optimization

### Streaming Optimization

```python
# Efficient streaming with chunked responses
async def stream_code_generation(self, prompt: str) -> AsyncGenerator[str, None]:
    async with self.anthropic_client.messages.stream(
        model="claude-3-5-sonnet-20241022",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=4000
    ) as stream:
        async for chunk in stream:
            if chunk.type == "content_block_delta":
                yield chunk.delta.text
```

### Caching Strategy

```python
# Cache frequently generated code patterns
class CodeCacheService:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        
    async def get_cached_code(self, cache_key: str) -> Optional[str]:
        """Get cached code if available"""
        
    async def cache_generated_code(
        self, 
        cache_key: str, 
        code: str, 
        ttl: int = 3600
    ) -> None:
        """Cache generated code for reuse"""
```

### Database Optimization

```sql
-- Indexes for performance
CREATE INDEX CONCURRENTLY idx_generated_code_project_status 
ON generated_code(project_id, status);

CREATE INDEX CONCURRENTLY idx_code_files_generation_type 
ON code_files(generated_code_id, file_type);

-- Partitioning for large datasets
CREATE TABLE generation_history_2026 PARTITION OF generation_history
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

## Testing Strategy

### Unit Tests

```typescript
// Frontend component tests
describe('CodeGenerationModal', () => {
  it('should open with correct project data', () => {});
  it('should validate generation parameters', () => {});
  it('should handle streaming responses', () => {});
});

// Backend service tests
describe('CodeGenerationService', () => {
  it('should generate code for Arduino projects', async () => {});
  it('should handle streaming errors gracefully', async () => {});
  it('should save files correctly', async () => {});
});
```

### Integration Tests

```python
# API integration tests
async def test_code_generation_flow():
    # Create project
    # Start code generation
    # Verify streaming response
    # Check saved files
    # Test download functionality
```

### End-to-End Tests

```typescript
// E2E test scenarios
describe('Code Generation E2E', () => {
  it('should complete full code generation workflow', () => {
    // Navigate to project
    // Click generate code
    // Select platform and options
    // Wait for generation completion
    // Verify files are created
    // Test preview functionality
    // Download and verify ZIP
  });
});
```

## Deployment Strategy

### Phased Rollout

1. **Phase 1**: Backend API development and testing
2. **Phase 2**: Frontend component development
3. **Phase 3**: Integration with existing features
4. **Phase 4**: Beta testing with limited users
5. **Phase 5**: Full production deployment

### Feature Flags

```typescript
// Feature flag configuration
const FEATURE_FLAGS = {
  CODE_GENERATION_ENABLED: process.env.VITE_ENABLE_CODE_GENERATION === 'true',
  LIVE_PREVIEW_ENABLED: process.env.VITE_ENABLE_LIVE_PREVIEW === 'true',
  ADVANCED_EDITOR_ENABLED: process.env.VITE_ENABLE_ADVANCED_EDITOR === 'true'
};
```

### Monitoring and Analytics

```python
# Analytics tracking
class CodeGenerationAnalytics:
    async def track_generation_started(self, user_id: str, project_id: str):
        """Track when code generation starts"""
        
    async def track_generation_completed(self, generation_id: str, duration: float):
        """Track successful code generation"""
        
    async def track_file_downloaded(self, file_id: str, user_id: str):
        """Track file download events"""
        
    async def track_preview_viewed(self, generation_id: str, user_id: str):
        """Track preview usage"""
```

## Correctness Properties

### Property 1: Code Generation Completeness
**Validates: Requirements 1.1, 1.2, 1.3**

For any valid project P and generation parameters G:
- If code generation starts successfully, it must either complete with valid files or fail with a clear error message
- All generated files must be syntactically valid for their respective languages
- The generated code must include all components specified in the original project

```python
def test_code_generation_completeness(project: Project, params: GenerationParams):
    """Property: Code generation must complete successfully or fail gracefully"""
    generation = start_code_generation(project, params)
    
    # Property: Generation must reach a terminal state
    assert generation.status in ['completed', 'failed']
    
    if generation.status == 'completed':
        # Property: Must have at least one file
        assert len(generation.files) > 0
        
        # Property: All files must be valid
        for file in generation.files:
            assert is_syntactically_valid(file.content, file.type)
            assert file.content.strip() != ""
        
        # Property: Must include project components
        project_components = extract_components(project)
        generated_components = extract_components_from_code(generation.files)
        assert project_components.issubset(generated_components)
```

### Property 2: File Operations Consistency
**Validates: Requirements 3.1, 3.2**

For any generated code G with files F:
- Individual file downloads must preserve content integrity
- ZIP downloads must contain all files with correct structure
- File modifications must be tracked and reversible

```python
def test_file_operations_consistency(generated_code: GeneratedCode):
    """Property: File operations must maintain data integrity"""
    
    # Property: Individual downloads preserve content
    for file in generated_code.files:
        downloaded_content = download_file(file.id)
        assert downloaded_content == file.content
    
    # Property: ZIP contains all files
    zip_content = download_zip(generated_code.id)
    zip_files = extract_zip_file_list(zip_content)
    expected_files = {f.path for f in generated_code.files}
    assert set(zip_files) == expected_files
    
    # Property: Modifications are tracked
    original_content = file.content
    modified_content = "// Modified\n" + original_content
    update_file(file.id, modified_content)
    
    file_metadata = get_file_metadata(file.id)
    assert file_metadata.is_modified == True
    assert file_metadata.original_content == original_content
```

### Property 3: Preview Rendering Safety
**Validates: Requirements 2.1, 2.2**

For any web-based generated code W:
- Preview rendering must be sandboxed and secure
- Preview updates must reflect code changes accurately
- Non-web projects must show appropriate fallback messages

```python
def test_preview_rendering_safety(generated_code: GeneratedCode):
    """Property: Preview rendering must be safe and accurate"""
    
    if generated_code.platform == 'web':
        # Property: Preview HTML is sandboxed
        preview_html = generate_preview_html(generated_code.files)
        assert 'sandbox="allow-scripts allow-forms allow-modals"' in preview_html
        
        # Property: Preview reflects code changes
        html_file = find_html_file(generated_code.files)
        original_title = extract_title(html_file.content)
        
        modified_content = html_file.content.replace(
            f'<title>{original_title}</title>',
            '<title>Modified Title</title>'
        )
        update_file(html_file.id, modified_content)
        
        updated_preview = generate_preview_html(generated_code.files)
        assert 'Modified Title' in updated_preview
    else:
        # Property: Non-web projects show appropriate message
        preview_content = generate_preview_content(generated_code)
        assert 'preview not available' in preview_content.lower() or \
               'web-based projects only' in preview_content.lower()
```

### Property 4: Chat Integration Consistency
**Validates: Requirements 4.1**

For any chat message M requesting code operations:
- Code generation requests must be properly identified and routed
- Chat context must be maintained across code generation sessions
- Generated code must be accessible through chat interface

```python
def test_chat_integration_consistency(user_id: str, project_id: str):
    """Property: Chat integration must maintain context and functionality"""
    
    # Property: Code generation requests are identified
    code_request = "Generate Arduino code for my robot project"
    chat_response = process_chat_message(code_request, user_id, project_id)
    assert chat_response.action_type == 'code_generation'
    assert chat_response.project_id == project_id
    
    # Property: Context is maintained
    followup_message = "Add LED blinking to the code"
    followup_response = process_chat_message(followup_message, user_id, project_id)
    assert followup_response.context.previous_generation_id is not None
    
    # Property: Generated code is accessible
    if chat_response.generated_code_id:
        code_files = get_generated_files(chat_response.generated_code_id)
        assert len(code_files) > 0
        assert any('arduino' in f.content.lower() for f in code_files)
```

### Property 5: User Permission and Data Isolation
**Validates: Security and data integrity across all requirements**

For any user U and generated code G:
- Users can only access their own generated code
- File operations require proper authentication
- Data modifications are properly attributed and logged

```python
def test_user_permission_isolation(user1_id: str, user2_id: str):
    """Property: User data must be properly isolated and secured"""
    
    # Create code for user1
    project1 = create_project(user1_id, "User 1 Project")
    generation1 = generate_code(project1.id, user1_id, default_params())
    
    # Property: User2 cannot access User1's code
    with pytest.raises(PermissionError):
        get_generated_code(generation1.id, user2_id)
    
    with pytest.raises(PermissionError):
        download_file(generation1.files[0].id, user2_id)
    
    # Property: File modifications are attributed
    update_file(generation1.files[0].id, "modified content", user1_id)
    metadata = get_file_metadata(generation1.files[0].id)
    assert metadata.modification_history[-1]['user_id'] == user1_id
    
    # Property: Operations are logged
    history = get_generation_history(user1_id)
    assert any(h.action == 'generate' and h.generated_code_id == generation1.id 
              for h in history)
```

## Migration Strategy

### Database Migration

```sql
-- Migration script for adding code generation tables
BEGIN;

-- Create new tables
-- (Table creation scripts from database design section)

-- Update existing tables
ALTER TABLE projects ADD COLUMN IF NOT EXISTS has_generated_code BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS code_generation_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_code_generated_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
-- (Index creation scripts from database design section)

-- Update RLS policies
CREATE POLICY "Users can view their own generated code" ON generated_code
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own generated code" ON generated_code
    FOR INSERT WITH CHECK (user_id = auth.uid());

COMMIT;
```

### API Versioning

```python
# Maintain backward compatibility
@app.get("/api/v1/projects/{project_id}")  # Existing endpoint
async def get_project_v1(project_id: str):
    """Legacy project endpoint without code generation data"""
    
@app.get("/api/v2/projects/{project_id}")  # Enhanced endpoint
async def get_project_v2(project_id: str):
    """Enhanced project endpoint with code generation data"""
```

This design provides a comprehensive technical foundation for integrating AI code generation capabilities while maintaining the existing system's integrity and user experience.