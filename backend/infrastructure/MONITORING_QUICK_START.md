# Monitoring Infrastructure - Quick Start Guide

This guide will help you quickly set up and verify the monitoring infrastructure for the STEM Project Generator backend.

## Prerequisites

- Docker and Docker Compose installed
- Backend server running (or ready to run)
- Python dependencies installed (see `requirements.txt`)

## Quick Setup (5 minutes)

### Step 1: Set Environment Variables

Add these to your `backend/.env` file:

```bash
# Optional: Sentry error tracking (get DSN from sentry.io)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ENVIRONMENT=development

# Optional: OpenTelemetry tracing
OTLP_ENDPOINT=http://localhost:4317
ENABLE_TRACING=true
ENABLE_CONSOLE_TRACING=false

# Monitoring configuration
ENABLE_METRICS=true
LOG_LEVEL=INFO
```

**Note**: Sentry and OpenTelemetry are optional. The monitoring infrastructure will work without them.

### Step 2: Start Monitoring Stack

From the `backend` directory:

```bash
# Start Prometheus, Grafana, and Jaeger
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose -f docker-compose.monitoring.yml ps
```

### Step 3: Start Backend Server

```bash
# From backend directory
cd backend
python server.py

# Or with uvicorn
uvicorn server:app --reload --port 8000
```

### Step 4: Verify Setup

1. **Health Check**:
   ```bash
   curl http://localhost:8000/health
   ```
   Expected: `{"status": "healthy", ...}`

2. **Detailed Health Check**:
   ```bash
   curl http://localhost:8000/health/detailed
   ```
   Expected: Detailed component status

3. **Metrics Endpoint**:
   ```bash
   curl http://localhost:8000/metrics
   ```
   Expected: Prometheus metrics in text format

4. **Prometheus UI**:
   - Open: http://localhost:9090
   - Go to Status → Targets
   - Verify `stem-backend` target is UP

5. **Grafana Dashboard**:
   - Open: http://localhost:3000
   - Login: admin/admin
   - Go to Dashboards → Browse
   - Import dashboard from `backend/infrastructure/dashboards/prometheus_dashboard.json`

6. **Jaeger UI** (if using tracing):
   - Open: http://localhost:16686
   - Select service: `stem-project-generator`
   - View traces

## Available Endpoints

| Endpoint | Description | Status Codes |
|----------|-------------|--------------|
| `GET /health` | Basic health check | 200 (healthy), 503 (unhealthy) |
| `GET /health/detailed` | Detailed component health | 200 (healthy), 503 (unhealthy) |
| `GET /health/ready` | Kubernetes readiness probe | 200 (ready), 503 (not ready) |
| `GET /health/live` | Kubernetes liveness probe | 200 (alive) |
| `GET /metrics` | Prometheus metrics | 200 |

## Key Metrics

The monitoring infrastructure collects these metrics:

### Request Metrics
- `http_requests_total` - Total HTTP requests by method, endpoint, status
- `http_request_duration_seconds` - Request duration histogram

### Error Metrics
- `errors_total` - Total errors by type and endpoint

### Cache Metrics
- `cache_hits_total` - Cache hits by pattern
- `cache_misses_total` - Cache misses by pattern
- `cache_entries_total` - Total cache entries

### Circuit Breaker Metrics
- `circuit_breaker_state` - Circuit breaker state (0=closed, 1=open, 2=half_open)
- `circuit_breaker_failures_total` - Circuit breaker failures
- `circuit_breaker_successes_total` - Circuit breaker successes

### Connection Pool Metrics
- `db_pool_connections_total` - Total database connections
- `db_pool_connections_active` - Active database connections
- `db_pool_connections_idle` - Idle database connections
- `redis_pool_connections_total` - Total Redis connections

### Rate Limiting Metrics
- `rate_limit_exceeded_total` - Rate limit exceeded events

## Testing the Monitoring

### Generate Test Traffic

```bash
# Generate some requests
for i in {1..100}; do
  curl http://localhost:8000/health
  sleep 0.1
done
```

### View Metrics in Prometheus

1. Open http://localhost:9090
2. Try these queries:
   - `rate(http_requests_total[1m])` - Request rate
   - `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` - P95 latency
   - `rate(errors_total[5m])` - Error rate
   - `cache_hits_total / (cache_hits_total + cache_misses_total)` - Cache hit rate

### View Dashboard in Grafana

1. Open http://localhost:3000
2. Navigate to the imported dashboard
3. See real-time metrics visualization

## Troubleshooting

### Prometheus Not Scraping Metrics

**Problem**: Prometheus shows target as DOWN

**Solution**:
1. Check backend is running: `curl http://localhost:8000/health`
2. Check metrics endpoint: `curl http://localhost:8000/metrics`
3. If using Docker, update `prometheus.yml` to use `host.docker.internal:8000`
4. Restart Prometheus: `docker-compose -f docker-compose.monitoring.yml restart prometheus`

### Grafana Dashboard Not Showing Data

**Problem**: Dashboard panels show "No data"

**Solution**:
1. Verify Prometheus datasource is configured
2. Check Prometheus is scraping: http://localhost:9090/targets
3. Generate some traffic to the backend
4. Refresh Grafana dashboard

### Health Check Returns 503

**Problem**: `/health` endpoint returns unhealthy status

**Solution**:
1. Check detailed health: `curl http://localhost:8000/health/detailed`
2. Review component status in response
3. Common issues:
   - Database not connected: Check database configuration
   - Redis not connected: Check Redis configuration (optional)
   - Service not registered: Check service initialization

### Sentry Not Receiving Errors

**Problem**: Errors not appearing in Sentry

**Solution**:
1. Verify `SENTRY_DSN` is set correctly in `.env`
2. Check Sentry initialization in logs
3. Test manually:
   ```python
   from backend.infrastructure.sentry_config import capture_message
   capture_message("Test message", level="info")
   ```

## Stopping Monitoring Stack

```bash
# Stop containers
docker-compose -f docker-compose.monitoring.yml down

# Stop and remove volumes (clears data)
docker-compose -f docker-compose.monitoring.yml down -v
```

## Production Deployment

For production, consider:

1. **Managed Services**:
   - Grafana Cloud for Prometheus + Grafana
   - Sentry.io for error tracking
   - AWS X-Ray, Google Cloud Trace, or Datadog for tracing

2. **Security**:
   - Enable authentication on Prometheus and Grafana
   - Use HTTPS for all endpoints
   - Restrict access to monitoring endpoints

3. **Scaling**:
   - Use Prometheus federation for multiple instances
   - Configure appropriate retention periods
   - Set up alerting with Alertmanager

4. **High Availability**:
   - Run multiple Prometheus instances
   - Use Thanos or Cortex for long-term storage
   - Set up redundant Grafana instances

## Next Steps

1. **Configure Alerting**: Set up alerts for critical metrics
2. **Create Custom Dashboards**: Build dashboards for specific use cases
3. **Integrate with CI/CD**: Add monitoring checks to deployment pipeline
4. **Set Up Log Aggregation**: Integrate with ELK stack or similar
5. **Performance Tuning**: Use metrics to identify and fix bottlenecks

## Resources

- [Complete Setup Guide](./MONITORING_COMPLETE_SETUP.md)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

## Support

If you encounter issues:
1. Check logs: `docker-compose -f docker-compose.monitoring.yml logs -f`
2. Review health check: `curl http://localhost:8000/health/detailed`
3. Check Prometheus targets: http://localhost:9090/targets
4. Verify backend logs for initialization errors
