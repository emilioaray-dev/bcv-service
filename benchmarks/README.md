# Performance Benchmarks

This directory contains performance benchmarking tools for the BCV Service.

## Quick Start

```bash
# Start the service first (in another terminal)
pnpm dev

# Run benchmarks
pnpm benchmark
```

## What gets benchmarked?

The benchmark script tests the following endpoints:

1. **Health Check** (`/healthz`) - System health verification
2. **Metrics** (`/metrics`) - Prometheus metrics endpoint
3. **Latest Rate** (`/api/rate/latest`) - Current exchange rate
4. **Rate by Date** (`/api/rate/2024-01-15`) - Historical rate query
5. **Rate History** (`/api/rate/history`) - Multiple historical rates

## Configuration

You can customize the benchmark parameters by setting environment variables:

```bash
# Custom base URL
BASE_URL=http://localhost:3000 pnpm benchmark

# Or edit the constants in benchmark-endpoints.ts:
DURATION = 30;        # seconds per endpoint
CONNECTIONS = 10;     # concurrent connections
PIPELINING = 1;       # HTTP pipelining factor
```

## Understanding the Results

### Key Metrics

- **Requests/sec**: Throughput - higher is better
- **Latency (avg)**: Average response time in milliseconds
- **Latency (p50/p90/p99)**: Percentile latencies
  - p50: 50% of requests faster than this
  - p90: 90% of requests faster than this
  - p99: 99% of requests faster than this
- **Throughput**: Data transfer rate in MB/s
- **Errors**: Number of failed requests
- **Timeouts**: Number of timed-out requests

### Example Output

```
┌─────────────────────────┬──────────┬───────────┬───────────┐
│ Endpoint                │ Req/sec  │ Latency   │ Errors    │
├─────────────────────────┼──────────┼───────────┼───────────┤
│ Health Check            │  8500.00 │    11.76ms│         0 │
│ Latest Rate             │  2500.00 │    40.12ms│         0 │
└─────────────────────────┴──────────┴───────────┴───────────┘
```

## Results Storage

Benchmark results are automatically saved to JSON files with timestamps:

```
benchmarks/results-2025-01-17T15-30-45-123Z.json
```

These files contain detailed metrics for further analysis.

## Performance Targets

Based on typical microservice requirements:

| Metric | Target | Excellent |
|--------|--------|-----------|
| Requests/sec | > 1000 | > 5000 |
| Latency (p50) | < 50ms | < 20ms |
| Latency (p99) | < 200ms | < 100ms |
| Errors | 0% | 0% |

## Optimization Tips

If benchmarks show poor performance:

1. **High Latency**
   - Check MongoDB indexes
   - Review cache hit rates (Redis)
   - Optimize heavy computations

2. **Low Throughput**
   - Increase connection pool sizes
   - Enable compression
   - Use Redis caching

3. **Memory Issues**
   - Check for memory leaks
   - Optimize data structures
   - Review caching strategies

## Tools Used

- **autocannon**: HTTP/HTTPS benchmarking tool
  - Fast, written in Node.js
  - Built-in progress tracking
  - Detailed latency percentiles
