# RabbitMQ Event Relayer Architecture

This document explains why the event sourcing system works without RabbitMQ running, and the role RabbitMQ plays in the overall architecture.

## Overview

The system uses a **Polling Publisher** pattern where:
- **PostgreSQL** is the primary event store (source of truth)
- **RabbitMQ** is an optional async message broker for external consumers

## Data Flow

```
Write Request (createRoom, createReservation, etc.)
                    │
                    ▼
    ┌─────────────────────────────────────┐
    │     PostgreSQL Transaction          │
    │  ┌───────────────────────────────┐  │
    │  │ 1. Append event to `events`   │  │
    │  │ 2. Update read model          │  │
    │  │    (rooms/reservations)       │  │
    │  │ 3. Commit                     │  │
    │  └───────────────────────────────┘  │
    └─────────────────────────────────────┘
                    │
                    ▼
            Response to Client

    ════════════════════════════════════════
         (Async, if EventRelayer running)
    ════════════════════════════════════════

    ┌─────────────────────────────────────┐
    │         Event Relayer               │
    │  ┌───────────────────────────────┐  │
    │  │ Poll `events` table           │  │
    │  │ Publish to RabbitMQ           │  │
    │  │ Update checkpoint             │  │
    │  └───────────────────────────────┘  │
    └─────────────────────────────────────┘
                    │
                    ▼
    ┌─────────────────────────────────────┐
    │   External Consumers (Optional)     │
    │   - Analytics service               │
    │   - Notification service            │
    │   - Search indexer                  │
    │   - Other microservices             │
    └─────────────────────────────────────┘
```

## Why Writes Work Without RabbitMQ

### Synchronous Path (Always Required)
1. **Event Store**: Events are written directly to PostgreSQL's `events` table
2. **Projections**: Read models (`rooms`, `reservations` tables) are updated in the **same transaction**
3. **Consistency**: Both event and read model are committed together or not at all

### Asynchronous Path (Optional)
1. **Event Relayer**: A separate polling process that reads new events from PostgreSQL
2. **RabbitMQ Publishing**: Events are published to RabbitMQ for external consumers
3. **Checkpoint Tracking**: Progress is tracked in `event_checkpoints` table

## Key Components

### Event Store (`packages/backend/src/event-sourcing/event-store.ts`)
- Appends events to PostgreSQL
- Provides event loading for aggregate rehydration
- Source of truth for all domain events

### Projections (`packages/backend/src/event-sourcing/projections.ts`)
- Transform events into read models
- Run synchronously within the write transaction
- Update `rooms` and `reservations` tables

### Event Relayer (`packages/backend/src/event-sourcing/event-relayer.ts`)
- Polls PostgreSQL for unprocessed events
- Publishes events to RabbitMQ exchange
- Tracks last processed event ID in `event_checkpoints`

## Starting the Event Relayer

The Event Relayer is **not started automatically**. To enable RabbitMQ publishing:

```graphql
# Start the relayer
mutation {
  startEventRelayer
}

# Stop the relayer
mutation {
  stopEventRelayer
}
```

Or configure it to auto-start in your deployment.

## Benefits of This Architecture

| Benefit | Description |
|---------|-------------|
| **Write Reliability** | Writes never fail due to RabbitMQ being down |
| **No Message Loss** | Events are persisted first, then relayed |
| **At-Least-Once Delivery** | If relayer crashes, it resumes from checkpoint |
| **Decoupled Consumers** | External services subscribe independently |
| **Replay Capability** | Can replay all events from PostgreSQL if needed |

## When You Need RabbitMQ

RabbitMQ is needed when you have:
- External microservices that need to react to events
- Analytics pipelines consuming domain events
- Notification services (email, SMS, push)
- Search index updates (Elasticsearch, etc.)
- Cross-service event-driven communication

## When You Don't Need RabbitMQ

For the current Hotel CMS setup with:
- Single backend service
- Frontend consuming via GraphQL
- Read models in the same database

PostgreSQL alone is sufficient. The projections update synchronously, and the frontend reads from the same database.

## Database Tables

### `events` - Event Store
```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  stream_id UUID NOT NULL,
  version INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT events_stream_version_unique UNIQUE (stream_id, version)
);
```

### `event_checkpoints` - Relayer Progress
```sql
CREATE TABLE event_checkpoints (
  id VARCHAR(50) PRIMARY KEY,
  last_processed_event_id BIGINT NOT NULL
);
```

## Configuration

Environment variables for RabbitMQ (in `packages/backend/src/event-sourcing/config.ts`):

| Variable | Default | Description |
|----------|---------|-------------|
| `RABBITMQ_URL` | `amqp://localhost` | RabbitMQ connection URL |
| `RABBITMQ_EXCHANGE` | `hotel.events` | Exchange name for publishing |
| `EVENT_RELAYER_POLLING_INTERVAL_MS` | `1000` | Polling interval in milliseconds |
| `EVENT_RELAYER_BATCH_SIZE` | `100` | Events per batch |

## Related Documentation

- [Event Sourcing Architecture](./event-sourcing-architecture.md)
- [Event Sourcing Implementation](./event-sourcing-implementation.md)
- [Local Development Setup](./local-dev-setup.md)
