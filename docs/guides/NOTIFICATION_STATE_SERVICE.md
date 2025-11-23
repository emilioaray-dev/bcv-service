# Notification State Service Guide

This guide explains the persistent notification state system implemented in the BCV service.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Persistent Storage](#persistent-storage)
- [Redis Cache Layer](#redis-cache-layer)
- [Change Detection](#change-detection)
- [Integration with Other Services](#integration-with-other-services)

## Overview

The Notification State Service provides a robust mechanism for tracking the last notified exchange rates. This prevents duplicate notifications when the service restarts and ensures accurate change detection across deployments.

### Problem Solved

Previously, the service relied on in-memory state to determine if notifications were needed. This caused:
- Spurious notifications on service restarts (since there was no historical reference)
- Potential duplicate notifications during deployments
- Inconsistent change detection across service instances

### Solution

The persistent notification state system stores the last notified rates in MongoDB and uses Redis as a cache layer for optimal performance.

## Architecture

The service implements a dual-layer storage architecture:

```
┌─────────────────┐    ┌─────────────┐
│   Application   │    │   Redis     │
│  (Notification │◄──►│   Cache     │
│   State Service)│    │ (Fast Read/ │
└─────────────────┘    │   Write)    │
                       └─────────────┘
                              ▲
                              │
                       ┌─────────────┐
                       │   MongoDB   │
                       │(Persistent  │
                       │   Storage)  │
                       └─────────────┘
```

### Components

1. **NotificationStateService**: Main service handling state operations
2. **MongoDB**: Persistent storage for notification state
3. **Redis**: Cache layer for faster read/write operations

## Persistent Storage

### MongoDB Integration

The service stores notification state in the `notification_states` collection:

```typescript
interface NotificationState {
  _id: string;                  // Identifier (e.g., "last_notification")
  lastNotifiedRate: BCVRateData; // The last rate that was notified
  lastNotificationDate: Date;   // Timestamp of last notification
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last update timestamp
}
```

### Data Lifecycle

- **Read**: First attempts to read from Redis, falls back to MongoDB
- **Write**: Writes to both MongoDB (persistence) and Redis (performance)
- **Fallback**: Continues to operate normally if Redis is unavailable

## Redis Cache Layer

### Performance Benefits

- **Fast Reads**: Redis provides sub-millisecond read performance
- **Reduced DB Load**: Frequent state checks don't hit MongoDB
- **High Throughput**: Handles multiple concurrent state operations efficiently

### Cache Strategy

- **Read-Through**: If data not in Redis, fetch from MongoDB and cache
- **Write-Through**: Updates go to both Redis and MongoDB simultaneously
- **Fallback Mode**: Operates normally with MongoDB-only when Redis unavailable

## Change Detection

### Absolute Difference Threshold

The system uses absolute difference instead of percentage:

- **Threshold**: ≥ 0.01 difference in any currency rate
- **Comparison**: Against the last notified rate (stored persistently)
- **Granularity**: Per-currency detection (USD, EUR, CNY, TRY, RUB, etc.)

### Example

If USD rate changes from 38.50 to 38.51 (difference of 0.01), a notification is triggered.
If USD rate changes from 38.50 to 38.505 (difference of 0.005), no notification is triggered.

## Integration with Other Services

### BCV Service

The BCV service now delegates change detection to the NotificationStateService:

```typescript
// Instead of comparing with in-memory state
const hasChange = this.hasRateChanged(this.lastRate, currentRate);

// Use persistent state comparison
const hasSignificantChange = await this.notificationStateService.hasSignificantChangeAndNotify(rateData);
```

### Discord & Webhook Services

Both services receive the comparison with the last notified state, showing trend indicators and percentage changes:

- **Discord notifications** include trend emojis (↗️/↘️) and percentage changes
- **Webhook notifications** carry detailed change information
- **Rate threshold** prevents spam from minor fluctuations

## Configuration

### Dependencies

The service relies on:
- MongoDB connection (for persistence)
- Redis connection (for performance cache)
- Proper dependency injection via Inversify

### Error Handling

- **Redis failures**: Falls back to MongoDB-only operation
- **MongoDB failures**: Logs errors, may temporarily disable notification state
- **Connection timeouts**: Handled gracefully with appropriate logging