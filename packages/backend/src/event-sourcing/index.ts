/**
 * Event Sourcing Module
 *
 * This module provides a complete event sourcing implementation for the hotel CMS platform.
 *
 * Features:
 * - PostgreSQL (Supabase) as the event store
 * - RabbitMQ for async event distribution
 * - Optimistic concurrency control
 * - Synchronous projections for read models
 * - Polling publisher pattern for event relaying
 */

// Configuration
export { config } from './config';

// Database
export {
  getPool,
  initializeDatabase,
  withTransaction,
  closePool,
} from './database';

// Event Store
export {
  loadEvents,
  appendEvents,
  getUnprocessedEvents,
  getCheckpoint,
  updateCheckpoint,
  type StoredEvent,
  type DomainEvent,
} from './event-store';

// Projections
export {
  applyReservationProjection,
  getReservation,
} from './projections';

// Aggregate
export {
  ReservationAggregate,
  type ReservationState,
  type ReservationStatus,
  type BookingDetails,
} from './aggregate';

// Repository
export {
  ReservationRepository,
  reservationRepository,
} from './repository';

// Event Relayer
export {
  EventRelayer,
  eventRelayer,
  createExampleConsumer,
} from './event-relayer';
