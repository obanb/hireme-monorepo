# Webhooks Architecture

This document describes the webhook delivery system (`packages/webhooks`) that notifies external subscribers when reservation events occur.

---

## Overview

```
Event Sourcing (PostgreSQL)
        │ (event relayer)
        ▼
RabbitMQ (domain_events exchange)
        │ (routing key: event.reservation.*)
        ▼
webhook-delivery queue (durable)
        │
        ▼
packages/webhooks (Express, port 4002)
        │ (HTTP POST + HMAC signature)
        ▼
External subscribers (registered URLs)
```

The service consumes reservation domain events from RabbitMQ and fans out signed HTTP POST requests to all matching registered webhook endpoints.

---

## Supported Events

| Event Type | Routing Key | Trigger |
|---|---|---|
| `reservation.created` | `event.reservation.created` | New reservation created |
| `reservation.confirmed` | `event.reservation.confirmed` | Reservation confirmed |
| `reservation.cancelled` | `event.reservation.cancelled` | Reservation cancelled |
| `reservation.room_assigned` | `event.reservation.room_assigned` | Room assigned to reservation |

---

## Webhook Registration API

Base URL: `http://localhost:4002/api`

OpenAPI docs served at: `GET /api/docs`

All endpoints require **admin JWT** (same token issued by `packages/backend` auth).

### Endpoints

#### `POST /api/webhooks` — Register a webhook

```json
{
  "url": "https://example.com/hooks/reservations",
  "eventFilters": ["reservation.created", "reservation.cancelled"],
  "description": "Notify channel manager on new/cancelled reservations"
}
```

Response `201`:

```json
{
  "id": "wh_abc123",
  "url": "https://example.com/hooks/reservations",
  "secret": "whsec_generated_random_secret",
  "eventFilters": ["reservation.created", "reservation.cancelled"],
  "description": "Notify channel manager on new/cancelled reservations",
  "isActive": true,
  "createdAt": "2026-02-23T10:00:00Z"
}
```

> The `secret` is shown **only once** at creation time. Store it securely.

#### `GET /api/webhooks` — List all webhooks

Returns array of registered webhooks (secret is redacted).

#### `GET /api/webhooks/:id` — Get webhook details

Includes delivery statistics (total sent, success rate, last delivery status).

#### `PATCH /api/webhooks/:id` — Update a webhook

Updatable fields: `url`, `eventFilters`, `description`, `isActive`.

#### `DELETE /api/webhooks/:id` — Unregister a webhook

Soft-deletes the webhook and stops all future deliveries.

#### `POST /api/webhooks/:id/test` — Send test payload

Sends a synthetic `reservation.created` event to the webhook URL for integration testing.

---

## Security

### API Authentication

All registration endpoints require a valid JWT in the `Authorization: Bearer <token>` header or the `access_token` cookie (same tokens issued by `packages/backend` auth). Only users with the `ADMIN` role can manage webhooks.

The webhook service verifies tokens using the same `JWT_SECRET` environment variable as the backend.

### Delivery Signing (HMAC-SHA256)

Every outgoing webhook POST is signed so subscribers can verify authenticity.

**Headers sent with every delivery:**

| Header | Description |
|---|---|
| `X-Webhook-Id` | The webhook registration ID |
| `X-Webhook-Timestamp` | Unix timestamp (seconds) of delivery |
| `X-Webhook-Signature` | `sha256=<HMAC-SHA256(secret, timestamp.body)>` |
| `Content-Type` | `application/json` |

**Subscriber verification (pseudocode):**

```python
import hmac, hashlib

def verify(secret, timestamp, body, signature):
    expected = hmac.new(
        secret.encode(),
        f"{timestamp}.{body}".encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

**Replay protection:** Subscribers should reject deliveries where `X-Webhook-Timestamp` is older than 5 minutes.

---

## Event Payload

```json
{
  "id": "del_uuid",
  "type": "reservation.created",
  "timestamp": "2026-02-23T12:00:00Z",
  "data": {
    "reservationId": "res-uuid",
    "status": "PENDING",
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "checkInDate": "2026-03-01",
    "checkOutDate": "2026-03-05",
    "roomId": null,
    "totalAmount": 500,
    "currency": "EUR"
  }
}
```

The `data` field contains the reservation read model snapshot at the time of the event. Fields vary depending on the event type (e.g. `roomId` is populated for `reservation.room_assigned`).

---

## Delivery Engine

### Retry Strategy

| Attempt | Delay | Total elapsed |
|---|---|---|
| 1 | Immediate | 0s |
| 2 | 30 seconds | 30s |
| 3 | 5 minutes | 5m 30s |

A delivery is considered **successful** if the subscriber responds with HTTP `2xx` within 10 seconds.

Any non-2xx response or timeout triggers a retry according to the schedule above.

### Circuit Breaker

After **10 consecutive failed deliveries** (across any events), the webhook is automatically **disabled** (`isActive = false`). The `GET /api/webhooks/:id` endpoint will show `disabledReason: "circuit_breaker"`.

Re-enable manually via `PATCH /api/webhooks/:id { "isActive": true }`.

### Retry Worker

A background worker polls the `webhook_deliveries` table every 15 seconds for deliveries with `status = 'pending_retry'` and `next_retry_at <= NOW()`, then re-attempts delivery.

---

## Database Schema

Uses the same PostgreSQL instance as the backend. Tables are created on service startup.

### `webhooks`

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` PK | Webhook ID |
| `url` | `TEXT NOT NULL` | Delivery URL (HTTPS enforced in production) |
| `secret` | `TEXT NOT NULL` | HMAC signing secret |
| `event_filters` | `TEXT[] NOT NULL` | Array of event types to subscribe to |
| `description` | `TEXT` | Optional human-readable description |
| `is_active` | `BOOLEAN DEFAULT true` | Whether deliveries are enabled |
| `disabled_reason` | `TEXT` | Reason if auto-disabled (e.g. `circuit_breaker`) |
| `consecutive_failures` | `INTEGER DEFAULT 0` | Counter for circuit breaker |
| `created_by` | `UUID` | User ID of the admin who registered it |
| `created_at` | `TIMESTAMPTZ` | Registration time |
| `updated_at` | `TIMESTAMPTZ` | Last update time |

### `webhook_deliveries`

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` PK | Delivery ID |
| `webhook_id` | `UUID FK → webhooks.id` | Target webhook |
| `event_id` | `UUID` | Source event ID from event store |
| `event_type` | `TEXT NOT NULL` | e.g. `reservation.created` |
| `payload` | `JSONB NOT NULL` | Full payload sent |
| `status` | `TEXT NOT NULL` | `pending`, `success`, `failed`, `pending_retry` |
| `attempts` | `INTEGER DEFAULT 0` | Number of delivery attempts |
| `response_code` | `INTEGER` | Last HTTP response status |
| `response_body` | `TEXT` | Last response body (truncated to 1KB) |
| `next_retry_at` | `TIMESTAMPTZ` | When to retry next (null if done) |
| `created_at` | `TIMESTAMPTZ` | When delivery was queued |
| `completed_at` | `TIMESTAMPTZ` | When delivery succeeded or finally failed |

**Indexes:**
- `webhook_deliveries(webhook_id, created_at DESC)` — delivery history per webhook
- `webhook_deliveries(status, next_retry_at)` — retry worker polling

---

## RabbitMQ Integration

The service creates a **durable queue** named `webhook-delivery` bound to the existing `domain_events` exchange with routing key pattern `event.reservation.#`.

This means:
- The queue survives RabbitMQ restarts
- Messages are persisted until acknowledged
- Does not interfere with other consumers (each consumer gets its own queue)
- Only reservation events are routed to this queue

### Consumer Flow

```
1. Consume message from webhook-delivery queue
2. Parse event (type, reservation data)
3. Query webhooks table for active webhooks matching event type
4. For each matching webhook:
   a. Build payload
   b. Insert row into webhook_deliveries (status: pending)
   c. Attempt immediate delivery (sender.ts)
   d. On success: update status to 'success', ack
   e. On failure: update status to 'pending_retry', set next_retry_at
5. Acknowledge the RabbitMQ message (after all deliveries are queued)
```

---

## Package Structure

```
packages/webhooks/
├── package.json
├── tsconfig.json
├── openapi.yaml                  ← OpenAPI 3.0 spec (source of truth)
├── src/
│   ├── index.ts                  ← entry point
│   ├── server.ts                 ← Express app, Swagger UI at /api/docs
│   ├── config.ts                 ← env vars (PG, RabbitMQ, JWT_SECRET)
│   ├── database.ts               ← pool + table initialization
│   ├── auth/
│   │   └── middleware.ts         ← JWT verification, requireAdmin guard
│   ├── routes/
│   │   └── webhook.routes.ts     ← CRUD + test endpoint
│   ├── consumer/
│   │   └── event-consumer.ts     ← RabbitMQ consumer (webhook-delivery queue)
│   ├── delivery/
│   │   ├── sender.ts             ← HMAC signing, HTTP POST, timeout handling
│   │   └── retry-worker.ts       ← polls failed deliveries for retry
│   └── repositories/
│       ├── webhook.repo.ts       ← webhooks table CRUD
│       └── delivery.repo.ts      ← webhook_deliveries table operations
```

---

## Environment Variables

Add to `packages/webhooks/.env`:

```bash
# Server
PORT=4002

# PostgreSQL (same instance as backend)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=domain_events
RABBITMQ_QUEUE=webhook-delivery

# Auth (must match packages/backend)
JWT_SECRET=your-jwt-secret

# Delivery
DELIVERY_TIMEOUT_MS=10000
MAX_RETRY_ATTEMPTS=3
CIRCUIT_BREAKER_THRESHOLD=10
```

---

## Running Locally

Prerequisites: PostgreSQL and RabbitMQ running (see [local-dev-setup.md](./local-dev-setup.md)).

```bash
# Install dependencies (from monorepo root)
npm install

# Build
cd packages/webhooks && npm run build

# Run
npm start

# Dev mode
npm run dev
```

Service starts at `http://localhost:4002`. OpenAPI docs at `http://localhost:4002/api/docs`.
