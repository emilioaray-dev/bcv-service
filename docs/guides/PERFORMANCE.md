# Performance Testing and Optimization Guide

This guide covers the performance testing infrastructure, optimizations, and best practices for the BCV Service.

## Table of Contents

- [Overview](#overview)
- [Performance Optimizations](#performance-optimizations)
- [Benchmarking with autocannon](#benchmarking-with-autocannon)
- [Load Testing with Artillery](#load-testing-with-artillery)
- [Running Tests](#running-tests)
- [Performance Targets](#performance-targets)
- [Interpreting Results](#interpreting-results)
- [Troubleshooting](#troubleshooting)
- [Continuous Monitoring](#continuous-monitoring)

## Overview

The BCV Service implements a comprehensive performance testing strategy including:

- **Benchmarking**: Quick performance snapshots using autocannon
- **Load Testing**: Realistic traffic simulation using Artillery
- **Database Optimization**: MongoDB indexes and connection pooling
- **Caching Strategy**: Redis for frequently accessed data
- **Monitoring**: Prometheus metrics and observability

## Performance Optimizations

### MongoDB Optimizations

#### Connection Pool Configuration

The service uses optimized MongoDB connection pool settings for maximum throughput:

```typescript
{
  maxPoolSize: 10,              // Maximum connections in pool
  minPoolSize: 2,               // Minimum idle connections
  maxIdleTimeMS: 60000,         // 1 minute idle timeout
  connectTimeoutMS: 10000,      // 10 second connect timeout
  socketTimeoutMS: 45000,       // 45 second socket timeout
  serverSelectionTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  compressors: ['zstd', 'snappy', 'zlib']
}
```

**Configuration via environment variables**:

```bash
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_MAX_IDLE_TIME_MS=60000
MONGODB_CONNECT_TIMEOUT_MS=10000
MONGODB_SOCKET_TIMEOUT_MS=45000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
MONGODB_HEARTBEAT_FREQUENCY_MS=10000
MONGODB_RETRY_WRITES=true
MONGODB_RETRY_READS=true
MONGODB_COMPRESSORS=zstd,snappy,zlib
```

#### Database Indexes

Five optimized indexes created for common query patterns:

1. **idx_createdAt_desc** - For `getLatestRate()`
   ```javascript
   { createdAt: -1 }
   ```
   Optimizes: Finding the most recently created rate

2. **idx_date_asc** - For `getRateByDate()`
   ```javascript
   { date: 1 }
   ```
   Optimizes: Date-based lookups and regex queries

3. **idx_date_source_unique** - For data integrity
   ```javascript
   { date: 1, source: 1 }, { unique: true }
   ```
   Optimizes: Prevents duplicate rates, fast upserts

4. **idx_date_createdAt_desc** - For `getRateHistory()`
   ```javascript
   { date: -1, createdAt: -1 }
   ```
   Optimizes: Historical queries with sorting

5. **idx_id_asc** - For ID lookups
   ```javascript
   { id: 1 }
   ```
   Optimizes: Quick document identification

**Index creation strategy**:
- All indexes created with `background: true` to avoid blocking
- Created in parallel using `Promise.all()` for faster startup
- Automatically created on service connection

### Redis Caching Strategy

The service implements a multi-layer caching strategy:

- **Latest rate**: Cached for 5 minutes (most frequent query)
- **Historical rates**: Cached for 24 hours (static data)
- **Rate history**: Cached for 1 hour
- **Cache invalidation**: Automatic on new rate updates

See [REDIS_CACHING.md](./REDIS_CACHING.md) for detailed documentation.

### Application-Level Optimizations

- **Compression**: GZIP/Brotli compression for responses
- **Security headers**: Helmet.js with minimal overhead
- **Rate limiting**: Express rate limiter with Redis store
- **Graceful shutdown**: Proper connection cleanup
- **Error handling**: Efficient error recovery

## Benchmarking with autocannon

### What is autocannon?

autocannon is a Node.js HTTP benchmarking tool that measures:
- Requests per second (RPS)
- Latency (min, max, mean, percentiles)
- Throughput (bytes/sec)
- Error rates

### Running Benchmarks

```bash
# Ensure service is running
pnpm dev

# Run benchmarks (in another terminal)
pnpm benchmark
```

### Benchmark Configuration

Default settings (customizable in `benchmarks/benchmark-endpoints.ts`):

```typescript
const DURATION = 30;        // 30 seconds per endpoint
const CONNECTIONS = 10;     // 10 concurrent connections
const PIPELINING = 1;       // 1 request per connection
```

### Endpoints Benchmarked

1. **Health Check** (`/healthz`)
   - Expected: Very fast, <5ms
   - Purpose: Service availability

2. **Metrics** (`/metrics`)
   - Expected: Fast, <20ms
   - Purpose: Prometheus scraping

3. **Latest Rate** (`/api/rate/latest`)
   - Expected: Fast with cache, <50ms
   - Purpose: Most common query

4. **Rate by Date** (`/api/rate/2024-01-15`)
   - Expected: <100ms with index
   - Purpose: Historical queries

5. **Rate History** (`/api/rate/history`)
   - Expected: <200ms
   - Purpose: Bulk data retrieval

### Interpreting Benchmark Results

Example output:
```
╔═══════════════════════╤════════════╤═════════════╤════════════╤═══════════╗
║ Endpoint              │ Req/Sec    │ Latency (ms)│ Throughput │ Errors    ║
╟───────────────────────┼────────────┼─────────────┼────────────┼───────────╢
║ Health Check          │ 5,234      │ 1.8         │ 1.5 MB/s   │ 0         ║
║ Latest Rate (cached)  │ 3,456      │ 2.8         │ 2.1 MB/s   │ 0         ║
║ Rate by Date          │ 1,234      │ 8.1         │ 780 KB/s   │ 0         ║
╚═══════════════════════╧════════════╧═════════════╧════════════╧═══════════╝
```

**Good indicators**:
- Req/Sec > 1,000 for cached endpoints
- Req/Sec > 500 for database queries
- Latency < 50ms for most queries
- 0 errors

**Warning signs**:
- Req/Sec < 100 (possible bottleneck)
- Latency > 500ms (needs optimization)
- Any errors (investigate immediately)

### Benchmark Results Storage

Results are automatically saved to timestamped JSON files:
```
benchmarks/results/
├── benchmark-2024-01-15-120000.json
├── benchmark-2024-01-16-140000.json
└── ...
```

Compare results over time to track performance regressions.

## Load Testing with Artillery

### What is Artillery?

Artillery is a modern load testing framework that simulates realistic user traffic patterns with:
- Multiple phases (warm-up, ramp-up, sustained load, peaks)
- Weighted scenarios (realistic traffic distribution)
- Performance thresholds and assertions
- Detailed metrics and reports

### Test Scenarios

Three graduated test scenarios are available:

#### 1. Light Load Test
**Purpose**: Development and initial testing

```bash
pnpm load-test:light
```

- **Duration**: ~5 minutes
- **Peak load**: 50 concurrent users
- **Thresholds**:
  - Error rate: < 1%
  - P95 latency: < 200ms
  - P99 latency: < 500ms

**Use when**:
- Local development
- Quick validation
- Post-commit verification

#### 2. Medium Load Test
**Purpose**: Staging environment validation

```bash
pnpm load-test:medium
```

- **Duration**: ~12 minutes
- **Peak load**: 300 concurrent users (with 300 spike)
- **Thresholds**:
  - Error rate: < 2%
  - P95 latency: < 300ms
  - P99 latency: < 1s

**Use when**:
- Pre-production testing
- Release validation
- Performance regression testing

#### 3. Stress Test
**Purpose**: Finding breaking points

```bash
pnpm load-test:stress
```

- **Duration**: ~17 minutes
- **Peak load**: 1,000 concurrent users
- **Thresholds**:
  - Error rate: < 5%
  - P95 latency: < 1s
  - P99 latency: < 3s

**Use when**:
- Capacity planning
- Finding system limits
- Disaster recovery planning

### Traffic Distribution

Tests simulate realistic traffic patterns:

| Endpoint | Light | Medium | Stress | Reason |
|----------|-------|--------|--------|---------|
| `/healthz` | 20% | 15% | 10% | Health monitoring |
| `/metrics` | 10% | 5% | - | Prometheus scraping |
| `/api/rate/latest` | 50% | 60% | 70% | Most common query |
| `/api/rate/:date` | 15% | 15% | 15% | Historical lookups |
| `/api/rate/history` | 5% | 5% | 5% | Bulk retrieval |

### Custom Metrics

The load tests track custom metrics via `load-test-processor.js`:

- **Cache hits/misses**: Track cache effectiveness
- **Response sizes**: Monitor payload sizes
- **Error logging**: Detailed error tracking
- **User simulation**: Realistic user behavior

## Running Tests

### Prerequisites

1. **Start the service**:
   ```bash
   pnpm dev
   ```

2. **Verify service is healthy**:
   ```bash
   curl http://localhost:3000/healthz
   ```

3. **Optional: Monitor during tests**:
   ```bash
   # Terminal 1: Service logs
   pnpm dev

   # Terminal 2: Load test
   pnpm load-test:light

   # Terminal 3: Metrics monitoring
   watch -n 1 curl -s http://localhost:3000/metrics
   ```

### Running Benchmark Tests

```bash
# Run all endpoint benchmarks
pnpm benchmark

# Results saved to: benchmarks/results/benchmark-{timestamp}.json
```

### Running Load Tests

```bash
# Light load test (development)
pnpm load-test:light

# Medium load test (staging)
pnpm load-test:medium

# Stress test (capacity planning)
pnpm load-test:stress
```

### Advanced Artillery Options

#### Generate HTML Report

```bash
# Run test and save output
artillery run load-tests/load-test-light.yml --output report.json

# Generate HTML report
artillery report report.json --output report.html

# Open in browser
open report.html
```

#### Test Against Different Environment

```bash
# Test staging environment
artillery run --target https://staging.example.com load-tests/load-test-light.yml

# Test production (use with caution!)
artillery run --target https://api.example.com load-tests/load-test-light.yml
```

#### Debug Mode

```bash
DEBUG=http artillery run load-tests/load-test-light.yml
```

## Performance Targets

Based on the service architecture and expected load:

### Response Time Targets

| Metric | Target | Good | Excellent | Endpoint Type |
|--------|--------|------|-----------|---------------|
| P50 latency | < 50ms | < 30ms | < 20ms | Cached queries |
| P50 latency | < 100ms | < 75ms | < 50ms | Database queries |
| P95 latency | < 200ms | < 100ms | < 50ms | Cached queries |
| P95 latency | < 500ms | < 300ms | < 200ms | Database queries |
| P99 latency | < 500ms | < 300ms | < 100ms | Cached queries |
| P99 latency | < 1s | < 500ms | < 300ms | Database queries |

### Throughput Targets

| Metric | Target | Good | Excellent |
|--------|--------|------|-----------|
| RPS (overall) | > 50 | > 100 | > 500 |
| RPS (cached) | > 200 | > 500 | > 1,000 |
| RPS (database) | > 50 | > 100 | > 300 |

### Reliability Targets

| Metric | Target | Good | Excellent |
|--------|--------|------|-----------|
| Error rate | < 1% | < 0.5% | < 0.1% |
| Uptime | > 99% | > 99.5% | > 99.9% |
| Cache hit rate | > 70% | > 85% | > 95% |

### Resource Utilization Targets

| Metric | Target | Good | Excellent |
|--------|--------|------|-----------|
| CPU usage | < 70% | < 50% | < 30% |
| Memory usage | < 512MB | < 256MB | < 128MB |
| DB connections | < 8 | < 5 | < 3 |

## Interpreting Results

### Successful Test Indicators

✅ **Good performance**:
- All test phases complete without errors
- Latencies within thresholds
- No 500-series errors
- CPU/Memory usage reasonable
- Cache hit rate > 70%
- Stable response times throughout test

### Warning Signs

⚠️ **Needs attention**:
- P99 latency approaching thresholds
- Error rate > 0.5%
- Increasing latency over time
- Memory usage growing steadily
- Cache hit rate < 70%
- Occasional 503 errors

### Critical Issues

🚨 **Immediate action required**:
- Error rate > 5%
- P99 latency > 3s
- Many 503 errors (service overload)
- 500 errors (application crashes)
- Memory leaks (constant growth)
- Database connection exhaustion

### Common Performance Issues

#### 1. High Latency

**Symptoms**:
- P95 > 500ms
- P99 > 1s

**Possible causes**:
- Slow MongoDB queries
- Cache misses
- Network latency
- CPU throttling

**Solutions**:
```bash
# Check MongoDB query performance
# Look for slow queries in logs

# Check cache hit rates
curl http://localhost:3000/metrics | grep cache

# Check database indexes
# Verify all queries use indexes

# Monitor CPU usage
top -pid $(pgrep node)
```

#### 2. High Error Rate

**Symptoms**:
- Error rate > 2%
- 500-series errors in logs

**Possible causes**:
- Application bugs
- Database connection issues
- Resource exhaustion
- Rate limiting

**Solutions**:
```bash
# Check application logs
tail -f logs/error.log

# Check database connectivity
mongosh $MONGO_URI --eval "db.adminCommand('ping')"

# Check Redis connectivity
redis-cli -u $REDIS_URI ping

# Check resource limits
ulimit -a
```

#### 3. Service Unavailable (503)

**Symptoms**:
- 503 errors under load
- Timeouts
- Connection refused

**Possible causes**:
- Connection pool exhaustion
- Too many concurrent requests
- Resource limits reached

**Solutions**:
```bash
# Increase connection pool size
MONGODB_MAX_POOL_SIZE=20

# Scale horizontally
# Add more service instances

# Implement request queuing
# Add rate limiting
```

#### 4. Memory Leaks

**Symptoms**:
- Memory usage constantly growing
- Eventual crash
- OOM errors

**Possible causes**:
- Unclosed connections
- Event listener leaks
- Large object retention

**Solutions**:
```bash
# Profile with Node.js inspector
node --inspect dist/app.js

# Use heap snapshots
# Compare memory over time

# Review caching strategy
# Implement cache size limits
```

## Troubleshooting

### Load Test Won't Start

```bash
# Verify service is running
curl http://localhost:3000/healthz

# Check port availability
lsof -i :3000

# Check Artillery installation
artillery --version
```

### Connection Refused

```bash
# Service not running
pnpm dev

# Wrong port
# Check .env PORT setting

# Firewall blocking
# Check firewall rules
```

### All Requests Timing Out

```bash
# Service crashed
# Check logs: docker compose logs -f bcv-service

# Database not responding
mongosh $MONGO_URI --eval "db.adminCommand('ping')"

# Redis not responding
redis-cli -u $REDIS_URI ping
```

### Inconsistent Results

```bash
# Run multiple times
for i in {1..5}; do pnpm benchmark; done

# Check system load
top

# Close other applications
# Ensure clean environment
```

## Continuous Monitoring

### In Development

```bash
# Run benchmarks after changes
pnpm benchmark

# Compare with baseline
diff benchmarks/results/baseline.json benchmarks/results/latest.json
```

### In CI/CD

```yaml
# GitHub Actions example
- name: Performance Tests
  run: |
    pnpm dev &
    sleep 10
    pnpm load-test:light
    pnpm benchmark
```

### In Production

- Monitor with Prometheus metrics
- Set up alerts for:
  - P99 latency > 1s
  - Error rate > 1%
  - CPU > 80%
  - Memory > 80%
- Regular load testing in staging
- Capacity planning based on trends

## Best Practices

1. **Test in stages**: Always start with light, then medium, then stress
2. **Monitor during tests**: Watch CPU, memory, disk I/O, network
3. **Use production-like data**: Test with realistic database content
4. **Test cache behavior**: Run both cold and warm cache scenarios
5. **Document results**: Keep records for trend analysis
6. **Test regularly**: Include in CI/CD to catch regressions early
7. **Set baselines**: Establish performance baselines for comparison
8. **Test edge cases**: Test with missing data, errors, timeouts
9. **Simulate real traffic**: Use weighted scenarios matching actual usage
10. **Plan for growth**: Test at 2x-3x expected load

## Related Documentation

- [Load Testing README](../../load-tests/README.md) - Detailed Artillery guide
- [Benchmarking README](../../benchmarks/README.md) - autocannon usage
- [Redis Caching](./REDIS_CACHING.md) - Caching strategy
- [Monitoring](../deployment/MONITORING.md) - Production monitoring
- [Architecture](../architecture/ARCHITECTURE.md) - System design

## Performance Optimization Roadmap

### Completed ✅

- MongoDB connection pooling
- Database indexes optimization
- Redis caching implementation
- Benchmark infrastructure (autocannon)
- Load testing infrastructure (Artillery)
- Comprehensive documentation

### Future Improvements

- [ ] Query result caching at application level
- [ ] Database query optimization review
- [ ] CDN integration for static assets
- [ ] Horizontal scaling with load balancer
- [ ] Database read replicas
- [ ] Advanced caching strategies (stale-while-revalidate)
- [ ] GraphQL implementation for flexible queries
- [ ] HTTP/2 support
- [ ] WebSocket connection pooling
- [ ] Automated performance regression detection

## Conclusion

The BCV Service implements a comprehensive performance testing and optimization strategy. Regular testing and monitoring ensure the service meets performance targets and scales effectively with growing demand.

For questions or issues, please refer to the related documentation or open an issue in the repository.
