"# API Endpoint Audit - Current State

**Date**: Current  
**Purpose**: Map existing endpoints to determine which services they use and how to migrate to unified services

---

## Endpoint Inventory

### Health & Status Endpoints
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/` | GET | Direct response | N/A | ✅ OK |
| `/api/health` | GET | Direct response | MonitoringService | 🔴 HIGH |
| `/api/health/detailed` | GET | Direct response | MonitoringService | 🔴 HIGH |
| `/api/test-status` | GET | Direct response | N/A | ✅ OK |

### Project Generation Endpoints
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/generate-project` | POST | Direct logic | ProjectService | 🟡 MEDIUM |
| `/api/generate-project-stream` | POST | Direct logic | ProjectService | 🟡 MEDIUM |
| `/api/projects/sync` | POST | Direct logic | ProjectService | 🟡 MEDIUM |

### Chat/Guidance Endpoints (Project-specific)
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/projects/{project_id}/guidance/chat` | POST | Old chat service | UnifiedChatService | 🔴 HIGH |
| `/api/projects/{project_id}/guidance/context` | GET | Old context service | UnifiedChatService | 🔴 HIGH |
| `/api/projects/{project_id}/guidance/history` | GET | Old chat service | UnifiedChatService | 🔴 HIGH |

### Universal Chat Endpoints
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/universal-chat/save-message` | POST | Old universal chat | UnifiedChatService | 🔴 HIGH |
| `/api/universal-chat/sessions/{user_id}` | GET | Old universal chat | UnifiedChatService | 🔴 HIGH |
| `/api/universal-chat/messages/{user_id}/{session_id}` | GET | Old universal chat | UnifiedChatService | 🔴 HIGH |
| `/api/universal-chat/create-session` | POST | Old universal chat | UnifiedChatService | 🔴 HIGH |
| `/api/universal-chat/session/{user_id}/{session_id}` | DELETE | Old universal chat | UnifiedChatService | 🔴 HIGH |
| `/api/universal-chat/context/{user_id}/{session_id}` | GET | Old universal chat | UnifiedChatService | 🔴 HIGH |

### AI/Voice Processing Endpoints
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/ai-guidance/process-voice` | POST | Old AI service | AIService | 🟡 MEDIUM |

### Code Generation Endpoints
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/projects/{project_id}/generate-code` | POST | CodeGenerationService | Enhanced CodeGenerationService | 🟡 MEDIUM |
| `/api/projects/{project_id}/code-generation/{generation_id}` | GET | CodeGenerationService | Enhanced CodeGenerationService | 🟡 MEDIUM |
| `/api/projects/{project_id}/code-generation/{generation_id}/stream` | WS | CodeGenerationService | Enhanced CodeGenerationService | 🟡 MEDIUM |
| `/api/projects/{project_id}/generated-code` | GET | CodeGenerationService | Enhanced CodeGenerationService | 🟡 MEDIUM |

### File Management Endpoints
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/generated-code/{generation_id}/files` | GET | FileManagementService | FileService | 🟢 LOW |
| `/api/generated-code/{generation_id}/files/{file_id}` | GET | FileManagementService | FileService | 🟢 LOW |
| `/api/generated-code/{generation_id}/files/{file_id}` | PUT | FileManagementService | FileService | 🟢 LOW |
| `/api/generated-code/{generation_id}/files/{file_id}` | DELETE | FileManagementService | FileService | 🟢 LOW |
| `/api/generated-code/{generation_id}/files/{file_id}/download` | GET | FileManagementService | FileService | 🟢 LOW |
| `/api/generated-code/{generation_id}/download/selected` | POST | FileManagementService | FileService | 🟢 LOW |
| `/api/generated-code/{generation_id}/download/zip` | GET | FileManagementService | FileService | 🟢 LOW |

### Software Planning Endpoints
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/software-planning/analyze` | POST | Old planning service | ProjectService | 🟡 MEDIUM |
| `/api/software-projects/analyze` | POST | Old planning service | ProjectService | 🟡 MEDIUM |
| `/api/software-projects/{project_id}` | GET | Old planning service | ProjectService | 🟡 MEDIUM |
| `/api/software-projects/user/{user_id}` | GET | Old planning service | ProjectService | 🟡 MEDIUM |
| `/api/software-projects/{project_id}/architecture-diagram` | POST | Old planning service | ProjectService | 🟡 MEDIUM |
| `/api/software-projects/{project_id}/architecture-diagrams` | GET | Old planning service | ProjectService | 🟡 MEDIUM |
| `/api/software-projects/{project_id}/database-schema` | POST | Old planning service | ProjectService | 🟡 MEDIUM |
| `/api/software-projects/{project_id}/database-schema` | GET | Old planning service | ProjectService | 🟡 MEDIUM |
| `/api/software-projects/{project_id}/api-specification` | POST | Old planning service | ProjectService | 🟡 MEDIUM |
| `/api/software-projects/{project_id}/api-specification` | GET | Old planning service | ProjectService | 🟡 MEDIUM |

### Technology Stack Endpoints
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/technology-stack/recommend` | POST | TechnologyStackService | TechnologyService | 🟢 LOW |
| `/api/technology-stack/compare` | POST | TechnologyStackService | TechnologyService | 🟢 LOW |
| `/api/technology-stacks` | GET | TechnologyStackService | TechnologyService | 🟢 LOW |
| `/api/technology-stacks/{stack_id}` | GET | TechnologyStackService | TechnologyService | 🟢 LOW |

### Application Templates
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/application-templates` | GET | Direct logic | N/A | ✅ OK |
| `/api/application-templates/{template_id}` | GET | Direct logic | N/A | ✅ OK |

### Performance Monitoring
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/performance/database` | GET | Direct logic | MonitoringService | 🟡 MEDIUM |
| `/api/performance/database/reset` | POST | Direct logic | MonitoringService | 🟡 MEDIUM |

### Component Details
| Endpoint | Method | Current Implementation | Target Service | Priority |
|----------|--------|------------------------|----------------|----------|
| `/api/components/{component_id}/details` | GET | Mock data | N/A | ✅ OK |

---

## Migration Priority

### 🔴 HIGH PRIORITY (Must do for MVP)
1. **Health Check Endpoints** - Critical for deployment
   - `/api/health` → MonitoringService
   - `/api/health/detailed` → MonitoringService

2. **Chat Endpoints** - Core user interaction
   - All `/api/projects/{id}/guidance/*` → UnifiedChatService
   - All `/api/universal-chat/*` → UnifiedChatService

### 🟡 MEDIUM PRIORITY (Important but can wait)
1. **Project Management** - ProjectService consolidation
   - Software project endpoints
   - Planning/analysis endpoints

2. **AI Processing** - AIService integration
   - Voice processing
   - AI guidance

3. **Code Generation** - Enhanced service
   - Code generation endpoints

### 🟢 LOW PRIORITY (Nice to have)
1. **File Management** - Already using FileService mostly
2. **Technology Stacks** - Already using TechnologyService mostly

---

## Service Import Status

Need to verify these services are properly imported in server.py:
- [ ] UnifiedChatService from `/app/backend/services/unified_chat_service.py`
- [ ] ProjectService from `/app/backend/services/project_service.py`
- [ ] AIService from `/app/backend/services/ai_service.py`
- [ ] MonitoringService from `/app/backend/infrastructure/monitoring_service.py`
- [ ] FileService from `/app/backend/services/file_service.py`
- [ ] TechnologyService from `/app/backend/services/technology_service.py`

---

## Next Steps

1. ✅ Create service registry module
2. ✅ Initialize services on app startup
3. Update HIGH priority endpoints first
4. Add middleware (rate limiting, validation)
5. Test each endpoint after migration
6. Update MEDIUM priority endpoints
7. Final testing and monitoring

"
