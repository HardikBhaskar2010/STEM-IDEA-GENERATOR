# Logging Configuration Guide

## Environment-Specific Configuration

This guide provides recommended logging configurations for different deployment environments.

## Development Environment

### Configuration

```bash
# .env.development
ENVIRONMENT=development
LOG_LEVEL=DEBUG
LOG_AGGREGATION_SERVICE=none
```

### Characteristics

- **Console output**: Human-readable colored logs
- **Verbose logging**: DEBUG level for detailed diagnostics
- **No aggregation**: Logs only to stdout
- **Fast iteration**: Immediate feedback during development

### Example Output

```
2024-01-15 10:30:00 [debug    ] Cache miss                 cache_key=user:123 ttl=3600
2024-01-15 10:30:00 [info     ] HTTP request               endpoint=/api/projects method=POST request_id=req-abc123
2024-01-15 10:30:00 [info     ] Database query             query=SELECT * FROM projects duration_ms=12.5
2024-01-15 10:30:00 [info     ] HTTP response              endpoint=/api/projects response_time_ms=45.5 status_code=200
```

## Staging Environment

### Configuration

```bash
# .env.staging
ENVIRONMENT=staging
LOG_LEVEL=INFO
LOG_AGGREGATION_SERVICE=cloudwatch

# CloudWatch configuration
AWS_REGION=us-east-1
CLOUDWATCH_LOG_GROUP=/stem-backend/staging
CLOUDWATCH_LOG_STREAM=application-logs
```

### Characteristics

- **JSON output**: Structured logs for parsing
- **INFO level**: Balance between visibility and volume
- **CloudWatch aggregation**: Centralized log storage
- **Production-like**: Mirrors production setup for testing

### Example Output

```json
{
  "event": "HTTP request",
  "level": "info",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "request_id": "req-abc123",
  "user_id": "user-456",
  "method": "POST",
  "endpoint": "/api/projects"
}
```

## Production Environment

### Configuration

```bash
# .env.production
ENVIRONMENT=production
LOG_LEVEL=INFO
LOG_AGGREGATION_SERVICE=cloudwatch

# CloudWatch configuration
AWS_REGION=us-east-1
CLOUDWATCH_LOG_GROUP=/stem-backend/production
CLOUDWATCH_LOG_STREAM=application-logs

# Optional: Separate error logs
CLOUDWATCH_ERROR_LOG_GROUP=/stem-backend/production-errors
```

### Characteristics

- **JSON output**: Structured logs for analysis
- **INFO level**: Reduced volume, essential information only
- **CloudWatch aggregation**: Long-term storage and analysis
- **High performance**: Minimal logging overhead

### Recommended Practices

1. **Use WARNING level for production issues**:
   ```python
   logger.warning("Cache hit rate below threshold", hit_rate=0.45, threshold=0.80)
   ```

2. **Log business-critical events at INFO**:
   ```python
   logger.info("Project created", project_id=project_id, user_id=user_id)
   ```

3. **Always log errors with full context**:
   ```python
   logger.log_error_with_context(
       error=e,
       request_id=request_id,
       user_id=user_id,
       endpoint=endpoint
   )
   ```

## Log Aggregation Services

### CloudWatch Logs

#### Setup

1. **Install watchtower**:
   ```bash
   pip install watchtower
   ```

2. **Configure IAM permissions**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "logs:CreateLogGroup",
           "logs:CreateLogStream",
           "logs:PutLogEvents",
           "logs:DescribeLogStreams"
         ],
         "Resource": "arn:aws:logs:*:*:log-group:/stem-backend/*"
       }
     ]
   }
   ```

3. **Set environment variables**:
   ```bash
   LOG_AGGREGATION_SERVICE=cloudwatch
   AWS_REGION=us-east-1
   CLOUDWATCH_LOG_GROUP=/stem-backend/production
   CLOUDWATCH_LOG_STREAM=application-logs
   ```

#### CloudWatch Insights Queries

**Error rate by endpoint**:
```sql
fields @timestamp, endpoint, error_type, error_message
| filter level = "error"
| stats count() as error_count by endpoint
| sort error_count desc
```

**Slow requests (>500ms)**:
```sql
fields @timestamp, endpoint, response_time_ms, request_id
| filter response_time_ms > 500
| sort response_time_ms desc
| limit 100
```

**User activity**:
```sql
fields @timestamp, user_id, endpoint, method
| filter user_id != null
| stats count() as request_count by user_id
| sort request_count desc
```

**Request volume by hour**:
```sql
fields @timestamp, endpoint
| stats count() as requests by bin(1h) as hour, endpoint
| sort hour desc
```

### Datadog

#### Setup

1. **Install datadog**:
   ```bash
   pip install datadog
   ```

2. **Get API keys** from Datadog dashboard

3. **Set environment variables**:
   ```bash
   LOG_AGGREGATION_SERVICE=datadog
   DATADOG_API_KEY=your-api-key
   DATADOG_APP_KEY=your-app-key
   ```

#### Datadog Features

- **Automatic log parsing**: JSON logs are automatically parsed
- **APM integration**: Correlate logs with traces
- **Dashboards**: Pre-built and custom dashboards
- **Alerts**: Real-time alerting on log patterns

## Log Levels Guide

### DEBUG

**When to use**: Detailed diagnostic information for troubleshooting

**Examples**:
```python
logger.debug("Cache lookup", cache_key="user:123", found=True)
logger.debug("SQL query", query="SELECT * FROM users WHERE id = $1", params=[123])
logger.debug("Function entry", function="create_project", args={"title": "My Project"})
```

**Environment**: Development only

### INFO

**When to use**: General informational messages about application flow

**Examples**:
```python
logger.info("User logged in", user_id="user-456")
logger.info("Project created", project_id="proj-789", user_id="user-456")
logger.info("Cache warmed", cache_keys=100, duration_ms=250)
```

**Environment**: All environments

### WARNING

**When to use**: Potentially harmful situations that don't prevent operation

**Examples**:
```python
logger.warning("Cache hit rate low", hit_rate=0.45, threshold=0.80)
logger.warning("Slow database query", query_time_ms=1500, threshold_ms=100)
logger.warning("Rate limit approaching", current=95, limit=100)
```

**Environment**: All environments

### ERROR

**When to use**: Error events that might still allow the application to continue

**Examples**:
```python
logger.log_error_with_context(
    error=e,
    request_id=request_id,
    user_id=user_id,
    endpoint="/api/projects",
    operation="create_project"
)
```

**Environment**: All environments

### CRITICAL

**When to use**: Severe errors that may cause application failure

**Examples**:
```python
logger.critical("Database connection lost", error=str(e))
logger.critical("Redis connection failed", error=str(e))
logger.critical("Out of memory", available_mb=50, required_mb=500)
```

**Environment**: All environments

## Performance Tuning

### Log Volume Reduction

#### 1. Adjust Log Level

```bash
# High traffic production
LOG_LEVEL=WARNING  # Only warnings and errors

# Normal production
LOG_LEVEL=INFO  # Standard operational logs

# Debugging issues
LOG_LEVEL=DEBUG  # Detailed diagnostics
```

#### 2. Conditional Logging

```python
# Only log slow queries
if query_time_ms > 100:
    logger.warning("Slow query", query_time_ms=query_time_ms, query=query)

# Only log cache misses for important keys
if not cached and key.startswith("critical:"):
    logger.info("Cache miss for critical key", cache_key=key)
```

#### 3. Sampling (Future Enhancement)

For very high-traffic endpoints, implement sampling:

```python
import random

# Log only 10% of requests
if random.random() < 0.1:
    logger.info("Request sampled", endpoint=endpoint)
```

### Log Aggregation Performance

#### CloudWatch

- **Batch size**: Default 10KB batches
- **Send interval**: Default 5 seconds
- **Async queues**: Enabled by default in watchtower

```python
handler = watchtower.CloudWatchLogHandler(
    log_group=log_group,
    stream_name=log_stream,
    use_queues=True,  # Async logging
    send_interval=5,   # Batch every 5 seconds
    create_log_group=True
)
```

#### Datadog

- **Async logging**: Enabled by default
- **Batch uploads**: Automatic batching
- **Compression**: Automatic compression for large payloads

## Monitoring and Alerting

### Key Metrics to Track

1. **Error Rate**
   - Threshold: > 1% of requests
   - Action: Page on-call engineer

2. **Response Time**
   - Threshold: p95 > 500ms
   - Action: Investigate slow endpoints

3. **Log Volume**
   - Threshold: Sudden 2x increase
   - Action: Check for logging loops

4. **Cache Hit Rate**
   - Threshold: < 50%
   - Action: Review cache configuration

### CloudWatch Alarms

```bash
# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name stem-backend-high-error-rate \
  --alarm-description "Error rate exceeds 1%" \
  --metric-name ErrorCount \
  --namespace STEM/Backend \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### Datadog Monitors

Create monitors in Datadog UI:

1. **Error Rate Monitor**:
   - Query: `status:error`
   - Threshold: > 10 errors in 5 minutes
   - Notify: #alerts channel

2. **Slow Response Monitor**:
   - Query: `response_time_ms:>500`
   - Threshold: > 5 slow requests in 5 minutes
   - Notify: #performance channel

## Security Considerations

### Sensitive Data Sanitization

The logger automatically sanitizes:

- **Credentials**: passwords, tokens, API keys
- **PII**: emails, phone numbers, addresses
- **Financial**: credit card numbers, SSNs

### Custom Sanitization

Add custom patterns in `structured_logger.py`:

```python
SENSITIVE_FIELDS = {
    'password', 'token', 'api_key',
    # Add custom fields
    'internal_id', 'secret_code'
}
```

### Compliance

- **GDPR**: PII is automatically redacted
- **PCI DSS**: Payment data is redacted
- **HIPAA**: Health data should be added to PII_FIELDS

## Troubleshooting

### Issue: Logs Not Appearing

**Symptoms**: No logs in console or aggregation service

**Solutions**:
1. Check `LOG_LEVEL` environment variable
2. Verify middleware is added to FastAPI app
3. Check `ENVIRONMENT` variable (affects formatting)

### Issue: Too Many Logs

**Symptoms**: High log volume, increased costs

**Solutions**:
1. Increase `LOG_LEVEL` to WARNING or ERROR
2. Implement conditional logging for high-frequency events
3. Review and remove unnecessary debug logs

### Issue: Sensitive Data in Logs

**Symptoms**: Passwords or PII visible in logs

**Solutions**:
1. Verify field names match sanitization patterns
2. Add custom patterns to `SENSITIVE_FIELDS` or `PII_FIELDS`
3. Review log statements for direct string formatting

### Issue: CloudWatch Connection Failed

**Symptoms**: Logs not appearing in CloudWatch

**Solutions**:
1. Verify AWS credentials are configured
2. Check IAM permissions for CloudWatch Logs
3. Verify `AWS_REGION` matches log group region
4. Check network connectivity to AWS

### Issue: High Latency

**Symptoms**: Slow request processing

**Solutions**:
1. Verify async logging is enabled
2. Check log aggregation service performance
3. Reduce log volume with higher `LOG_LEVEL`
4. Consider log sampling for high-traffic endpoints

## Best Practices Summary

1. ✅ Use structured logging with context
2. ✅ Set appropriate log levels per environment
3. ✅ Enable log aggregation in staging/production
4. ✅ Monitor key metrics and set up alerts
5. ✅ Sanitize sensitive data automatically
6. ✅ Include request IDs for tracing
7. ✅ Log errors with full context
8. ✅ Use JSON formatting in production
9. ✅ Batch logs for performance
10. ✅ Review and optimize log volume regularly

## Additional Resources

- [Structured Logging README](./STRUCTURED_LOGGING_README.md)
- [structlog Documentation](https://www.structlog.org/)
- [CloudWatch Logs Documentation](https://docs.aws.amazon.com/cloudwatch/latest/logs/)
- [Datadog Logs Documentation](https://docs.datadoghq.com/logs/)
