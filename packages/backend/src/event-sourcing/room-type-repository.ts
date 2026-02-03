/**
 * RoomType Repository
 *
 * Handles loading and saving room type aggregates.
 * Coordinates between the event store and projections.
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import { applyRoomTypeProjection, getRoomType, listRoomTypes } from './room-type-projections';
import { RoomTypeAggregate, RoomTypeDetails } from './room-type-aggregate';

export class RoomTypeRepository {
  /**
   * Load a room type aggregate by its ID
   * Returns null if no events exist for the stream
   */
  async load(id: string): Promise<RoomTypeAggregate | null> {
    const events = await loadEvents(id);

    if (events.length === 0) {
      return null;
    }

    const aggregate = new RoomTypeAggregate(id);
    aggregate.loadFromHistory(events);

    return aggregate;
  }

  /**
   * Save new events for an aggregate
   * Runs projections in the same transaction for consistency
   */
  async save(aggregate: RoomTypeAggregate, newEvents: DomainEvent[]): Promise<StoredEvent[]> {
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
        await applyRoomTypeProjection(client, aggregate.id, event);
      }

      return savedEvents;
    });
  }

  /**
   * Create a new room type
   * Returns the created aggregate and saved events
   */
  async create(
    id: string,
    details: RoomTypeDetails
  ): Promise<{ aggregate: RoomTypeAggregate; events: StoredEvent[] }> {
    const existing = await this.load(id);
    if (existing) {
      throw new Error(`RoomType with ID ${id} already exists`);
    }

    const { aggregate, event } = RoomTypeAggregate.create(id, details);

    const savedEvents = await this.save(aggregate, [event]);

    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Update an existing room type
   */
  async update(
    id: string,
    updates: Partial<RoomTypeDetails> & { isActive?: boolean }
  ): Promise<{ aggregate: RoomTypeAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);

    if (!aggregate) {
      throw new Error(`RoomType with ID ${id} not found`);
    }

    const event = aggregate.update(updates);

    const savedEvents = await this.save(aggregate, [event]);

    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Soft delete a room type (sets isActive to false)
   */
  async delete(id: string): Promise<{ events: StoredEvent[] }> {
    const aggregate = await this.load(id);

    if (!aggregate) {
      throw new Error(`RoomType with ID ${id} not found`);
    }

    const event = aggregate.delete();

    const savedEvents = await this.save(aggregate, [event]);

    return { events: savedEvents };
  }

  /**
   * Get a room type from the read model (optimized for queries)
   */
  async getReadModel(id: string) {
    const client = await getPool().connect();
    try {
      return await getRoomType(client, id);
    } finally {
      client.release();
    }
  }

  /**
   * List all room types from the read model
   */
  async listReadModels(includeInactive: boolean = false) {
    const client = await getPool().connect();
    try {
      return await listRoomTypes(client, includeInactive);
    } finally {
      client.release();
    }
  }

  /**
   * Get all events for a stream (useful for debugging/auditing)
   */
  async getEventHistory(id: string): Promise<StoredEvent[]> {
    return loadEvents(id);
  }
}

// Singleton instance
export const roomTypeRepository = new RoomTypeRepository();
