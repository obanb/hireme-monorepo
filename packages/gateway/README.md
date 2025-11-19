# Gateway - Event Sourcing Example

Example implementation of Event Sourcing with PostgreSQL and RabbitMQ.

## Architecture

This package demonstrates:
- **Domain Layer**: Aggregate root with event sourcing
- **Event Store**: PostgreSQL-based event storage
- **Event Bus**: RabbitMQ for event distribution
- **Projections**: Read model updates from events
- **CQRS**: Command and Query separation

## Structure

```
src/
├── domain/                    # Domain layer (business logic)
│   ├── reservation/          # Reservation aggregate
│   │   ├── Reservation.ts    # Aggregate root
│   │   ├── events/           # Domain events
│   │   └── commands/        # Commands
│   └── shared/              # Shared domain concepts
│
├── application/              # Application layer
│   └── commands/            # Command handlers
│
├── infrastructure/           # Infrastructure layer
│   ├── event-store/         # PostgreSQL event store
│   ├── messaging/           # RabbitMQ event bus
│   ├── repositories/        # Repository implementations
│   └── projections/         # Read model projections
│
└── index.ts                  # Example usage
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup PostgreSQL

Create a database:

```sql
CREATE DATABASE eventstore;
```

Or use Docker:

```bash
docker run -d \
  --name postgres-eventstore \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=eventstore \
  -p 5432:5432 \
  postgres:15
```

### 3. Setup RabbitMQ

Using Docker:

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

Access management UI at: http://localhost:15672 (guest/guest)

### 4. Configure Environment

Copy `.env.example` to `.env` and update if needed:

```bash
cp .env.example .env
```

### 5. Run

```bash
npm run dev
```

## How It Works

### 1. Command Flow

```
Command → Handler → Aggregate → Event → Event Store → Event Bus → Projection
```

### 2. Event Sourcing

- Events are stored in PostgreSQL `events` table
- Aggregate state is rebuilt by replaying events
- Optimistic concurrency control using version numbers

### 3. Event Bus

- Events are published to RabbitMQ
- Subscribers (projections) consume events
- Read models are updated asynchronously

### 4. CQRS

- **Write**: Commands → Events → Event Store
- **Read**: Query read models (projections)

## Example Usage

The `index.ts` file demonstrates:
1. Creating a reservation
2. Confirming a reservation
3. Loading from event store
4. Querying read model
5. Cancelling a reservation

## Key Concepts Demonstrated

- ✅ Aggregate Root pattern
- ✅ Event Sourcing
- ✅ CQRS (Command Query Responsibility Segregation)
- ✅ Event Bus / Message Queue
- ✅ Projections / Read Models
- ✅ Optimistic Concurrency Control
- ✅ Domain Events

## Database Schema

### Events Table
Stores all domain events with versioning for optimistic concurrency.

### Read Model Table
Materialized view of reservation state for fast queries.

## Next Steps

- Add more aggregates (Hotel, Guest, etc.)
- Implement snapshots for performance
- Add event replay functionality
- Implement saga pattern for distributed transactions
- Add GraphQL API layer

