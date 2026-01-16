/**
 * Reservation Repository
 *
 * Handles loading and saving reservation aggregates.
 * Coordinates between the event store and projections.
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import { applyReservationProjection, getReservation } from './projections';
import { ReservationAggregate } from './aggregate';

export class ReservationRepository {
  /**
   * Load a reservation aggregate by its ID
   * Returns null if no events exist for the stream
   */
  async load(id: string): Promise<ReservationAggregate | null> {
    const events = await loadEvents(id);

    if (events.length === 0) {
      return null;
    }

    const aggregate = new ReservationAggregate(id);
    aggregate.loadFromHistory(events);

    return aggregate;
  }

  /**
   * Save new events for an aggregate
   * Runs projections in the same transaction for consistency
   */
  async save(aggregate: ReservationAggregate, newEvents: DomainEvent[]): Promise<StoredEvent[]> {
    if (newEvents.length === 0) {
      return [];
    }

    return withTransaction(async (client) => {
      // Append events to the event store
      const savedEvents = await appendEvents(
        client,
        aggregate.id,
        newEvents,
        aggregate.version
      );

      // Apply projections for each saved event
      for (const event of savedEvents) {
        await applyReservationProjection(client, aggregate.id, event);
      }

      return savedEvents;
    });
  }

  /**
   * Create a new reservation
   * Returns the created aggregate and saved events
   */
  async create(
    id: string,
    bookingDetails: {
      originId?: string;
      totalAmount?: number;
      currency?: string;
      arrivalTime?: string;
      departureTime?: string;
      customer?: {
        firstName?: string;
        lastName?: string;
      };
    }
  ): Promise<{ aggregate: ReservationAggregate; events: StoredEvent[] }> {
    // Check if aggregate already exists
    const existing = await this.load(id);
    if (existing) {
      throw new Error(`Reservation with ID ${id} already exists`);
    }

    // Create the aggregate and event
    const { aggregate, event } = ReservationAggregate.create(id, bookingDetails);

    // Save the event
    const savedEvents = await this.save(aggregate, [event]);

    // Update aggregate version
    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Confirm an existing reservation
   */
  async confirm(
    id: string,
    confirmedBy?: string
  ): Promise<{ aggregate: ReservationAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);

    if (!aggregate) {
      throw new Error(`Reservation with ID ${id} not found`);
    }

    // Execute the confirm command
    const event = aggregate.confirm(confirmedBy);

    // Save the event
    const savedEvents = await this.save(aggregate, [event]);

    // Update aggregate version
    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Cancel an existing reservation
   */
  async cancel(
    id: string,
    reason: string
  ): Promise<{ aggregate: ReservationAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);

    if (!aggregate) {
      throw new Error(`Reservation with ID ${id} not found`);
    }

    // Execute the cancel command
    const event = aggregate.cancel(reason);

    // Save the event
    const savedEvents = await this.save(aggregate, [event]);

    // Update aggregate version
    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Get a reservation from the read model (optimized for queries)
   */
  async getReadModel(id: string) {
    const client = await getPool().connect();
    try {
      return await getReservation(client, id);
    } finally {
      client.release();
    }
  }

  /**
   * List all reservations from the read model
   */
  async listReadModels(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const pool = getPool();
    const params: (string | number)[] = [];
    let query = 'SELECT * FROM reservations';
    const conditions: string[] = [];

    if (options?.status) {
      params.push(options.status);
      conditions.push(`status = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY created_at DESC';

    if (options?.limit) {
      params.push(options.limit);
      query += ` LIMIT $${params.length}`;
    }

    if (options?.offset) {
      params.push(options.offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      originId: row.origin_id,
      guestName: row.guest_name,
      status: row.status,
      checkInDate: row.check_in_date,
      checkOutDate: row.check_out_date,
      totalAmount: row.total_amount,
      currency: row.currency,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get all events for a stream (useful for debugging/auditing)
   */
  async getEventHistory(id: string): Promise<StoredEvent[]> {
    return loadEvents(id);
  }
}

// Singleton instance
export const reservationRepository = new ReservationRepository();
