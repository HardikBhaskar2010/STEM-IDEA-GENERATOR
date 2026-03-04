# Implementation Plan: Backend Services Improvement

## Overview

This implementation plan transforms the STEM Project Generator backend from 14 fragmented services into a modern, scalable architecture with 14 unified services (7 core + 7 AI enhancements). The plan follows a 12-week migration strategy:

**Phase 1 (Weeks 1-8): Core Consolidation**
- Consolidate 14 legacy services into 7 unified services
- Implement Redis-based caching, rate limiting, circuit breakers
- Standardize error handling and request validation
- Deploy to production with zero downtime

**Phase 2 (Weeks 9-12): AI Production Enhancements**
- Implement AI Orchestrator for unified AI operations
- Add Model Router for smart free model selection (Gemini, Llama, Qwen)
- Implement Prompt Service with file-based templates
- Add Context Builder for personalized AI responses
- Implement Task Queue Service (Redis + RQ) for background processing
- Add Tool System for AI agent capabilities
- Implement Experiment Logger for AI metrics and optimization

**Key Benefits:**
- 100% free AI operation using OpenRouter free models (zero API costs)
- 60% cache hit rate for AI responses (massive reduction in API calls)
- 10x concurrent capacity with background task queue
- 50% faster prompt iteration with file-based templates
- Production-grade patterns from real AI startups

Each task builds incrementally, ensuring the system remains functional throughout the migration with comprehensive testing at key checkpoints.

## Tasks

- [-] 1. Infrastructure setup and base service layer
  - [x] 1.1 Set up Redis instance and configure connection pooling
    - Provision Redis instance (Render or AWS ElastiCache)
    - Configure Redis connection pool (min: 5, max: 50 connections)
    - Set up connection timeout (5 seconds) and keepalive
    - Create Redis client wrapper with error handling
    - Test Redis connectivity and basic operations
    - _Requirements: 3.1, 3.2, 12.2, 12.4_
  
  - [x] 1.2 Configure database connection pooling
    - Set up asyncpg connection pool for PostgreSQL
    - Configure pool parameters (min: 5, max: 20 connections)
    - Set connection timeout (30s), idle timeout (300s), max lifetime (1800s)
    - Implement connection health checks
    - Test connection pool under load
    - _Requirements: 12.1, 12.3, 12.4, 12.5_
  
  - [x] 1.3 Implement BaseService class with common functionality
    - Create BaseService abstract class with cache, logger, and db_client
    - Implement get_cached_or_fetch method with TTL support
    - Implement invalidate_cache method with pattern matching
    - Add abstract health_check method
    - Implement structured logging integration
    - _Requirements: 2.5, 3.2, 3.3, 10.4_
  
  - [x] 1.4 Implement ServiceRegistry for dependency injection
    - Create ServiceRegistry class with service registration
    - Implement register method with BaseService validation
    - Implement get method with singleton pattern
    - Implement get_all_services for health checks
    - Add service lifecycle management
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.5 Set up structured logging with JSON format
    - Configure structlog with JSON formatter
    - Add request ID, user ID, endpoint, and timestamp to log context
    - Implement log sanitization to remove sensitive data
    - Configure log levels per environment
    - Set up log aggregation (CloudWatch, Datadog, or similar)
    - _Requirements: 14.1, 14.2, 14.3, 14.7_
  
  - [x] 1.6 Set up monitoring infrastructure
    - Configure Prometheus client for metrics collection
    - Set up Sentry SDK for error tracking
    - Configure OpenTelemetry for distributed tracing
    - Create initial dashboards for key metrics
    - Set up health check endpoint skeleton
    - _Requirements: 14.4, 14.5, 14.6, 19.7_

- [x] 2. Implement core infrastructure components
  - [x] 2.1 Implement CacheManager with Redis backend
    - Create CacheManager class with Redis client
    - Implement get, set, delete methods with serialization
    - Implement get_or_set with fetch function support
    - Add pattern-based invalidation (delete_pattern)
    - Implement tag-based invalidation (invalidate_tags)
    - Add cache statistics tracking (hit rate, miss rate)
    - Implement fallback to direct queries on cache failure
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7_
  
  - [x] 2.2 Write property test for cache consistency
    - **Property 2: Cache Consistency**
    - **Validates: Requirements 3.2, 3.3**
    - Test that cached values match database values within TTL
    - Test cache expiration behavior
    - Test cache invalidation completeness
  
  - [x] 2.3 Implement RateLimiter with sliding window algorithm
    - Create RateLimiter class with Redis sorted sets
    - Implement sliding window algorithm (check_rate_limit)
    - Add cleanup of old entries outside window
    - Implement get_remaining method
    - Add reset method for testing/admin
    - Support per-user, per-IP, and per-endpoint limits
    - Implement fallback to in-memory rate limiting on Redis failure
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 2.4 Write property test for rate limit monotonicity
    - **Property 3: Rate Limit Fairness**
    - **Validates: Requirements 4.2, 4.4**
    - Test that remaining count decreases monotonically
    - Test rate limit enforcement accuracy
    - Test window sliding behavior
  
  - [x] 2.5 Implement CircuitBreaker with state management
    - Create CircuitBreaker class with state tracking
    - Implement state transitions (CLOSED → OPEN → HALF_OPEN → CLOSED)
    - Add failure and success threshold tracking
    - Implement timeout and half-open timeout
    - Add fallback function support
    - Implement metrics recording (failures, successes, state changes)
    - Create CircuitBreakerRegistry for managing multiple breakers
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [x] 2.6 Write property test for circuit breaker state transitions
    - **Property 4: Circuit Breaker State Transitions**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5**
    - Test state transitions follow expected pattern
    - Test failure threshold triggers OPEN state
    - Test success threshold triggers CLOSED state from HALF_OPEN
  
  - [x] 2.7 Implement RequestValidator with Pydantic models
    - Create RequestValidator class with validation methods
    - Implement validate method using Pydantic models
    - Implement validate_partial for PATCH requests
    - Add sanitize_input method for XSS/injection prevention
    - Implement validate_pagination with max limits
    - Create detailed validation error responses
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [x] 2.8 Write unit tests for request validation
    - Test required field validation
    - Test type validation
    - Test custom validators
    - Test partial validation
    - Test sanitization
    - Test error message format
  
  - [x] 2.9 Implement ErrorHandler with standardized responses
    - Create ErrorCode enum with all error types
    - Create APIError exception class
    - Implement ErrorHandler with handle_exception method
    - Create standardized ErrorResponse model
    - Implement error logging with context
    - Add request ID tracking for error tracing
    - Sanitize error messages to prevent sensitive data leaks
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_
  
  - [x] 2.10 Write unit tests for error handling
    - Test all error code mappings
    - Test error response format
    - Test error logging
    - Test sensitive data sanitization
    - Test request ID inclusion

- [x] 3. Checkpoint - Core components complete
  - Ensure all tests pass, ask the user if questions arise.

- [-] 4. Define Pydantic models for unified services
  - [x] 4.1 Create service configuration models
    - Define CacheConfig model with Redis URL, TTL, strategy
    - Define RateLimitConfig model with limits and windows
    - Define CircuitBreakerConfig model with thresholds
    - Define ServiceConfig model combining all configs
    - Add validation rules for all configuration values
    - _Requirements: 3.1, 4.1, 5.1_
  
  - [x] 4.2 Create unified chat service models
    - Define ChatContext enum (PROJECT, UNIVERSAL, CODE_GENERATION)
    - Define MessageSender enum (USER, AI, SYSTEM)
    - Define IntentType enum (GENERATE_CODE, MODIFY_CODE, etc.)
    - Create ChatSession model with session metadata
    - Create ChatMessage model with voice metadata support
    - Create IntentDetectionResult model
    - Create ConversationContext model
    - Add validation rules for all models
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_
  
  - [x] 4.3 Create request/response validation models
    - Create ChatMessageRequest model with content validation
    - Create ProjectCreateRequest model with type validation
    - Create pagination parameter models
    - Create health check response models
    - Add custom validators for business rules
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 10.5, 10.6_

- [ ] 5. Implement UnifiedChatService
  - [x] 5.1 Implement chat session management
    - Create UnifiedChatService class extending BaseService
    - Implement create_session with context support
    - Implement session storage in database
    - Add session metadata and title support
    - Implement session lifecycle (active/archived)
    - Add caching for active sessions (30 min TTL)
    - _Requirements: 1.1, 8.1, 8.2, 8.7, 9.6_
  
  - [x] 5.2 Implement message sending and storage
    - Implement send_message method with sender tracking
    - Store messages with timestamps and metadata
    - Support voice transcription metadata (duration, confidence)
    - Increment session message count
    - Update session last_activity timestamp
    - Invalidate session cache on new messages
    - _Requirements: 8.3, 8.6_
  
  - [x] 5.3 Implement chat history retrieval
    - Implement get_history with pagination support
    - Add optional context inclusion
    - Return messages in chronological order
    - Cache recent history (30 min TTL)
    - Support filtering by sender type
    - _Requirements: 8.4, 9.6_
  
  - [x] 5.4 Implement intent detection
    - Implement detect_intent method
    - Add pattern matching for common intents
    - Return confidence scores for detected intents
    - Extract entities from messages (file names, languages, etc.)
    - Provide suggested actions based on intent
    - _Requirements: 8.5_
  
  - [x] 5.5 Implement conversation context management
    - Implement get_conversation_context method
    - Retrieve recent messages with configurable window
    - Include detected intents in context
    - Add user preferences to context
    - Include project context if available
    - Cache conversation context (30 min TTL)
    - _Requirements: 8.4, 9.6_
  
  - [x] 5.6 Implement session archival
    - Implement archive_session method
    - Validate user ownership before archiving
    - Mark session as inactive
    - Preserve all message history
    - Invalidate session cache
    - _Requirements: 8.7_
  
  - [x] 5.7 Write unit tests for UnifiedChatService
    - Test session creation with different contexts
    - Test message sending and retrieval
    - Test intent detection accuracy
    - Test conversation context building
    - Test session archival
    - Test cache invalidation

- [ ] 6. Implement ProjectService
  - [x] 6.1 Consolidate project context functionality
    - Create ProjectService class extending BaseService
    - Migrate functionality from project_context_service
    - Migrate functionality from enhanced_project_context_service
    - Migrate functionality from software_project_planning_service
    - Implement project CRUD operations
    - Add caching for project data (2 hour TTL)
    - _Requirements: 1.2, 1.4, 9.4_
  
  - [x] 6.2 Implement project context retrieval
    - Implement get_project_context method
    - Include project metadata, files, and dependencies
    - Cache project context with 2 hour TTL
    - Support context enrichment with AI suggestions
    - _Requirements: 1.2, 9.4_
  
  - [x] 6.3 Implement project planning features
    - Implement project planning workflow
    - Add milestone and task management
    - Support technology stack recommendations
    - Cache technology stacks (24 hour TTL)
    - _Requirements: 1.2, 9.5_
  
  - [x] 6.4 Write unit tests for ProjectService
    - Test project CRUD operations
    - Test context retrieval and caching
    - Test planning features
    - Test cache invalidation on updates

- [ ] 7. Implement AIService
  - [x] 7.1 Consolidate AI guidance functionality
    - Create AIService class extending BaseService
    - Migrate functionality from ai_guidance_service
    - Migrate functionality from stateless_ai_guidance_service
    - Implement AI prompt generation
    - Add support for both stateful and stateless modes
    - _Requirements: 1.3, 1.4_
  
  - [x] 7.2 Implement circuit breaker for external AI API calls
    - Wrap OpenRouter API calls with circuit breaker
    - Configure failure threshold (5 failures)
    - Configure timeout (60 seconds)
    - Implement fallback responses
    - Add retry logic with exponential backoff
    - _Requirements: 5.1, 5.2, 5.6_
  
  - [x] 7.3 Implement AI response caching
    - Cache AI responses with 1 hour TTL
    - Use prompt hash as cache key
    - Implement cache warming for common prompts
    - Add cache invalidation on model updates
    - _Requirements: 3.2, 3.3, 9.7_
  
  - [x] 7.4 Write integration tests for AIService
    - Test AI guidance generation
    - Test circuit breaker behavior with API failures
    - Test response caching
    - Test fallback mechanisms

- [ ] 8. Checkpoint - Unified services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Enhance remaining services
  - [x] 9.1 Enhance CodeGenerationService with streaming support
    - Add BaseService inheritance to existing service
    - Implement streaming response support
    - Add caching for generated code (1 hour TTL)
    - Integrate with circuit breaker for AI calls
    - Add rate limiting for code generation endpoints
    - _Requirements: 1.1, 3.2, 4.2, 5.1_
  
  - [x] 9.2 Enhance FileService with validation
    - Add BaseService inheritance to existing service
    - Implement file upload validation (type, size, content)
    - Add virus scanning integration (optional)
    - Implement secure file path validation
    - Add caching for file metadata
    - _Requirements: 6.3, 13.5_
  
  - [x] 9.3 Enhance TechnologyService with caching
    - Add BaseService inheritance to existing service
    - Implement technology stack caching (24 hour TTL)
    - Add technology recommendation logic
    - Cache popular technology combinations
    - _Requirements: 3.2, 9.5_
  
  - [x] 9.4 Create MonitoringService for health checks
    - Create MonitoringService class extending BaseService
    - Implement comprehensive health_check method
    - Check database connectivity with timeout
    - Check Redis connectivity with timeout
    - Check all registered services health
    - Collect response time metrics
    - Return detailed health status
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [x] 9.5 Write unit tests for enhanced services
    - Test streaming code generation
    - Test file validation
    - Test technology caching
    - Test health check accuracy

- [x] 10. Implement API middleware stack
  - [x] 10.1 Create rate limiting middleware
    - Create FastAPI middleware for rate limiting
    - Extract identifier from request (user ID, IP, API key)
    - Check rate limit before processing request
    - Return 429 with appropriate headers if exceeded
    - Add rate limit headers to all responses
    - Support different tiers (anonymous, authenticated, premium, admin)
    - _Requirements: 4.2, 4.3, 4.5, 4.6_
  
  - [x] 10.2 Create request validation middleware
    - Create FastAPI middleware for validation
    - Validate request body against Pydantic models
    - Sanitize all user input
    - Return 400 with detailed errors on validation failure
    - Log validation failures
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_
  
  - [x] 10.3 Create error handling middleware
    - Create FastAPI exception handlers
    - Catch all exceptions and standardize responses
    - Add request ID to all error responses
    - Log errors with full context
    - Sanitize error messages for production
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_
  
  - [x] 10.4 Create authentication middleware
    - Create JWT token validation middleware
    - Extract user ID from valid tokens
    - Return 401 for invalid/expired tokens
    - Add user context to request state
    - Support role-based access control
    - _Requirements: 13.1, 13.2, 13.4_
  
  - [x] 10.5 Create logging middleware
    - Create request/response logging middleware
    - Log request ID, user ID, endpoint, method
    - Log response status code and time
    - Add correlation IDs for distributed tracing
    - Sanitize sensitive data from logs
    - _Requirements: 14.1, 14.2, 14.7_
  
  - [x] 10.6 Write integration tests for middleware stack
    - Test middleware execution order
    - Test rate limiting enforcement
    - Test validation error handling
    - Test authentication flow
    - Test logging output

- [ ] 11. Update API endpoints to use unified services
  - [~] 11.1 Update chat endpoints
    - Update POST /api/chat/session to use UnifiedChatService
    - Update POST /api/chat/message to use UnifiedChatService
    - Update GET /api/chat/history to use UnifiedChatService
    - Update POST /api/chat/archive to use UnifiedChatService
    - Add rate limiting (60 requests/minute per user)
    - Add request validation
    - Add response caching where appropriate
    - _Requirements: 1.1, 8.1, 8.2, 8.3, 8.4, 8.7_
  
  - [~] 11.2 Update project endpoints
    - Update POST /api/projects to use ProjectService
    - Update GET /api/projects/:id to use ProjectService
    - Update PUT /api/projects/:id to use ProjectService
    - Update DELETE /api/projects/:id to use ProjectService
    - Update GET /api/projects/:id/context to use ProjectService
    - Add rate limiting (100 requests/minute per user)
    - Add authorization checks (user ownership)
    - _Requirements: 1.2, 13.3_
  
  - [~] 11.3 Update AI endpoints
    - Update POST /api/ai/guidance to use AIService
    - Update POST /api/ai/generate to use AIService
    - Add circuit breaker for external API calls
    - Add rate limiting (20 requests/minute per user)
    - Add response caching
    - _Requirements: 1.3, 4.2, 5.1, 5.6_
  
  - [~] 11.4 Update code generation endpoints
    - Update POST /api/code/generate to use enhanced CodeGenerationService
    - Add streaming support for long responses
    - Add rate limiting (10 requests/minute per user)
    - Add circuit breaker for AI calls
    - _Requirements: 4.2, 5.1_
  
  - [~] 11.5 Add health check endpoints
    - Create GET /health endpoint using MonitoringService
    - Create GET /health/ready endpoint for readiness checks
    - Create GET /health/live endpoint for liveness checks
    - Return 200 for healthy, 503 for unhealthy
    - Include detailed component status
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [~] 11.6 Write integration tests for API endpoints
    - Test all CRUD operations
    - Test rate limiting enforcement
    - Test authentication and authorization
    - Test error responses
    - Test health check endpoints

- [ ] 12. Implement API versioning
  - [~] 12.1 Create API version routing
    - Set up FastAPI routers for v1 and v2
    - Route requests based on URL path (/api/v1/, /api/v2/)
    - Maintain v1 endpoints for backward compatibility
    - Implement v2 endpoints with new unified services
    - _Requirements: 11.1, 11.2_
  
  - [~] 12.2 Create backward compatibility layer
    - Create adapters to transform old request formats to new
    - Create adapters to transform new response formats to old
    - Add deprecation warning headers to v1 endpoints
    - Document migration path from v1 to v2
    - _Requirements: 20.1, 20.2, 20.3, 20.5, 20.6_
  
  - [~] 12.3 Implement deprecation warnings
    - Add X-API-Deprecated header to v1 responses
    - Include deprecation date and migration guide URL
    - Log usage of deprecated endpoints
    - _Requirements: 11.3, 20.5_
  
  - [~] 12.4 Write tests for API versioning
    - Test v1 endpoint compatibility
    - Test v2 endpoint functionality
    - Test request/response transformation
    - Test deprecation headers

- [ ] 13. Checkpoint - API layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement data migration scripts
  - [~] 14.1 Create chat data migration script
    - Create script to migrate chat sessions to unified schema
    - Preserve all session metadata and messages
    - Add context field to existing sessions
    - Validate data integrity after migration
    - Make script idempotent (safe to run multiple times)
    - _Requirements: 1.4, 16.1, 16.5, 16.6_
  
  - [~] 14.2 Create project data migration script
    - Create script to consolidate project data
    - Merge data from multiple project services
    - Preserve all project context and metadata
    - Validate data integrity after migration
    - Make script idempotent
    - _Requirements: 1.4, 16.1, 16.5, 16.6_
  
  - [~] 14.3 Create AI service data migration script
    - Create script to migrate AI guidance data
    - Consolidate stateful and stateless data
    - Preserve all AI interaction history
    - Validate data integrity after migration
    - Make script idempotent
    - _Requirements: 1.4, 16.1, 16.5, 16.6_
  
  - [~] 14.4 Create rollback scripts
    - Create scripts to revert migrations if needed
    - Test rollback on staging environment
    - Document rollback procedures
    - _Requirements: 16.4_
  
  - [~] 14.5 Test migration scripts
    - Test on copy of production data
    - Verify no data loss
    - Verify data integrity
    - Test idempotency
    - Test rollback procedures

- [ ] 15. Implement security enhancements
  - [~] 15.1 Implement JWT token validation
    - Validate JWT signature and expiration
    - Extract user ID and roles from token
    - Return 401 for invalid tokens
    - Implement token refresh mechanism
    - _Requirements: 13.1, 13.2_
  
  - [~] 15.2 Implement authorization checks
    - Validate user ownership of resources
    - Return 403 for unauthorized access
    - Implement role-based access control
    - Add admin-only endpoints protection
    - _Requirements: 13.3, 13.4_
  
  - [~] 15.3 Implement input sanitization
    - Sanitize all user input to prevent SQL injection
    - Sanitize HTML to prevent XSS attacks
    - Validate file paths to prevent command injection
    - Escape special characters in queries
    - _Requirements: 13.5_
  
  - [~] 15.4 Implement cache encryption for sensitive data
    - Encrypt sensitive data before caching
    - Use AES-256 encryption
    - Store encryption keys securely (environment variables)
    - Decrypt data when retrieving from cache
    - _Requirements: 13.6_
  
  - [~] 15.5 Configure HTTPS and security headers
    - Enforce HTTPS only (redirect HTTP to HTTPS)
    - Add HSTS header (Strict-Transport-Security)
    - Add CSP header (Content-Security-Policy)
    - Add X-Frame-Options header
    - Add X-Content-Type-Options header
    - _Requirements: 13.7_
  
  - [~] 15.6 Write security tests
    - Test JWT validation
    - Test authorization checks
    - Test input sanitization
    - Test cache encryption
    - Test security headers

- [ ] 16. Implement monitoring and metrics
  - [~] 16.1 Configure Prometheus metrics
    - Add request count metrics by endpoint and status
    - Add response time histogram metrics
    - Add error rate metrics
    - Add cache hit/miss rate metrics
    - Add circuit breaker state metrics
    - Add connection pool metrics
    - _Requirements: 14.4, 19.7_
  
  - [~] 16.2 Configure Sentry error tracking
    - Initialize Sentry SDK with DSN
    - Configure error sampling rate
    - Add user context to error reports
    - Add request context to error reports
    - Filter sensitive data from error reports
    - _Requirements: 14.6_
  
  - [~] 16.3 Configure OpenTelemetry tracing
    - Initialize OpenTelemetry SDK
    - Add trace context propagation
    - Add spans for database queries
    - Add spans for external API calls
    - Add spans for cache operations
    - _Requirements: 14.5_
  
  - [~] 16.4 Create monitoring dashboards
    - Create Grafana dashboard for key metrics
    - Add request rate chart
    - Add error rate chart
    - Add response time chart (p50, p95, p99)
    - Add cache hit rate chart
    - Add circuit breaker status chart
    - _Requirements: 19.7_
  
  - [~] 16.5 Configure alerting rules
    - Alert on error rate > 1%
    - Alert on response time > 2x baseline
    - Alert on cache hit rate < 50%
    - Alert on connection pool exhaustion
    - Alert on circuit breaker open
    - Alert on disk space < 20%
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

- [ ] 17. Performance optimization
  - [~] 17.1 Optimize database queries
    - Add indexes on user_id, project_id, session_id
    - Use SELECT with specific columns instead of SELECT *
    - Implement query result caching
    - Add pagination to all list endpoints
    - Monitor and log slow queries (>100ms)
    - _Requirements: 15.5_
  
  - [~] 17.2 Optimize cache TTL values
    - Set user sessions TTL to 1 hour
    - Set project context TTL to 2 hours
    - Set technology stacks TTL to 24 hours
    - Set chat history TTL to 30 minutes
    - Set AI responses TTL to 1 hour
    - Monitor cache hit rates and adjust
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [~] 17.3 Implement connection pooling optimization
    - Tune database pool size based on load testing
    - Tune Redis pool size based on load testing
    - Configure connection timeouts appropriately
    - Monitor connection pool statistics
    - _Requirements: 12.1, 12.2, 12.6, 15.7_
  
  - [~] 17.4 Optimize async operations
    - Use async/await for all I/O operations
    - Implement concurrent request handling
    - Use asyncio.gather for parallel operations
    - Monitor event loop lag
    - _Requirements: 15.6_
  
  - [~] 17.5 Run load tests and optimize
    - Test with 10,000 requests/second
    - Verify p95 response time < 200ms
    - Verify p99 response time < 500ms
    - Test with 1,000 concurrent connections
    - Identify and fix bottlenecks
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 18. Checkpoint - Performance optimization complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Comprehensive testing
  - [~] 19.1 Complete unit test suite
    - Ensure 80% overall code coverage
    - Ensure 100% coverage for auth, validation, error handling
    - Test all service methods in isolation
    - Test all middleware components
    - Test all utility functions
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [~] 19.2 Write property-based tests
    - **Property 1: Service Consolidation Preserves Functionality**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
    - Test that unified services produce same results as old services
  
  - [~] 19.3 Write property-based tests for cache invalidation
    - **Property 7: Cache Invalidation Completeness**
    - **Validates: Requirements 3.5**
    - Test that all matching keys are invalidated
  
  - [~] 19.4 Write property-based tests for validation
    - **Property 5: Request Validation Completeness**
    - **Validates: Requirements 6.1, 6.2**
    - Test that validation is idempotent
    - Test that all required fields are checked
  
  - [~] 19.5 Complete integration test suite
    - Test end-to-end request flows
    - Test service consolidation integration
    - Test cache and database consistency
    - Test circuit breaker with external APIs
    - Test distributed rate limiting
    - Test health check integration
    - _Requirements: 17.4_
  
  - [~] 19.6 Run load tests
    - Test system under 10,000 requests/second
    - Verify performance requirements are met
    - Test concurrent connection handling
    - Test connection pool behavior under load
    - _Requirements: 17.6_
  
  - [~] 19.7 Set up CI/CD test automation
    - Configure GitHub Actions for automated testing
    - Run unit tests on every commit
    - Run integration tests on pull requests
    - Run load tests on staging deployments
    - Prevent deployment if tests fail
    - _Requirements: 17.7_

- [ ] 20. Documentation
  - [~] 20.1 Create API documentation
    - Generate OpenAPI/Swagger specification
    - Document all endpoints with parameters and responses
    - Document all error codes and meanings
    - Add example requests and responses
    - Host interactive API documentation
    - _Requirements: 18.1, 18.3_
  
  - [~] 20.2 Document service interfaces
    - Document all service classes and methods
    - Document parameter types and return values
    - Add docstrings to all public methods
    - Document configuration options
    - _Requirements: 18.2, 18.6_
  
  - [~] 20.3 Create architecture documentation
    - Create architecture diagrams showing components
    - Document service consolidation strategy
    - Document data flow through middleware stack
    - Document caching strategy
    - Document rate limiting strategy
    - _Requirements: 18.4_
  
  - [~] 20.4 Create deployment documentation
    - Document deployment procedures
    - Document rollback procedures
    - Document environment variables
    - Document infrastructure requirements
    - Document monitoring setup
    - _Requirements: 18.5, 18.6_
  
  - [~] 20.5 Create migration guide
    - Document migration from v1 to v2 API
    - Provide code examples for common use cases
    - Document breaking changes
    - Document deprecation timeline
    - _Requirements: 18.7, 20.6_

- [ ] 21. Staging deployment and testing
  - [~] 21.1 Deploy to staging environment
    - Deploy Redis instance to staging
    - Deploy database migrations to staging
    - Deploy application to staging
    - Configure environment variables
    - Verify all services are running
    - _Requirements: 16.2_
  
  - [~] 21.2 Run smoke tests on staging
    - Test all critical endpoints
    - Test authentication flow
    - Test chat functionality
    - Test project management
    - Test code generation
    - Verify health checks
    - _Requirements: 16.2_
  
  - [~] 21.3 Run data migration on staging
    - Run chat data migration script
    - Run project data migration script
    - Run AI service data migration script
    - Verify data integrity
    - Test rollback procedures
    - _Requirements: 16.1, 16.5, 16.6_
  
  - [~] 21.4 Performance testing on staging
    - Run load tests with realistic traffic
    - Monitor response times
    - Monitor error rates
    - Monitor cache hit rates
    - Monitor connection pool usage
    - Verify performance requirements are met
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  
  - [~] 21.5 Security testing on staging
    - Test authentication and authorization
    - Test input sanitization
    - Test rate limiting
    - Test HTTPS enforcement
    - Test security headers
    - Run security scan (OWASP ZAP or similar)
    - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.7_

- [ ] 22. Checkpoint - Staging validation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Production deployment
  - [~] 23.1 Prepare production environment
    - Provision production Redis instance
    - Configure production database connection
    - Set up production monitoring and alerting
    - Configure production environment variables
    - Set up backup and disaster recovery
    - _Requirements: 16.2_
  
  - [~] 23.2 Deploy canary release (10% traffic)
    - Deploy new services to production
    - Route 10% of traffic to new services
    - Monitor error rates closely
    - Monitor response times
    - Monitor cache hit rates
    - Monitor circuit breaker states
    - _Requirements: 16.3_
  
  - [~] 23.3 Monitor canary metrics
    - Compare error rates: new vs old services
    - Compare response times: new vs old services
    - Check for any critical errors
    - Verify cache is working correctly
    - Verify rate limiting is working
    - _Requirements: 19.1, 19.2_
  
  - [~] 23.4 Gradually increase traffic to new services
    - Increase to 25% traffic if canary is stable
    - Increase to 50% traffic after monitoring
    - Increase to 75% traffic after monitoring
    - Increase to 100% traffic after monitoring
    - Monitor at each step for issues
    - _Requirements: 16.3_
  
  - [~] 23.5 Run production data migration
    - Schedule maintenance window
    - Run data migration scripts
    - Verify data integrity
    - Monitor for any issues
    - Keep rollback plan ready
    - _Requirements: 16.1, 16.5, 16.6_
  
  - [~] 23.6 Deprecate old services
    - Mark old service endpoints as deprecated
    - Add deprecation warnings to responses
    - Notify users of migration timeline
    - Monitor usage of old endpoints
    - Plan decommissioning date (6 months)
    - _Requirements: 20.4, 20.5_
  
  - [~] 23.7 Final production validation
    - Run full smoke test suite
    - Verify all functionality works
    - Verify monitoring and alerting
    - Verify backup procedures
    - Document any issues and resolutions
    - _Requirements: 16.2_

- [ ] 24. Post-deployment monitoring and optimization
  - [~] 24.1 Monitor production metrics for 1 week
    - Monitor error rates daily
    - Monitor response times daily
    - Monitor cache hit rates daily
    - Monitor circuit breaker activity
    - Monitor rate limit violations
    - Address any issues immediately
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [~] 24.2 Optimize based on production data
    - Tune cache TTLs based on hit rates
    - Adjust rate limits based on usage patterns
    - Optimize slow queries identified in production
    - Adjust connection pool sizes if needed
    - _Requirements: 9.7, 15.5_
  
  - [~] 24.3 Document lessons learned
    - Document any issues encountered
    - Document solutions and workarounds
    - Update runbooks and procedures
    - Share knowledge with team
    - Update documentation based on feedback

- [ ] 25. Final checkpoint - Production deployment complete
  - Ensure all systems are stable, ask the user if questions arise.

## Phase 2: AI Production Enhancements (Weeks 9-12)

- [ ] 26. AI Infrastructure setup
  - [~] 26.1 Set up RQ (Redis Queue) for background tasks
    - Install rq and rq-scheduler packages
    - Configure RQ connection to Redis
    - Create worker configuration file
    - Set up worker process management (systemd or supervisor)
    - Test basic job enqueueing and processing
    - _New AI Enhancement_
  
  - [~] 26.2 Create prompts directory structure
    - Create backend/prompts/ directory
    - Create prompt template files (code_generation_v1.txt, project_planning.txt, simple_question.txt, code_explanation.txt)
    - Set up prompt versioning convention (v1, v2, etc.)
    - Add .gitignore rules for sensitive prompts if needed
    - Document prompt template format and variables
    - _New AI Enhancement_
  
  - [~] 26.3 Create workers directory structure
    - Create backend/workers/ directory
    - Create worker entry point (ai_worker.py)
    - Configure worker to process AI tasks
    - Set up worker logging
    - Test worker startup and shutdown
    - _New AI Enhancement_
  
  - [~] 26.4 Configure free OpenRouter models
    - Document available free models (Gemini Flash, Gemini Pro, Llama 3.1, Qwen 2.5)
    - Set up model configuration with rate limits
    - Configure fallback chains for reliability
    - Test connectivity to OpenRouter API
    - Verify free tier limits and quotas
    - _New AI Enhancement_

- [ ] 27. Implement Model Router
  - [~] 27.1 Create ModelRouter class
    - Create backend/services/model_router.py
    - Implement ModelTier enum (FAST, BALANCED, POWERFUL)
    - Implement select_model method with task type mapping
    - Map task types to free models (Gemini Flash for FAST, Gemini Pro for BALANCED, Qwen 72B for POWERFUL)
    - Implement get_fallback_models method
    - _New AI Enhancement_
  
  - [~] 27.2 Implement model fallback logic
    - Create fallback chain configuration
    - Implement automatic fallback on model failures
    - Add retry logic with exponential backoff
    - Log model selection and fallbacks
    - Track fallback usage metrics
    - _New AI Enhancement_
  
  - [~] 27.3 Add model performance tracking
    - Track response times per model
    - Track success/failure rates per model
    - Track token usage per model
    - Create model performance dashboard
    - Alert on model degradation
    - _New AI Enhancement_
  
  - [~] 27.4 Write unit tests for ModelRouter
    - Test model selection for each task type
    - Test fallback chain execution
    - Test model tier mapping
    - Test performance tracking
    - Test free model configuration

- [ ] 28. Implement Prompt Service
  - [~] 28.1 Create PromptService class
    - Create backend/services/prompt_service.py
    - Implement load_prompt method to read from files
    - Implement format_prompt method with variable substitution
    - Implement get_prompt method (load + format)
    - Add prompt caching in memory
    - _New AI Enhancement_
  
  - [~] 28.2 Create initial prompt templates
    - Create code_generation_v1.txt with variables
    - Create project_planning.txt with variables
    - Create simple_question.txt with variables
    - Create code_explanation.txt with variables
    - Document required variables for each template
    - _New AI Enhancement_
  
  - [~] 28.3 Implement prompt versioning
    - Support version parameter in load_prompt
    - Implement "latest" version resolution
    - Add prompt version tracking in logs
    - Support A/B testing with different versions
    - _New AI Enhancement_
  
  - [~] 28.4 Add hot-reload support
    - Implement reload_prompts method
    - Add file watcher for prompt directory (development only)
    - Clear cache on prompt file changes
    - Log prompt reloads
    - _New AI Enhancement_
  
  - [~] 28.5 Write unit tests for PromptService
    - Test prompt loading from files
    - Test variable substitution
    - Test prompt versioning
    - Test caching behavior
    - Test hot-reload functionality

- [ ] 29. Implement Context Builder
  - [~] 29.1 Create ContextBuilder class
    - Create backend/services/context_builder.py
    - Implement build_user_context method
    - Implement build_project_context method
    - Implement build_conversation_context method
    - Implement build_full_context method
    - _New AI Enhancement_
  
  - [~] 29.2 Implement user context building
    - Fetch user profile (skill level, preferences)
    - Fetch user's past projects
    - Fetch user's learning goals
    - Cache user context (1 hour TTL)
    - Format context for prompt injection
    - _New AI Enhancement_
  
  - [~] 29.3 Implement project context building
    - Fetch project metadata and description
    - Fetch project technology stack
    - Fetch project files and structure
    - Cache project context (2 hour TTL)
    - Format context for prompt injection
    - _New AI Enhancement_
  
  - [~] 29.4 Implement conversation context building
    - Fetch recent messages from session
    - Include detected intents
    - Add conversation summary
    - Cache conversation context (30 min TTL)
    - Format context for prompt injection
    - _New AI Enhancement_
  
  - [~] 29.5 Write unit tests for ContextBuilder
    - Test user context building
    - Test project context building
    - Test conversation context building
    - Test full context assembly
    - Test caching behavior

- [ ] 30. Implement AI Orchestrator
  - [~] 30.1 Create AIOrchestrator class
    - Create backend/services/ai_orchestrator.py
    - Inject ModelRouter, PromptService, ContextBuilder dependencies
    - Implement generate method as main entry point
    - Implement generate_with_cache method
    - Implement stream_response method
    - _New AI Enhancement_
  
  - [~] 30.2 Implement prompt hash-based caching
    - Generate hash from prompt + context
    - Check cache before calling AI model
    - Store AI responses with 1 hour TTL
    - Track cache hit/miss rates
    - Target 60% cache hit rate
    - _New AI Enhancement_
  
  - [~] 30.3 Integrate model routing
    - Use ModelRouter to select model based on task type
    - Pass selected model to AI API
    - Handle model fallbacks on failures
    - Log model selection decisions
    - _New AI Enhancement_
  
  - [~] 30.4 Integrate prompt management
    - Use PromptService to load templates
    - Format prompts with context variables
    - Support prompt versioning
    - Log prompt versions used
    - _New AI Enhancement_
  
  - [~] 30.5 Integrate context building
    - Use ContextBuilder to build full context
    - Inject context into prompts
    - Personalize responses based on user context
    - Log context usage
    - _New AI Enhancement_
  
  - [~] 30.6 Write integration tests for AIOrchestrator
    - Test end-to-end AI generation flow
    - Test prompt hash caching
    - Test model routing integration
    - Test context building integration
    - Test streaming responses

- [ ] 31. Checkpoint - AI Orchestrator complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 32. Implement Task Queue Service
  - [~] 32.1 Create TaskQueueService class
    - Create backend/services/task_queue_service.py
    - Initialize RQ Queue with Redis connection
    - Implement enqueue_ai_request method
    - Implement get_task_status method
    - Implement get_task_result method
    - Implement cancel_task method
    - _New AI Enhancement_
  
  - [~] 32.2 Create AI task worker functions
    - Create backend/workers/ai_tasks.py
    - Implement process_ai_request worker function
    - Add error handling and retries
    - Add progress tracking
    - Add result storage in Redis
    - _New AI Enhancement_
  
  - [~] 32.3 Implement task status tracking
    - Store task status in Redis (QUEUED, PROCESSING, COMPLETED, FAILED)
    - Update status as task progresses
    - Store task results with TTL (24 hours)
    - Implement task cleanup for old tasks
    - _New AI Enhancement_
  
  - [~] 32.4 Add webhook callbacks
    - Support callback_url parameter
    - Send POST request on task completion
    - Include task result in callback payload
    - Retry callbacks on failure
    - Log callback attempts
    - _New AI Enhancement_
  
  - [~] 32.5 Configure worker deployment
    - Set up worker process management
    - Configure worker concurrency (start with 2-5 workers)
    - Set up worker monitoring
    - Configure automatic worker restart on failure
    - Document worker scaling strategy
    - _New AI Enhancement_
  
  - [~] 32.6 Write tests for TaskQueueService
    - Test task enqueueing
    - Test task status tracking
    - Test task result retrieval
    - Test task cancellation
    - Test webhook callbacks

- [ ] 33. Implement Tool System
  - [~] 33.1 Create ToolSystem class
    - Create backend/services/tool_system.py
    - Implement Tool model with name, description, parameters
    - Implement register_tool method
    - Implement execute_tool method
    - Implement get_tool_definitions method
    - _New AI Enhancement_
  
  - [~] 33.2 Implement built-in tools
    - Create search_documentation tool
    - Create calculate tool (safe math evaluation)
    - Create get_current_time tool
    - Create format_code tool
    - Register all built-in tools
    - _New AI Enhancement_
  
  - [~] 33.3 Add tool execution safety
    - Validate tool arguments against schema
    - Implement timeout for tool execution
    - Sandbox tool execution (prevent dangerous operations)
    - Log all tool executions
    - Handle tool execution errors gracefully
    - _New AI Enhancement_
  
  - [~] 33.4 Integrate tools with AI Orchestrator
    - Add use_tools parameter to generate method
    - Include tool definitions in AI prompts
    - Parse tool calls from AI responses
    - Execute requested tools
    - Feed tool results back to AI
    - _New AI Enhancement_
  
  - [~] 33.5 Write tests for ToolSystem
    - Test tool registration
    - Test tool execution
    - Test argument validation
    - Test tool safety measures
    - Test AI integration

- [ ] 34. Implement Experiment Logger
  - [~] 34.1 Create ExperimentLogger class
    - Create backend/services/experiment_logger.py
    - Implement log_request method
    - Implement log_user_feedback method
    - Implement get_prompt_performance method
    - Implement get_model_performance method
    - Implement compare_prompts method
    - _New AI Enhancement_
  
  - [~] 34.2 Create database schema for AI logs
    - Create ai_request_logs table
    - Add indexes on user_id, task_type, prompt_version, model_used
    - Add created_at index for time-based queries
    - Create migration script
    - _New AI Enhancement_
  
  - [~] 34.3 Implement request logging
    - Log all AI requests with full metadata
    - Track prompt version, model used, tokens, latency
    - Track cache hits/misses
    - Track tools used
    - Store request/response for analysis
    - _New AI Enhancement_
  
  - [~] 34.4 Implement feedback collection
    - Add user rating endpoint (1-5 stars)
    - Add feedback text endpoint
    - Link feedback to request IDs
    - Store feedback in database
    - _New AI Enhancement_
  
  - [~] 34.5 Create analytics queries
    - Query prompt performance by version
    - Query model performance metrics
    - Calculate average ratings per prompt
    - Calculate cost per request (always $0 for free models)
    - Generate performance reports
    - _New AI Enhancement_
  
  - [~] 34.6 Write tests for ExperimentLogger
    - Test request logging
    - Test feedback collection
    - Test performance queries
    - Test prompt comparison
    - Test analytics calculations

- [ ] 35. Enhance existing services with AI features
  - [~] 35.1 Update UnifiedChatService with Session Brain
    - Add conversation memory to get_conversation_context
    - Track conversation topics and entities
    - Maintain conversation state across messages
    - Use conversation context in AI requests
    - _New AI Enhancement_
  
  - [~] 35.2 Add streaming to all AI endpoints
    - Update POST /api/ai/guidance to support streaming
    - Update POST /api/ai/generate to support streaming
    - Update POST /api/chat/message to support streaming
    - Use Server-Sent Events (SSE) for streaming
    - Add stream parameter to all AI endpoints
    - _New AI Enhancement_
  
  - [~] 35.3 Update AIService to use AI Orchestrator
    - Replace direct OpenRouter calls with AIOrchestrator
    - Remove duplicate caching logic (use orchestrator's cache)
    - Remove duplicate model selection (use ModelRouter)
    - Simplify AIService to thin wrapper
    - _New AI Enhancement_
  
  - [~] 35.4 Update CodeGenerationService to use AI Orchestrator
    - Use AIOrchestrator for code generation
    - Enable streaming for code generation
    - Use CODE_GENERATION task type
    - Add tool support for code execution
    - _New AI Enhancement_

- [ ] 36. Checkpoint - AI enhancements integrated
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 37. AI endpoints and API updates
  - [~] 37.1 Create background AI task endpoints
    - Create POST /api/ai/tasks to enqueue background tasks
    - Create GET /api/ai/tasks/:id to get task status
    - Create GET /api/ai/tasks/:id/result to get task result
    - Create DELETE /api/ai/tasks/:id to cancel task
    - Add rate limiting (10 background tasks per hour per user)
    - _New AI Enhancement_
  
  - [~] 37.2 Add streaming support to existing endpoints
    - Update POST /api/chat/message with ?stream=true parameter
    - Update POST /api/ai/guidance with ?stream=true parameter
    - Update POST /api/code/generate with ?stream=true parameter
    - Return SSE stream when stream=true
    - Return JSON when stream=false (default)
    - _New AI Enhancement_
  
  - [~] 37.3 Create feedback endpoints
    - Create POST /api/ai/feedback/:request_id to submit rating
    - Create GET /api/ai/analytics/prompts to view prompt performance
    - Create GET /api/ai/analytics/models to view model performance
    - Restrict analytics endpoints to admin users
    - _New AI Enhancement_
  
  - [~] 37.4 Create tool management endpoints (admin only)
    - Create GET /api/ai/tools to list available tools
    - Create POST /api/ai/tools to register custom tools
    - Create DELETE /api/ai/tools/:name to remove tools
    - Restrict to admin users only
    - _New AI Enhancement_
  
  - [~] 37.5 Write integration tests for AI endpoints
    - Test background task enqueueing and retrieval
    - Test streaming responses
    - Test feedback submission
    - Test tool management
    - Test rate limiting

- [ ] 38. Performance optimization for AI features
  - [~] 38.1 Optimize prompt hash caching
    - Tune cache TTL based on hit rates
    - Implement cache warming for common prompts
    - Add cache statistics endpoint
    - Monitor cache memory usage
    - Target 60% cache hit rate
    - _New AI Enhancement_
  
  - [~] 38.2 Optimize RQ worker configuration
    - Tune worker count based on load
    - Configure worker timeout (300 seconds for AI tasks)
    - Set up worker autoscaling rules
    - Monitor queue length and processing time
    - Target <30 second queue wait time
    - _New AI Enhancement_
  
  - [~] 38.3 Optimize context building
    - Cache user context aggressively (1 hour TTL)
    - Cache project context (2 hour TTL)
    - Minimize database queries
    - Use connection pooling
    - _New AI Enhancement_
  
  - [~] 38.4 Optimize free model usage
    - Monitor rate limits for each free model
    - Implement smart rate limit distribution
    - Add request queuing when approaching limits
    - Track model availability and quotas
    - _New AI Enhancement_
  
  - [~] 38.5 Run AI-specific load tests
    - Test with 100 concurrent AI requests
    - Test background task processing capacity
    - Test streaming response performance
    - Verify cache hit rates under load
    - Test free model rate limit handling

- [ ] 39. Documentation for AI features
  - [~] 39.1 Document AI Orchestrator usage
    - Document task types and model selection
    - Document prompt template format
    - Document context building
    - Provide code examples
    - _New AI Enhancement_
  
  - [~] 39.2 Document prompt template creation
    - Document template syntax and variables
    - Document versioning strategy
    - Provide template examples
    - Document A/B testing workflow
    - _New AI Enhancement_
  
  - [~] 39.3 Document tool system
    - Document built-in tools
    - Document custom tool registration
    - Document tool safety guidelines
    - Provide tool examples
    - _New AI Enhancement_
  
  - [~] 39.4 Document background task API
    - Document task enqueueing
    - Document status polling
    - Document webhook callbacks
    - Provide client examples
    - _New AI Enhancement_
  
  - [~] 39.5 Create AI architecture diagrams
    - Diagram AI request flow through orchestrator
    - Diagram background task processing
    - Diagram streaming response flow
    - Diagram tool execution flow
    - _New AI Enhancement_

- [ ] 40. Staging deployment of AI features
  - [~] 40.1 Deploy AI services to staging
    - Deploy updated services with AI Orchestrator
    - Deploy RQ workers
    - Deploy prompt templates
    - Configure free OpenRouter models
    - _New AI Enhancement_
  
  - [~] 40.2 Test AI features on staging
    - Test AI generation with different task types
    - Test background task processing
    - Test streaming responses
    - Test tool execution
    - Test prompt hash caching
    - Verify 60% cache hit rate
    - _New AI Enhancement_
  
  - [~] 40.3 Monitor AI performance on staging
    - Monitor model response times
    - Monitor cache hit rates
    - Monitor RQ queue length
    - Monitor free model rate limits
    - Check for errors and failures
    - _New AI Enhancement_

- [ ] 41. Production deployment of AI features
  - [~] 41.1 Deploy AI enhancements to production
    - Deploy AI Orchestrator and related services
    - Deploy RQ workers (start with 2-3 workers)
    - Deploy prompt templates
    - Configure production OpenRouter API keys
    - _New AI Enhancement_
  
  - [~] 41.2 Gradual rollout of AI features
    - Enable AI Orchestrator for 10% of requests
    - Monitor error rates and performance
    - Increase to 50% if stable
    - Increase to 100% if stable
    - _New AI Enhancement_
  
  - [~] 41.3 Monitor AI features in production
    - Monitor cache hit rates (target 60%)
    - Monitor model response times
    - Monitor RQ worker health
    - Monitor free model rate limits
    - Track user feedback and ratings
    - _New AI Enhancement_
  
  - [~] 41.4 Optimize based on production data
    - Tune cache TTLs based on hit rates
    - Adjust worker count based on queue length
    - Optimize prompts based on user ratings
    - Switch models based on performance data
    - _New AI Enhancement_

- [ ] 42. Final checkpoint - AI enhancements complete
  - Ensure all AI features are stable and performing well, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit and integration tests validate specific examples and edge cases
- The migration follows a 12-week strategy (8 weeks core + 4 weeks AI enhancements) with gradual rollout to minimize risk
- Rollback procedures are documented and tested at each phase
- All tasks build incrementally to maintain system functionality throughout migration
- AI enhancements use 100% free OpenRouter models (Gemini, Llama, Qwen) for zero API costs
- Phase 2 (AI enhancements) can be started after Phase 1 (core consolidation) is stable in production
