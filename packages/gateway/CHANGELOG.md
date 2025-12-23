# Gateway (Event Sourcing) Changelog

## [Unreleased]

### Added
- Complete Event Sourcing implementation with PostgreSQL and RabbitMQ
- Domain-driven design structure with aggregates, events, and commands
- CQRS pattern implementation
- PostgreSQL event store with optimistic concurrency control
- RabbitMQ event bus for async event distribution
- Read model projections for fast queries
- Example Reservation aggregate with full lifecycle

### Domain Layer
- `AggregateRoot` base class for event-sourced aggregates
- `DomainEvent` interface for all domain events
- `Reservation` aggregate with business logic
- Domain events: `ReservationCreated`, `ReservationConfirmed`, `ReservationCancelled`
- Commands: `CreateReservationCommand`, `ConfirmReservationCommand`, `CancelReservationCommand`

### Infrastructure Layer
- `PostgresEventStore` - PostgreSQL-based event storage
- `RabbitMQEventBus` - RabbitMQ event bus implementation
- `ReservationRepository` - Repository pattern for aggregates
- `ReservationProjection` - Read model projection handler

### Application Layer
- `CreateReservationHandler` - Command handler for creating reservations
- `ConfirmReservationHandler` - Command handler for confirming reservations
- `CancelReservationHandler` - Command handler for cancelling reservations

### Features
- Event sourcing with append-only event store
- Optimistic concurrency control using version numbers
- Event replay for state reconstruction
- Read model projections updated asynchronously
- Complete example demonstrating full event sourcing flow

### Database Schema
- `events` table - Stores all domain events
- `reservation_read_model` table - Materialized view for queries

### Dependencies
- `pg` - PostgreSQL client
- `amqplib` - RabbitMQ client
- `dotenv` - Environment configuration

