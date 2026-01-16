# Event Sourcing Implementation Guide

This document describes the implementation of Event Sourcing in the backend package using PostgreSQL (Supabase) and RabbitMQ.

## Overview

The implementation follows the architecture described in `event-sourcing-architecture.md` and provides:

- **Event Store**: PostgreSQL-based storage for domain events
- **Read Models**: Optimized projections for querying
- **Event Relayer**: Polling publisher that sends events to RabbitMQ
- **Aggregates**: Domain logic encapsulation with event-driven state changes

## Prerequisites

### 1. PostgreSQL (Supabase)

You need a PostgreSQL database. For Supabase:

1. Create a project at [supabase.com](https://supabase.com)
2. Get your connection string from Settings > Database > Connection string

### 2. RabbitMQ

Install and run RabbitMQ locally or use a cloud service:

```bash
# Using Docker
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management
```

Access the management UI at http://localhost:15672 (guest/guest)

## Configuration

Set the following environment variables or use defaults:

```bash
# PostgreSQL (Supabase)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
# Or individual settings:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_SSL=false  # Set to 'true' for Supabase

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=domain_events
RABBITMQ_PUBLISHER_ID=reservation-service-rabbitmq-publisher

# Event Relayer
EVENT_RELAYER_POLLING_INTERVAL=1000
EVENT_RELAYER_BATCH_SIZE=100
```

## Files Structure

```
packages/backend/src/event-sourcing/
├── config.ts           # Configuration management
├── database.ts         # PostgreSQL connection pool & schema initialization
├── event-store.ts      # Event persistence and retrieval
├── projections.ts      # Read model updates
├── aggregate.ts        # Reservation aggregate with business logic
├── repository.ts       # Coordinates event store & projections
├── event-relayer.ts    # RabbitMQ polling publisher
└── index.ts            # Module exports
```

## Database Schema

The implementation creates three tables:

### Events Table (Event Store)

```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  stream_id UUID NOT NULL,          -- Aggregate ID
  version INT NOT NULL,             -- Sequential version per stream
  type VARCHAR(100) NOT NULL,       -- Event type name
  data JSONB NOT NULL,              -- Event payload
  metadata JSONB,                   -- Audit info, correlation IDs
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT events_stream_version_unique UNIQUE (stream_id, version)
);
```

### Reservations Read Model

```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  origin_id VARCHAR(100),
  guest_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  check_in_date DATE,
  check_out_date DATE,
  total_amount DECIMAL(10,2),
  currency VARCHAR(3),
  version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Event Checkpoints

```sql
CREATE TABLE event_checkpoints (
  id VARCHAR(50) PRIMARY KEY,
  last_processed_event_id BIGINT NOT NULL
);
```

## GraphQL API

### Mutations

#### Initialize Database

Initialize the event sourcing database schema:

```graphql
mutation {
  initializeEventSourcingDatabase
}
```

#### Create Reservation

```graphql
mutation {
  createReservation(input: {
    originId: "BOOKING-123"
    guestFirstName: "John"
    guestLastName: "Doe"
    checkInDate: "2024-03-15"
    checkOutDate: "2024-03-20"
    totalAmount: 599.99
    currency: "USD"
  }) {
    reservation {
      id
      guestName
      status
      checkInDate
      checkOutDate
      totalAmount
      version
    }
    events {
      id
      type
      version
      data
      occurredAt
    }
  }
}
```

#### Cancel Reservation

```graphql
mutation {
  cancelReservation(input: {
    reservationId: "your-reservation-uuid"
    reason: "Guest requested cancellation"
  }) {
    reservation {
      id
      status
      version
    }
    events {
      id
      type
      data
    }
  }
}
```

#### Start Event Relayer

Start publishing events to RabbitMQ:

```graphql
mutation {
  startEventRelayer
}
```

#### Stop Event Relayer

```graphql
mutation {
  stopEventRelayer
}
```

### Queries

#### Get Single Reservation

```graphql
query {
  reservation(id: "your-reservation-uuid") {
    id
    originId
    guestName
    status
    checkInDate
    checkOutDate
    totalAmount
    currency
    version
    createdAt
    updatedAt
  }
}
```

#### List Reservations

```graphql
query {
  reservations(status: CONFIRMED, limit: 10, offset: 0) {
    id
    guestName
    status
    checkInDate
  }
}
```

#### Get Event History

View the complete event history for a reservation:

```graphql
query {
  reservationEventHistory(id: "your-reservation-uuid") {
    id
    streamId
    version
    type
    data
    metadata
    occurredAt
  }
}
```

## Testing the Implementation

### 1. Start the Backend

```bash
cd packages/backend
npm run dev
```

### 2. Initialize the Database

Open GraphQL Playground at http://localhost:4001/graphql and run:

```graphql
mutation {
  initializeEventSourcingDatabase
}
```

### 3. Create a Test Reservation

```graphql
mutation {
  createReservation(input: {
    originId: "TEST-001"
    guestFirstName: "Jane"
    guestLastName: "Smith"
    checkInDate: "2024-06-01"
    checkOutDate: "2024-06-05"
    totalAmount: 450.00
    currency: "EUR"
  }) {
    reservation {
      id
      guestName
      status
    }
    events {
      id
      type
      data
    }
  }
}
```

### 4. Query Reservations

```graphql
query {
  reservations {
    id
    guestName
    status
    totalAmount
    currency
  }
}
```

### 5. Cancel the Reservation

Use the ID from step 3:

```graphql
mutation {
  cancelReservation(input: {
    reservationId: "your-reservation-id"
    reason: "Testing cancellation flow"
  }) {
    reservation {
      id
      status
      version
    }
    events {
      type
      data
    }
  }
}
```

### 6. View Event History

```graphql
query {
  reservationEventHistory(id: "your-reservation-id") {
    version
    type
    data
    occurredAt
  }
}
```

### 7. Start Event Relayer (Optional)

If RabbitMQ is running:

```graphql
mutation {
  startEventRelayer
}
```

## Key Concepts

### Optimistic Concurrency

The `(stream_id, version)` unique constraint prevents concurrent writes from corrupting the event stream. If two processes try to write the same version, one will fail with a unique constraint violation.

### Synchronous Projections

Projections are applied within the same transaction as event writes, ensuring strong consistency between the event store and read models.

### Event Relayer

The polling publisher pattern ensures at-least-once delivery to RabbitMQ:

1. Poll for events with ID > last checkpoint
2. Publish each event to RabbitMQ
3. Update checkpoint after successful batch

External consumers must be idempotent to handle potential duplicate deliveries.

### Aggregate Pattern

The `ReservationAggregate` class:

1. Loads state by replaying historical events
2. Validates business rules before accepting commands
3. Produces new events as the result of commands
4. Never directly modifies state - only through events

## Extending the Implementation

### Adding New Events

1. Define the event schema in `shared-schema`:

```typescript
// packages/shared-schema/src/domain/reservation/events/confirmed.ts
export const ReservationConfirmedEventSchema = BaseEventSchema.extend({
  type: z.literal('ReservationConfirmed'),
  data: z.object({
    reservationId: z.string(),
    confirmedAt: z.string().datetime(),
  }),
});
```

2. Update the discriminated union in `events/index.ts`

3. Add the handler in `aggregate.ts`:

```typescript
case 'ReservationConfirmed':
  this.applyReservationConfirmed(event.data);
  break;
```

4. Add the projection in `projections.ts`:

```typescript
case 'ReservationConfirmed':
  await handleReservationConfirmed(client, streamId, event);
  break;
```

### Adding New Aggregates

1. Create a new aggregate class following the `ReservationAggregate` pattern
2. Create a corresponding repository
3. Add projections for the new aggregate's events
4. Add GraphQL schema and resolvers

## Troubleshooting

### Connection Errors

- Verify PostgreSQL/Supabase credentials
- Check if RabbitMQ is running
- Ensure SSL settings match your environment

### Unique Constraint Violations

This indicates a concurrency conflict. The client should:
1. Reload the aggregate
2. Re-validate business rules
3. Retry the operation

### Missing Tables

Run the `initializeEventSourcingDatabase` mutation to create the schema.

## Dependencies

The following packages are required (already installed):

```json
{
  "pg": "^8.x",
  "amqplib": "^0.10.x",
  "uuid": "^9.x",
  "zod": "^3.x"
}
```

Dev dependencies:
```json
{
  "@types/pg": "^8.x",
  "@types/amqplib": "^0.10.x",
  "@types/uuid": "^9.x"
}
```
