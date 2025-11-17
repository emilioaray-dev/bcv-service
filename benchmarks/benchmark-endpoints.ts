#!/usr/bin/env tsx

/**
 * Benchmark Script for BCV Service Endpoints
 *
 * This script uses autocannon to benchmark the main API endpoints
 * and generate performance metrics.
 */

import autocannon from 'autocannon';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DURATION = 30; // seconds
const CONNECTIONS = 10;
const PIPELINING = 1;

interface Endpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

interface BenchmarkResult {
  endpoint: string;
  path: string;
  requests: {
    total: number;
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    p50: number;
    p75: number;
    p90: number;
    p99: number;
    p99_9: number;
    p99_99: number;
    p99_999: number;
    sent: number;
  };
  latency: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    p50: number;
    p75: number;
    p90: number;
    p99: number;
    p99_9: number;
    p99_99: number;
    p99_999: number;
  };
  throughput: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    total: number;
  };
  errors: number;
  timeouts: number;
  duration: number;
  start: Date;
  finish: Date;
}

// Endpoints to benchmark
const endpoints: Endpoint[] = [
  {
    name: 'Health Check',
    path: '/healthz',
    method: 'GET',
  },
  {
    name: 'Metrics',
    path: '/metrics',
    method: 'GET',
  },
  {
    name: 'Latest Rate',
    path: '/api/rate/latest',
    method: 'GET',
  },
  {
    name: 'Rate by Date',
    path: '/api/rate/2024-01-15',
    method: 'GET',
  },
  {
    name: 'Rate History',
    path: '/api/rate/history',
    method: 'GET',
  },
];

// Results storage
const results: BenchmarkResult[] = [];

/**
 * Run benchmark for a single endpoint
 */
async function benchmarkEndpoint(endpoint: Endpoint): Promise<autocannon.Result> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmarking: ${endpoint.name}`);
  console.log(`URL: ${BASE_URL}${endpoint.path}`);
  console.log(`${'='.repeat(60)}\n`);

  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: `${BASE_URL}${endpoint.path}`,
        connections: CONNECTIONS,
        pipelining: PIPELINING,
        duration: DURATION,
        method: endpoint.method,
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        // Store results
        results.push({
          endpoint: endpoint.name,
          path: endpoint.path,
          ...formatResults(result),
        });

        // Print results
        printResults(endpoint.name, result);
        resolve(result);
      }
    );

    // Progress tracking
    autocannon.track(instance, { renderProgressBar: true });
  });
}

/**
 * Format results for storage
 */
function formatResults(result: autocannon.Result): Omit<BenchmarkResult, 'endpoint' | 'path'> {
  return {
    requests: {
      total: result.requests.total,
      average: result.requests.average,
      mean: result.requests.mean,
      stddev: result.requests.stddev,
      min: result.requests.min,
      max: result.requests.max,
      p50: result.requests.p50,
      p75: result.requests.p75,
      p90: result.requests.p90,
      p99: result.requests.p99,
      p99_9: result.requests.p99_9,
      p99_99: result.requests.p99_99,
      p99_999: result.requests.p99_999,
      sent: result.requests.sent,
    },
    latency: {
      average: result.latency.mean,
      mean: result.latency.mean,
      stddev: result.latency.stddev,
      min: result.latency.min,
      max: result.latency.max,
      p50: result.latency.p50,
      p75: result.latency.p75,
      p90: result.latency.p90,
      p99: result.latency.p99,
      p99_9: result.latency.p99_9,
      p99_99: result.latency.p99_99,
      p99_999: result.latency.p99_999,
    },
    throughput: {
      average: result.throughput.average,
      mean: result.throughput.mean,
      stddev: result.throughput.stddev,
      min: result.throughput.min,
      max: result.throughput.max,
      total: result.throughput.total,
    },
    errors: result.errors,
    timeouts: result.timeouts,
    duration: result.duration,
    start: result.start,
    finish: result.finish,
  };
}

/**
 * Print formatted results
 */
function printResults(name: string, result: autocannon.Result): void {
  console.log(`\n📊 Results for ${name}:`);
  console.log(`   Requests/sec: ${result.requests.mean.toFixed(2)}`);
  console.log(`   Latency (avg): ${result.latency.mean.toFixed(2)}ms`);
  console.log(`   Latency (p50): ${result.latency.p50}ms`);
  console.log(`   Latency (p90): ${result.latency.p90}ms`);
  console.log(`   Latency (p99): ${result.latency.p99}ms`);
  console.log(`   Throughput: ${(result.throughput.mean / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`   Total Requests: ${result.requests.total}`);
  console.log(`   Errors: ${result.errors}`);
  console.log(`   Timeouts: ${result.timeouts}`);
}

/**
 * Generate summary report
 */
function generateSummary(): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log('BENCHMARK SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  console.log('┌─────────────────────────┬──────────┬───────────┬───────────┐');
  console.log('│ Endpoint                │ Req/sec  │ Latency   │ Errors    │');
  console.log('├─────────────────────────┼──────────┼───────────┼───────────┤');

  for (const result of results) {
    const endpoint = result.endpoint.padEnd(23);
    const reqSec = result.requests.mean.toFixed(2).padStart(8);
    const latency = `${result.latency.mean.toFixed(2)}ms`.padStart(9);
    const errors = result.errors.toString().padStart(9);

    console.log(`│ ${endpoint} │ ${reqSec} │ ${latency} │ ${errors} │`);
  }

  console.log('└─────────────────────────┴──────────┴───────────┴───────────┘');

  // Save results to JSON file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = join(__dirname, `results-${timestamp}.json`);

  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        configuration: {
          baseUrl: BASE_URL,
          duration: DURATION,
          connections: CONNECTIONS,
          pipelining: PIPELINING,
        },
        results,
      },
      null,
      2
    )
  );

  console.log(`\n✅ Results saved to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🚀 BCV Service Performance Benchmark');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Duration: ${DURATION}s per endpoint`);
  console.log(`Connections: ${CONNECTIONS}`);
  console.log(`Pipelining: ${PIPELINING}`);

  try {
    // Run benchmarks sequentially
    for (const endpoint of endpoints) {
      await benchmarkEndpoint(endpoint);
      // Wait a bit between benchmarks
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Generate summary
    generateSummary();

    console.log('\n✅ All benchmarks completed successfully!\n');
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if called directly
main();

export { benchmarkEndpoint, formatResults };
