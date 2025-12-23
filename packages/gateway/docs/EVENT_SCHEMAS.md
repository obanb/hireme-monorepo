# Gateway - Event Schemas & Structures

## Domain Events

### ReservationCreated
```typescript
{
  type: 'ReservationCreated',
  aggregateId: string,
  version: number,
  occurredAt: Date,
  hotelId: string,
  guestName: string,
  checkIn: Date,
  checkOut: Date
}
```

### ReservationConfirmed
```typescript
{
  type: 'ReservationConfirmed',
  aggregateId: string,
  version: number,
  occurredAt: Date
}
```

### ReservationCancelled
```typescript
{
  type: 'ReservationCancelled',
  aggregateId: string,
  version: number,
  occurredAt: Date,
  reason?: string
}
```

## Commands

### CreateReservationCommand
```typescript
{
  reservationId: string,
  hotelId: string,
  guestName: string,
  checkIn: Date,
  checkOut: Date
}
```

## Aggregate Structure

### Reservation Aggregate
- State: `id`, `hotelId`, `guestName`, `checkIn`, `checkOut`, `status`, `version`
- Commands: `create()`, `confirm()`, `cancel()`
- Events: `ReservationCreated`, `ReservationConfirmed`, `ReservationCancelled`

## Event Store Schema

### Events Table
```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  stream_id VARCHAR(255) NOT NULL,
  version INT NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB,
  occurred_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(stream_id, version)
);
```

## Read Model Schema

### reservation_read_model Table
```sql
CREATE TABLE reservation_read_model (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

## Event Bus Topics

### RabbitMQ Exchange
- Exchange: `domain-events` (topic)
- Routing Keys:
  - `event.ReservationCreated`
  - `event.ReservationConfirmed`
  - `event.ReservationCancelled`

