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
      const savedEvents = await appendEvents(
        client,
        aggregate.id,
        newEvents,
        aggregate.version
      );

      for (const event of savedEvents) {
        await applyReservationProjection(client, aggregate.id, event);
      }

      return savedEvents;
    });
  }

  /**
   * Create a new reservation
   */
  async create(
    id: string,
    bookingDetails: {
      originId?: string;
      totalPrice?: number;
      payedPrice?: number;
      currency?: string;
      arrivalTime?: string;
      departureTime?: string;
      roomIds?: string[];
      guestEmail?: string;
      customer?: {
        firstName?: string;
        lastName?: string;
      };
    }
  ): Promise<{ aggregate: ReservationAggregate; events: StoredEvent[] }> {
    const existing = await this.load(id);
    if (existing) {
      throw new Error(`Reservation with ID ${id} already exists`);
    }

    const { aggregate, event } = ReservationAggregate.create(id, bookingDetails);
    const savedEvents = await this.save(aggregate, [event]);
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

    const event = aggregate.confirm(confirmedBy);
    const savedEvents = await this.save(aggregate, [event]);
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

    const event = aggregate.cancel(reason);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Assign rooms to an existing reservation
   */
  async assignRooms(
    id: string,
    roomIds: string[]
  ): Promise<{ aggregate: ReservationAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);

    if (!aggregate) {
      throw new Error(`Reservation with ID ${id} not found`);
    }

    const event = aggregate.assignRooms(roomIds);
    const savedEvents = await this.save(aggregate, [event]);
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
    filter?: {
      status?: string;
      guestName?: string;
      checkInFrom?: string;
      checkInTo?: string;
      checkOutFrom?: string;
      checkOutTo?: string;
      createdFrom?: string;
      createdTo?: string;
      currency?: string;
    };
    limit?: number;
    offset?: number;
  }) {
    const pool = getPool();
    const params: (string | number)[] = [];
    let query = 'SELECT * FROM reservations';
    const conditions: string[] = [];
    const filter = options?.filter;

    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }

    if (filter?.guestName) {
      params.push(`%${filter.guestName}%`);
      conditions.push(`guest_name ILIKE $${params.length}`);
    }

    if (filter?.checkInFrom) {
      params.push(filter.checkInFrom);
      conditions.push(`check_in_date >= $${params.length}`);
    }

    if (filter?.checkInTo) {
      params.push(filter.checkInTo);
      conditions.push(`check_in_date <= $${params.length}`);
    }

    if (filter?.checkOutFrom) {
      params.push(filter.checkOutFrom);
      conditions.push(`check_out_date >= $${params.length}`);
    }

    if (filter?.checkOutTo) {
      params.push(filter.checkOutTo);
      conditions.push(`check_out_date <= $${params.length}`);
    }

    if (filter?.createdFrom) {
      params.push(filter.createdFrom);
      conditions.push(`created_at >= $${params.length}`);
    }

    if (filter?.createdTo) {
      params.push(filter.createdTo);
      conditions.push(`created_at <= $${params.length}`);
    }

    if (filter?.currency) {
      params.push(filter.currency);
      conditions.push(`currency = $${params.length}`);
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
      guestEmail: row.guest_email,
      guestId: row.guest_id ?? null,
      status: row.status,
      checkInDate: row.check_in_date,
      checkOutDate: row.check_out_date,
      totalPrice: row.total_price,
      payedPrice: row.payed_price,
      currency: row.currency,
      roomIds: row.room_ids || [],
      accountId: row.account_id ?? null,
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
