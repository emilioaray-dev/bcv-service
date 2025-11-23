# Webhook Integration Guide

This guide explains how to configure and use HTTP webhooks to receive real-time notifications for BCV exchange rate changes, service status updates, and deployment events.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Webhook Payload](#webhook-payload)
- [Security](#security)
- [Events](#events)
- [Retry Logic](#retry-logic)
- [Example Implementation](#example-implementation)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

The BCV service can send HTTP POST requests to a configured webhook URL for various events:
- Exchange rate changes (using persistent notification state to prevent duplicates)
- Service health status changes
- Deployment events (start, success, failure)

This allows your application to receive real-time updates without polling the API.

### Persistent Notification State

The service now implements a persistent notification state system that:
- Stores the last notified rates in MongoDB for persistence across restarts
- Uses Redis as a cache layer for faster read/write operations
- Prevents duplicate notifications when the service is restarted
- Uses absolute difference (≥0.01) instead of percentage change for determining significant changes
- Tracks changes in all currencies (USD, EUR, CNY, TRY, RUB, etc.)

### Features

- **HMAC-SHA256 Signature**: Verify webhook authenticity
- **Exponential Backoff Retry**: Automatic retry with exponential backoff (up to 3 attempts)
- **Prometheus Metrics**: Track webhook delivery success/failure rates
- **Configurable Timeout**: Set custom timeout for webhook requests
- **Rate Change Detection**: Only triggered when rates change significantly (>0.1%)

## Configuration

### Environment Variables

Configure the webhook service using the following environment variables:

```bash
# Required: Webhook endpoint URL
WEBHOOK_URL=https://your-app.com/api/webhook/bcv-rates

# Required (recommended): Secret key for HMAC signature
WEBHOOK_SECRET=your-super-secret-key-here

# Optional: Timeout in milliseconds (default: 5000)
WEBHOOK_TIMEOUT=5000

# Optional: Maximum retry attempts (default: 3)
WEBHOOK_MAX_RETRIES=3
```

### Using Docker Secrets (Recommended for Production)

For enhanced security in production environments:

```bash
# Create Docker secrets
echo "https://your-app.com/api/webhook/bcv-rates" | docker secret create webhook_url -
echo "your-super-secret-key" | docker secret create webhook_secret -

# Use in environment configuration
WEBHOOK_URL_FILE=/run/secrets/webhook_url
WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret
```

## Webhook Payload

### Payload Structure

When a rate change is detected, the service sends a JSON payload with the following structure:

```json
{
  "event": "rate.changed",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "data": {
    "date": "2025-11-17",
    "rates": [
      {
        "currency": "USD",
        "rate": 36.50,
        "name": "Dólar de los Estados Unidos de América"
      },
      {
        "currency": "EUR",
        "rate": 39.20,
        "name": "Euro"
      },
      {
        "currency": "CNY",
        "rate": 5.05,
        "name": "Yuan"
      },
      {
        "currency": "TRY",
        "rate": 1.08,
        "name": "Lira Turca"
      },
      {
        "currency": "RUB",
        "rate": 0.36,
        "name": "Rublo Ruso"
      }
    ],
    "change": {
      "previousRate": 36.40,
      "currentRate": 36.50,
      "percentageChange": 0.2747
    }
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | Event type: `rate.updated` or `rate.changed` |
| `timestamp` | string | ISO 8601 timestamp when the webhook was sent |
| `data.date` | string | Date of the exchange rate (YYYY-MM-DD) |
| `data.rates` | array | Array of currency rates |
| `data.rates[].currency` | string | Currency code (USD, EUR, etc.) |
| `data.rates[].rate` | number | Exchange rate in VES |
| `data.rates[].name` | string | Full currency name |
| `data.change` | object | Change information (only when `event` is `rate.changed`) |
| `data.change.previousRate` | number | Previous USD rate |
| `data.change.currentRate` | number | Current USD rate |
| `data.change.percentageChange` | number | Percentage change (e.g., 0.2747 = 0.2747%) |

## Security

### HMAC Signature Verification

All webhook requests include an `X-Webhook-Signature` header containing an HMAC-SHA256 signature:

```
X-Webhook-Signature: sha256=a3f5b1c2d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

### Verifying the Signature

#### Node.js Example

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler
app.post('/api/webhook/bcv-rates', express.json(), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process the webhook...
  res.status(200).json({ received: true });
});
```

#### Python Example

```python
import hmac
import hashlib

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    expected_signature = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)

# In your webhook handler (Flask example)
@app.route('/api/webhook/bcv-rates', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)

    if not verify_webhook_signature(payload, signature, os.getenv('WEBHOOK_SECRET')):
        return {'error': 'Invalid signature'}, 401

    # Process the webhook...
    return {'received': True}, 200
```

### Request Headers

The webhook request includes the following headers:

| Header | Description | Example |
|--------|-------------|---------|
| `Content-Type` | Always `application/json` | `application/json` |
| `User-Agent` | Service identifier | `BCV-Service-Webhook/1.0` |
| `X-Webhook-Signature` | HMAC-SHA256 signature | `sha256=a3f5b1c2...` |
| `X-Webhook-Event` | Event type | `rate.changed` |
| `X-Webhook-Timestamp` | Event timestamp | `2025-11-17T10:30:00.000Z` |
| `X-Webhook-Attempt` | Attempt number (1-3) | `1` |

## Events

### Event Types

#### Rate Change Events

##### `rate.updated`

Sent when rates are fetched for the first time or after a restart.

```json
{
  "event": "rate.updated",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "data": {
    "date": "2025-11-17",
    "rates": [...]
    // No "change" field
  }
}
```

##### `rate.changed`

Sent when rates change by absolute difference >= 0.01 compared to the previous rate (in any currency).

```json
{
  "event": "rate.changed",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "data": {
    "date": "2025-11-17",
    "rates": [...],
    "change": {
      "previousRate": 36.40,
      "currentRate": 36.50,
      "percentageChange": 0.2747
    }
  }
}
```

#### Service Status Events

##### `service.healthy`

Sent when the service changes to a healthy status.

```json
{
  "event": "service.healthy",
  "timestamp": "2025-11-23T18:00:00.000Z",
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "checks": {
      "mongodb": {
        "status": "healthy",
        "message": "MongoDB connection is healthy"
      },
      "redis": {
        "status": "healthy",
        "message": "Redis is operational",
        "details": {
          "enabled": true,
          "connected": true
        }
      }
    },
    "previousStatus": "unhealthy"
  }
}
```

##### `service.unhealthy`

Sent when the service changes to an unhealthy status.

```json
{
  "event": "service.unhealthy",
  "timestamp": "2025-11-23T18:05:00.000Z",
  "data": {
    "status": "unhealthy",
    "uptime": 3900,
    "checks": {
      "mongodb": {
        "status": "unhealthy",
        "message": "MongoDB connection failed"
      }
    },
    "previousStatus": "healthy"
  }
}
```

##### `service.degraded`

Sent when the service changes to a degraded status.

```json
{
  "event": "service.degraded",
  "timestamp": "2025-11-23T18:10:00.000Z",
  "data": {
    "status": "degraded",
    "uptime": 4200,
    "checks": {
      "mongodb": {
        "status": "healthy",
        "message": "MongoDB connection is healthy"
      },
      "websocket": {
        "status": "unhealthy",
        "message": "WebSocket service check failed"
      }
    },
    "previousStatus": "healthy"
  }
}
```

#### Deployment Events

##### `deployment.success`

Sent when the service starts successfully.

```json
{
  "event": "deployment.success",
  "timestamp": "2025-11-23T17:30:00.000Z",
  "data": {
    "deploymentId": "start-1700723400000",
    "environment": "production",
    "version": "2.0.1",
    "message": "Servidor BCV iniciado en el puerto 3000"
  }
}
```

##### `deployment.failure`

Sent when the service stops (during graceful shutdown).

```json
{
  "event": "deployment.failure",
  "timestamp": "2025-11-23T19:00:00.000Z",
  "data": {
    "deploymentId": "shutdown-1700727600000",
    "environment": "production",
    "version": "2.0.1",
    "message": "Aplicación BCV Service cerrándose gracefulmente"
  }
}
```

## Retry Logic

### Exponential Backoff

If a webhook delivery fails, the service automatically retries with exponential backoff:

| Attempt | Delay Before Retry |
|---------|-------------------|
| 1 | Immediate |
| 2 | 1 second |
| 3 | 2 seconds |

### Failure Conditions

Webhooks are considered failed when:

- HTTP response status code is not 2xx
- Request times out (default: 5 seconds)
- Network error occurs

### Success Criteria

A webhook is considered successful when:

- HTTP response status code is 2xx (200-299)
- Response received before timeout

## Example Implementation

### Express.js Webhook Handler

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

// Middleware to verify webhook signature
function verifyWebhook(req, res, next) {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  // Store raw body for signature verification
  const rawBody = JSON.stringify(req.body);

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody, 'utf8');
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// Webhook endpoint
app.post('/api/webhook/bcv-rates', express.json(), verifyWebhook, (req, res) => {
  const { event, timestamp, data } = req.body;

  console.log(`Received ${event} at ${timestamp}`);

  // Process rate change
  if (event === 'rate.changed') {
    const { change, rates } = data;
    console.log(`Rate changed from ${change.previousRate} to ${change.currentRate}`);
    console.log(`Percentage change: ${change.percentageChange}%`);

    // Update database, send notifications, etc.
    updateRatesInDatabase(rates);
    notifyUsers(change);
  }

  // Always respond with 200 to prevent retries
  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

### Best Practices

1. **Respond Quickly**: Return a 200 response as soon as possible (within timeout)
2. **Process Asynchronously**: Handle heavy processing in background jobs
3. **Idempotency**: Use `timestamp` or `data.date` to prevent duplicate processing
4. **Validate Signature**: Always verify the HMAC signature
5. **Log Requests**: Log all webhook requests for debugging and audit purposes
6. **Handle Retries**: Be prepared to receive the same webhook multiple times

## Monitoring

### Prometheus Metrics

The webhook service exposes the following Prometheus metrics:

#### `bcv_webhook_delivery_total`

Counter of webhook delivery attempts.

**Labels:**
- `status`: `success` or `failure`
- `event`: `rate.updated` or `rate.changed`

**Example Query:**
```promql
# Total successful webhook deliveries
bcv_webhook_delivery_total{status="success"}

# Webhook failure rate
rate(bcv_webhook_delivery_total{status="failure"}[5m])
```

#### `bcv_webhook_delivery_duration_seconds`

Histogram of webhook delivery duration.

**Labels:**
- `status`: `success` or `failure`
- `event`: `rate.updated` or `rate.changed`

**Example Query:**
```promql
# p95 webhook delivery latency
histogram_quantile(0.95, rate(bcv_webhook_delivery_duration_seconds_bucket[5m]))

# Average delivery duration
rate(bcv_webhook_delivery_duration_seconds_sum[5m]) / rate(bcv_webhook_delivery_duration_seconds_count[5m])
```

### Grafana Dashboard Example

```promql
# Webhook success rate (%)
(rate(bcv_webhook_delivery_total{status="success"}[5m]) / rate(bcv_webhook_delivery_total[5m])) * 100

# Webhook deliveries per minute
rate(bcv_webhook_delivery_total[1m]) * 60
```

## Troubleshooting

### Common Issues

#### Webhook Not Receiving Requests

1. **Check Configuration**:
   ```bash
   # Verify webhook URL is configured
   echo $WEBHOOK_URL
   ```

2. **Check Logs**:
   ```bash
   # Look for webhook-related logs
   docker logs bcv-service | grep -i webhook
   ```

3. **Check Rate Changes**:
   Webhooks are only sent when rates change significantly (>0.1%)

#### Signature Verification Failing

1. **Ensure Secret Matches**:
   - The secret used to verify must match `WEBHOOK_SECRET`
   - Check for extra whitespace or encoding issues

2. **Verify Payload**:
   - Use the exact raw JSON body (before parsing)
   - Don't modify or re-serialize the payload

#### High Failure Rate

1. **Check Timeout**:
   ```bash
   # Increase timeout if needed
   WEBHOOK_TIMEOUT=10000  # 10 seconds
   ```

2. **Check Endpoint Performance**:
   - Ensure your endpoint responds quickly
   - Process heavy work asynchronously

3. **Check Network Connectivity**:
   - Verify firewall rules
   - Check DNS resolution

### Testing Webhooks Locally

#### Using ngrok

```bash
# Start ngrok tunnel
ngrok http 3000

# Configure webhook URL
export WEBHOOK_URL=https://your-subdomain.ngrok.io/api/webhook/bcv-rates

# Start BCV service
pnpm dev
```

#### Manual Testing with curl

```bash
# Generate HMAC signature
SECRET="your-secret-key"
PAYLOAD='{"event":"rate.changed","timestamp":"2025-11-17T10:30:00.000Z","data":{"date":"2025-11-17","rates":[{"currency":"USD","rate":36.5,"name":"Dólar"}]}}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Send test webhook
curl -X POST http://localhost:3000/api/webhook/bcv-rates \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -H "X-Webhook-Event: rate.changed" \
  -d "$PAYLOAD"
```

## Related Documentation

- [Observability Guide](./OBSERVABILITY.md) - Prometheus metrics and monitoring
- [Setup Local](./SETUP_LOCAL.md) - Local development setup
- [Secrets Management](./SECRETS_MANAGEMENT.md) - Secure configuration
- [Discord Testing](./DISCORD_TESTING.md) - Testing Discord notifications

---

**Need Help?**

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review service logs: `docker logs bcv-service`
3. Check Prometheus metrics at `/metrics`
4. Open an issue on [GitHub](https://github.com/emilioaray-dev/bcv-service/issues)
