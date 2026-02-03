/**
 * Room Repository
 *
 * Handles loading and saving room aggregates.
 * Coordinates between the event store and projections.
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import { applyRoomProjection, getRoom } from './room-projections';
import { RoomAggregate, RoomDetails, RoomType, RoomStatus } from './room-aggregate';

export class RoomRepository {
  /**
   * Load a room aggregate by its ID
   * Returns null if no events exist for the stream
   */
  async load(id: string): Promise<RoomAggregate | null> {
    const events = await loadEvents(id);

    if (events.length === 0) {
      return null;
    }

    const aggregate = new RoomAggregate(id);
    aggregate.loadFromHistory(events);

    return aggregate;
  }

  /**
   * Save new events for an aggregate
   * Runs projections in the same transaction for consistency
   */
  async save(aggregate: RoomAggregate, newEvents: DomainEvent[]): Promise<StoredEvent[]> {
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
        await applyRoomProjection(client, aggregate.id, event);
      }

      return savedEvents;
    });
  }

  /**
   * Create a new room
   * Returns the created aggregate and saved events
   */
  async create(
    id: string,
    details: RoomDetails
  ): Promise<{ aggregate: RoomAggregate; events: StoredEvent[] }> {
    // Check if aggregate already exists
    const existing = await this.load(id);
    if (existing) {
      throw new Error(`Room with ID ${id} already exists`);
    }

    // Create the aggregate and event
    const { aggregate, event } = RoomAggregate.create(id, details);

    // Save the event
    const savedEvents = await this.save(aggregate, [event]);

    // Update aggregate version
    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Update an existing room
   */
  async update(
    id: string,
    updates: Partial<RoomDetails>
  ): Promise<{ aggregate: RoomAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);

    if (!aggregate) {
      throw new Error(`Room with ID ${id} not found`);
    }

    // Execute the update command
    const event = aggregate.update(updates);

    // Save the event
    const savedEvents = await this.save(aggregate, [event]);

    // Update aggregate version
    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Change a room's status
   */
  async changeStatus(
    id: string,
    status: RoomStatus,
    reason?: string
  ): Promise<{ aggregate: RoomAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);

    if (!aggregate) {
      throw new Error(`Room with ID ${id} not found`);
    }

    // Execute the changeStatus command
    const event = aggregate.changeStatus(status, reason);

    // Save the event
    const savedEvents = await this.save(aggregate, [event]);

    // Update aggregate version
    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Get a room from the read model (optimized for queries)
   */
  async getReadModel(id: string) {
    const client = await getPool().connect();
    try {
      return await getRoom(client, id);
    } finally {
      client.release();
    }
  }

  /**
   * List all rooms from the read model
   */
  async listReadModels(options?: {
    filter?: {
      type?: RoomType;
      status?: RoomStatus;
    };
    limit?: number;
    offset?: number;
  }) {
    const pool = getPool();
    const params: (string | number)[] = [];
    let query = 'SELECT * FROM rooms';
    const conditions: string[] = [];
    const filter = options?.filter;

    if (filter?.type) {
      params.push(filter.type);
      conditions.push(`type = $${params.length}`);
    }

    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY room_number ASC';

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
      name: row.name,
      roomNumber: row.room_number,
      type: row.type as RoomType,
      capacity: row.capacity,
      status: row.status as RoomStatus,
      color: row.color,
      roomTypeId: row.room_type_id as string | null,
      rateCodeId: row.rate_code_id as string | null,
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
export const roomRepository = new RoomRepository();
