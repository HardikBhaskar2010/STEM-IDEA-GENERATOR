# Complete Monitoring Infrastructure Setup Guide

## Overview

This guide provides comprehensive instructions for setting up the complete monitoring infrastructure for the STEM Project Generator backend services, including Prometheus metrics collection, Sentry error tracking, OpenTelemetry distributed tracing, and health check endpoints.

## Requirements Covered

- **14.4**: Prometheus metrics for request count, response time, error rate, and cache hit rate
- **14.5**: OpenTelemetry for distributed tracing
- **14.6**: Sentry SDK for error tracking and alerting
- **19.7**: Dashboards showing key metrics including request rate, error rate, response time, and cache hit rate

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Metrics    │  │   Tracing    │  │    Sentry    │     │
│  │  Collector   │  │  Middleware  │  │     SDK      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │Prometheus│      │   OTLP   │      │  Sentry  │
    │  Server  │      │Collector │      │  Server  │
    └──────────┘      └──────────┘      └──────────┘
          │                  │                  │
          ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ Grafana  │      │  Jaeger  │      │  Sentry  │
    │Dashboard │      │   UI     │      │    UI    │
    └──────────┘      └──────────┘      └──────────┘
```

## Components

### 1. Prometheus Metrics Collection

**Status**: ✅ Implemented

**Files**:
- `backend/infrastructure/metrics.py` - Metrics collector with Prometheus client
- `backend/infrastructure/monitoring_service.py` - Monitoring service with health checks
- `backend/infrastructure/monitoring_endpoints.py` - FastAPI endpoints for metrics and health

**Metrics Collected**:
- `http_requests_total` - Total HTTP requests by method, endpoint, and status
- `http_request_duration_seconds` - HTTP request duration histogram
- `errors_total` - Total errors by type and endpoint
- `cache_hits_total` - Total cache hits by pattern
- `cache_misses_total` - Total cache misses by pattern
- `cache_entries_total` - Total cache entries
- `circuit_breaker_state` - Circuit breaker state (0=closed, 1=open, 2=half_open)
- `circuit_breaker_failures_total` - Total circuit breaker failures
- `circuit_breaker_successes_total` - Total circuit breaker successes
- `db_pool_connections_total` - Total database connections
- `db_pool_connections_active` - Active database connections
- `db_pool_connections_idle` - Idle database connections
- `redis_pool_connections_total` - Total Redis connections
- `rate_limit_exceeded_total` - Total rate limit exceeded events

**Endpoints**:
- `GET /health` - Basic health check (200 if healthy, 503 if unhealthy)
- `GET /health/detailed` - Detailed health check with component status
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe
- `GET /metrics` - Prometheus metrics endpoint

### 2. Sentry Error Tracking

**Status**: ✅ Implemented

**Files**:
- `backend/infrastructure/sentry_config.py` - Sentry SDK configuration

**Features**:
- Automatic error capture and reporting
- Performance monitoring with transaction tracing
- User context tracking
- Request context tracking
- Sensitive data filtering (passwords, tokens, API keys)
- FastAPI, Starlette, and Redis integrations
- Breadcrumb tracking for debugging context

**Configuration**:
```python
from backend.infrastructure.sentry_config import init_sentry

init_sentry(
    dsn=os.getenv("SENTRY_DSN"),
    environment="production",
    release="1.0.0",
    traces_sample_rate=0.1,  # 10% of transactions
    profiles_sample_rate=0.1  # 10% profiling
)
```

### 3. OpenTelemetry Distributed Tracing

**Status**: ✅ Implemented

**Files**:
- `backend/infrastructure/tracing.py` - OpenTelemetry configuration

**Features**:
- Distributed tracing across services
- Automatic instrumentation for FastAPI, Redis, and AsyncPG
- Trace context propagation
- Span creation and management
- OTLP export to collectors (Jaeger, Zipkin, etc.)
- Console export for debugging

**Configuration**:
```python
from backend.infrastructure.tracing import init_tracing

init_tracing(
    service_name="stem-project-generator",
    service_version="1.0.0",
    otlp_endpoint=os.getenv("OTLP_ENDPOINT"),  # e.g., "http://localhost:4317"
    enable_console_export=False,
    sample_rate=1.0
)
```

### 4. Monitoring Service

**Status**: ✅ Implemented

**Files**:
- `backend/infrastructure/monitoring_service.py` - Comprehensive monitoring service

**Features**:
- Database connectivity checks with response time
- Redis connectivity checks with statistics
- Service health checks for all registered services
- Overall health status determination
- Prometheus metrics integration
- Detailed component health reporting

## Setup Instructions

### Step 1: Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ENVIRONMENT=production  # or development, staging

# OpenTelemetry Configuration
OTLP_ENDPOINT=http://localhost:4317  # OTLP collector endpoint
ENABLE_TRACING=true

# Monitoring Configuration
ENABLE_METRICS=true
LOG_LEVEL=INFO
```

### Step 2: Initialize Monitoring in Application

Update your `backend/server.py` to initialize monitoring:

```python
from backend.infrastructure.monitoring_service import initialize_monitoring_service
from backend.infrastructure.monitoring_endpoints import monitoring_router
from backend.infrastructure.sentry_config import init_sentry
from backend.infrastructure.tracing import init_tracing
from backend.infrastructure.db_pool import get_db_pool
from backend.infrastructure.redis_client import get_redis_client
from backend.infrastructure.base_service import get_service_registry
from backend.infrastructure.metrics import metrics

# Initialize Sentry
init_sentry(
    environment=os.getenv("ENVIRONMENT", "development"),
    release="1.0.0",
    traces_sample_rate=0.1
)

# Initialize OpenTelemetry
init_tracing(
    service_name="stem-project-generator",
    service_version="1.0.0",
    otlp_endpoint=os.getenv("OTLP_ENDPOINT")
)

# Initialize monitoring service
monitoring_service = initialize_monitoring_service(
    db_pool=get_db_pool(),
    redis_client=get_redis_client(),
    service_registry=get_service_registry(),
    metrics_collector=metrics
)

# Register monitoring endpoints
app.include_router(monitoring_router)
```

### Step 3: Deploy Prometheus Server

**Option A: Docker Compose (Local Development)**

Create `docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./backend/infrastructure/dashboards:/etc/grafana/provisioning/dashboards
    depends_on:
      - prometheus

volumes:
  prometheus_data:
  grafana_data:
```

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'stem-backend'
    static_configs:
      - targets: ['host.docker.internal:8000']  # Adjust port as needed
    metrics_path: '/metrics'
```

Start monitoring stack:

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

**Option B: Cloud Deployment (Production)**

For production, use managed services:
- **Prometheus**: Grafana Cloud, AWS Managed Prometheus, or self-hosted
- **Grafana**: Grafana Cloud or self-hosted
- **Sentry**: Sentry.io (managed service)
- **OpenTelemetry**: Jaeger, Zipkin, or cloud providers (AWS X-Ray, Google Cloud Trace)

### Step 4: Configure Grafana Dashboards

1. Access Grafana at `http://localhost:3000` (default credentials: admin/admin)
2. Add Prometheus as a data source:
   - Go to Configuration → Data Sources
   - Add Prometheus
   - URL: `http://prometheus:9090`
   - Save & Test

3. Import the dashboard:
   - Go to Dashboards → Import
   - Upload `backend/infrastructure/dashboards/prometheus_dashboard.json`
   - Select Prometheus data source
   - Import

### Step 5: Configure Alerting Rules

Create `prometheus_alerts.yml`:

```yaml
groups:
  - name: backend_alerts
    interval: 30s
    rules:
      # Error rate alert
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      # Response time alert
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "P95 response time is {{ $value }}s"

      # Cache hit rate alert
      - alert: LowCacheHitRate
        expr: rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"

      # Circuit breaker alert
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker is open"
          description: "Circuit breaker for {{ $labels.service_name }} is open"

      # Database connection pool alert
      - alert: DatabasePoolExhausted
        expr: db_pool_connections_idle == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool exhausted"
          description: "No idle database connections available"
```

### Step 6: Verify Monitoring Setup

1. **Check Health Endpoints**:
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/health/detailed
   ```

2. **Check Metrics Endpoint**:
   ```bash
   curl http://localhost:8000/metrics
   ```

3. **Verify Prometheus Scraping**:
   - Open Prometheus UI: `http://localhost:9090`
   - Go to Status → Targets
   - Verify `stem-backend` target is UP

4. **Verify Grafana Dashboard**:
   - Open Grafana: `http://localhost:3000`
   - Navigate to imported dashboard
   - Verify metrics are displaying

5. **Test Sentry Integration**:
   ```python
   from backend.infrastructure.sentry_config import capture_exception
   
   try:
       raise Exception("Test error")
   except Exception as e:
       capture_exception(e)
   ```
   - Check Sentry dashboard for the error

6. **Test OpenTelemetry Tracing**:
   - Make API requests
   - Check Jaeger UI for traces (if configured)

## Monitoring Best Practices

### 1. Metrics Collection

- **Request Metrics**: Track all HTTP requests with method, endpoint, and status
- **Response Time**: Use histograms for percentile calculations (p50, p95, p99)
- **Error Tracking**: Categorize errors by type and endpoint
- **Cache Metrics**: Monitor hit rate, miss rate, and cache size
- **Resource Metrics**: Track connection pools, memory, CPU

### 2. Health Checks

- **Liveness**: Simple check that service is running
- **Readiness**: Check that service can accept traffic (database connected, etc.)
- **Detailed Health**: Include component-level health status

### 3. Alerting

- **Error Rate**: Alert if error rate exceeds 1%
- **Response Time**: Alert if p95 exceeds 2x baseline
- **Cache Hit Rate**: Alert if hit rate falls below 50%
- **Resource Exhaustion**: Alert on connection pool exhaustion
- **Circuit Breakers**: Alert when circuit breakers open

### 4. Tracing

- **Distributed Tracing**: Trace requests across services
- **Database Queries**: Add spans for database operations
- **External API Calls**: Add spans for external API calls
- **Cache Operations**: Add spans for cache operations

### 5. Error Tracking

- **Context**: Include user ID, request ID, endpoint in error reports
- **Sensitive Data**: Filter passwords, tokens, API keys from errors
- **Breadcrumbs**: Add breadcrumbs for debugging context
- **User Feedback**: Allow users to provide feedback on errors

## Dashboard Metrics

The Grafana dashboard includes the following panels:

1. **Request Rate**: Requests per second by endpoint
2. **Response Time**: p50, p95, p99 response times
3. **Error Rate**: Errors per second by type
4. **Cache Hit Rate**: Percentage of cache hits
5. **Circuit Breaker Status**: Current state of circuit breakers
6. **Database Connection Pool**: Total, active, and idle connections
7. **Rate Limit Events**: Rate limit exceeded events
8. **Cache Size**: Total cache entries
9. **HTTP Status Codes**: Distribution of status codes
10. **Redis Connection Pool**: Total Redis connections

## Troubleshooting

### Metrics Not Appearing in Prometheus

1. Check Prometheus configuration:
   ```bash
   docker-compose logs prometheus
   ```

2. Verify metrics endpoint is accessible:
   ```bash
   curl http://localhost:8000/metrics
   ```

3. Check Prometheus targets:
   - Open `http://localhost:9090/targets`
   - Verify target is UP

### Sentry Errors Not Appearing

1. Verify SENTRY_DSN is set correctly
2. Check Sentry initialization in logs
3. Test with manual error capture:
   ```python
   from backend.infrastructure.sentry_config import capture_message
   capture_message("Test message", level="info")
   ```

### OpenTelemetry Traces Not Appearing

1. Verify OTLP_ENDPOINT is set correctly
2. Check OTLP collector is running
3. Verify instrumentation is enabled:
   ```python
   from opentelemetry import trace
   tracer = trace.get_tracer(__name__)
   ```

### Health Check Failing

1. Check database connectivity:
   ```bash
   curl http://localhost:8000/health/detailed
   ```

2. Review component health status in response
3. Check logs for specific component failures

## Production Deployment Checklist

- [ ] Environment variables configured (SENTRY_DSN, OTLP_ENDPOINT)
- [ ] Prometheus server deployed and scraping metrics
- [ ] Grafana dashboards imported and configured
- [ ] Alerting rules configured and tested
- [ ] Sentry project created and DSN configured
- [ ] OpenTelemetry collector deployed (if using)
- [ ] Health check endpoints accessible
- [ ] Monitoring endpoints registered in application
- [ ] Alert notifications configured (email, Slack, PagerDuty)
- [ ] Dashboard access configured for team
- [ ] Runbooks created for common alerts

## Maintenance

### Regular Tasks

- **Weekly**: Review dashboard metrics and identify trends
- **Monthly**: Review and update alerting thresholds
- **Quarterly**: Review and optimize metrics collection
- **Annually**: Review and update monitoring architecture

### Metrics Retention

- **Prometheus**: Configure retention period (default 15 days)
- **Sentry**: Configure event retention (default 90 days)
- **OpenTelemetry**: Configure trace retention based on storage

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [FastAPI Monitoring](https://fastapi.tiangolo.com/advanced/monitoring/)

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review health check: `curl http://localhost:8000/health/detailed`
3. Check Prometheus targets: `http://localhost:9090/targets`
4. Review Sentry events: Sentry dashboard
5. Check OpenTelemetry traces: Jaeger/Zipkin UI
