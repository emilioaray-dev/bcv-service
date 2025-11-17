# Load Testing with Artillery

This directory contains Artillery load test configurations for the BCV Service.

## Prerequisites

```bash
# Service must be running
pnpm dev

# Or with docker
docker compose up
```

## Test Scenarios

### 1. Light Load Test (`load-test-light.yml`)
**Use case**: Development and initial testing

- **Duration**: ~5 minutes
- **Peak load**: 50 concurrent users
- **Traffic pattern**: Gradual ramp-up with peak and cool-down
- **Thresholds**:
  - Error rate: < 1%
  - P95 latency: < 200ms
  - P99 latency: < 500ms

```bash
pnpm load-test:light
```

### 2. Medium Load Test (`load-test-medium.yml`)
**Use case**: Staging environment validation

- **Duration**: ~12 minutes
- **Peak load**: 300 concurrent users (with 300 spike)
- **Traffic pattern**: Extended sustained load with spike test
- **Thresholds**:
  - Error rate: < 2%
  - P95 latency: < 300ms
  - P99 latency: < 1s

```bash
pnpm load-test:medium
```

### 3. Stress Test (`load-test-stress.yml`)
**Use case**: Finding breaking points and maximum capacity

- **Duration**: ~17 minutes
- **Peak load**: 1000 concurrent users
- **Traffic pattern**: Aggressive ramp-up to stress limits
- **Thresholds**:
  - Error rate: < 5% (relaxed for stress testing)
  - P95 latency: < 1s
  - P99 latency: < 3s

```bash
pnpm load-test:stress
```

## Understanding the Results

### Key Metrics

1. **RPS (Requests Per Second)**
   - Measures throughput
   - Higher is better
   - Typical good value: > 100 RPS

2. **Latency Percentiles**
   - **p50 (median)**: Half of requests faster than this
   - **p95**: 95% of requests faster than this
   - **p99**: 99% of requests faster than this
   - Lower is better

3. **Error Rate**
   - Percentage of failed requests
   - Should be < 1% for production
   - < 5% acceptable under extreme stress

4. **Status Codes**
   - **200**: Successful requests
   - **404**: Not found (acceptable for historical queries)
   - **500**: Server errors (investigate if > 0)
   - **503**: Service unavailable (indicates overload)

### Sample Output

```
All VUs finished. Total time: 5 minutes
Summary report @ 12:34:56

http.codes.200: ........................................................ 54321
http.codes.404: ........................................................ 123
http.downloaded_bytes: .................................................. 12345678
http.request_rate: ...................................................... 180/sec
http.requests: .......................................................... 54444
http.response_time:
  min: .................................................................. 8
  max: .................................................................. 456
  median: ............................................................... 25
  p95: .................................................................. 89
  p99: .................................................................. 234
http.responses: ......................................................... 54444
vusers.completed: ....................................................... 5000
vusers.created: ......................................................... 5000
vusers.created_by_name.Get Latest Rate: ................................ 3000
vusers.created_by_name.Health Check: ................................... 1000
```

## Traffic Distribution

Tests simulate realistic traffic patterns:

| Endpoint | Light | Medium | Stress |
|----------|-------|--------|--------|
| `/healthz` | 20% | 15% | 10% |
| `/metrics` | 10% | 5% | - |
| `/api/rate/latest` | 50% | 60% | 70% |
| `/api/rate/:date` | 15% | 15% | 15% |
| `/api/rate/history` | 5% | 5% | 5% |

## Performance Targets

Based on the service architecture:

| Metric | Target | Good | Excellent |
|--------|--------|------|-----------|
| RPS | > 50 | > 100 | > 500 |
| P50 latency | < 50ms | < 30ms | < 20ms |
| P95 latency | < 200ms | < 100ms | < 50ms |
| P99 latency | < 500ms | < 300ms | < 100ms |
| Error rate | < 1% | < 0.5% | < 0.1% |

## Analyzing Results

### Successful Test
- All phases complete without errors
- Latencies within thresholds
- No 500-series errors
- CPU/Memory usage reasonable

### Failed Test - Indicators
- High error rate (> 5%)
- P99 latency > 3s
- Many 503 errors (service overload)
- Memory leaks (increasing over time)

### What to Do if Tests Fail

1. **High Latency**
   - Check MongoDB query performance
   - Review Redis cache hit rates
   - Inspect slow queries in logs

2. **High Error Rate**
   - Check application logs for exceptions
   - Verify database connections
   - Check resource limits (CPU, memory)

3. **Service Unavailable (503)**
   - Indicates overload
   - Increase connection pools
   - Scale horizontally (add instances)

4. **Memory Issues**
   - Profile with Node.js inspector
   - Check for memory leaks
   - Review caching strategy

## Advanced Options

### Custom Target URL

```bash
artillery run --target http://staging.example.com load-tests/load-test-light.yml
```

### Generate HTML Report

```bash
artillery run load-tests/load-test-light.yml --output report.json
artillery report report.json --output report.html
```

### Debug Mode

```bash
DEBUG=http artillery run load-tests/load-test-light.yml
```

### Override Variables

```bash
artillery run \
  --target http://production.example.com \
  --overrides '{"config":{"phases":[{"duration":60,"arrivalRate":10}]}}' \
  load-tests/load-test-light.yml
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run load tests
  run: |
    pnpm dev &
    sleep 10
    pnpm load-test:light
    kill $!
```

## Best Practices

1. **Always test in stages**: Start with light, then medium, then stress
2. **Monitor the system**: Watch CPU, memory, disk I/O during tests
3. **Test with production-like data**: Use realistic database content
4. **Test cache behavior**: Run tests both cold and warm
5. **Document results**: Keep records of test runs for comparison
6. **Test regularly**: Include in CI/CD to catch regressions

## Troubleshooting

### Test won't start
- Verify service is running: `curl http://localhost:3000/healthz`
- Check port availability: `lsof -i :3000`

### Connection refused
- Service not running or wrong port
- Firewall blocking connections

### All requests timing out
- Service crashed or frozen
- Check logs: `docker compose logs -f bcv-service`

## Related Documentation

- [Benchmark Results](../benchmarks/README.md)
- [Performance Optimization Guide](../docs/guides/PERFORMANCE.md)
- [Artillery Documentation](https://www.artillery.io/docs)
