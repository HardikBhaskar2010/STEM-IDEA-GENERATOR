# Monitoring Infrastructure Setup Guide

This guide explains how to use the comprehensive monitoring infrastructure including Prometheus metrics, Sentry error tracking, OpenTelemetry distributed tracing, and health checks.

## Overview

The monitoring infrastructure provides:

1. **Prometheus Metrics** - Request counts, response times, error rates, cache metrics, circuit breaker states
2. **Sentry Error Tracking** - Automatic error capture with context and user information
3. **OpenTelemetry Tracing** - Distributed tracing across services and external calls
4. **Health Checks** - Database, Redis, and service health monitoring

## Requirements Satisfied

- **Requirement 10.1-10.7**: Health check endpoints with database, Redis, and service checks
- **Requirement 14.4**: Prometheus metrics collection
- **Requirement 14.5**: OpenTelemetry distributed tracing
- **Requirement 14.6**: Sentry error tracking and alerting
- **Requirement 19.7**: Monitoring dashboards

## Quick Start

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Sentry Configuration (optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ENVIRONMENT=development  # or staging, production
RELEASE_VERSION=1.0.0

# OpenTelemetry Configuration (optional)
OTLP_ENDPOINT=http://localhost:4317  # OTLP collector endpoint
SERVICE_NAME=stem-project-generator
SERVICE_VERSION=1.0.0

# Redis Configuration (required for metrics)
REDIS_URL=redis://localhost:6379/0

# Database Configuration (required)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### 2. Initialize Monitoring in FastAPI

```python
from fastapi import FastAPI
from backend.infrastructure.init import initialize_infrastructure, shutdown_infrastructure
from backend.infrastructure.monitoring_endpoints import monitoring_router

app = FastAPI()

# Add monitoring endpoints
app.include_ro