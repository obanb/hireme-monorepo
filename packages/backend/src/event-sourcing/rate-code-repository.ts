/**
 * RateCode Repository
 *
 * Handles loading and saving rate code aggregates.
 * Coordinates between the event store and projections.
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import { applyRateCodeProjection, getRateCode, listRateCodes } from './rate-code-projections';
import { RateCodeAggregate, RateCodeDetails } from './rate-code-aggregate';

export class RateCodeRepository {
  /**
   * Load a rate code aggregate by its ID
   * Returns null if no events exist for the stream
   */
  async load(id: string): Promise<RateCodeAggregate | null> {
    const events = await loadEvents(id);

    if (events.length === 0) {
      return null;
    }

    const aggregate = new RateCodeAggregate(id);
    aggregate.loadFromHistory(events);

    return aggregate;
  }

  /**
   * Save new events for an aggregate
   * Runs projections in the same transaction for consistency
   */
  async save(aggregate: RateCodeAggregate, newEvents: DomainEvent[]): Promise<StoredEvent[]> {
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
        await applyRateCodeProjection(client, aggregate.id, event);
      }

      return savedEvents;
    });
  }

  /**
   * Create a new rate code
   * Returns the created aggregate and saved events
   */
  async create(
    id: string,
    details: RateCodeDetails
  ): Promise<{ aggregate: RateCodeAggregate; events: StoredEvent[] }> {
    const existing = await this.load(id);
    if (existing) {
      throw new Error(`RateCode with ID ${id} already exists`);
    }

    const { aggregate, event } = RateCodeAggregate.create(id, details);

    const savedEvents = await this.save(aggregate, [event]);

    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Update an existing rate code
   */
  async update(
    id: string,
    updates: Partial<RateCodeDetails> & { isActive?: boolean }
  ): Promise<{ aggregate: RateCodeAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);

    if (!aggregate) {
      throw new Error(`RateCode with ID ${id} not found`);
    }

    const event = aggregate.update(updates);

    const savedEvents = await this.save(aggregate, [event]);

    aggregate.version = savedEvents[savedEvents.length - 1].version;

    return { aggregate, events: savedEvents };
  }

  /**
   * Soft delete a rate code (sets isActive to false)
   */
  async delete(id: string): Promise<{ events: StoredEvent[] }> {
    const aggregate = await this.load(id);

    if (!aggregate) {
      throw new Error(`RateCode with ID ${id} not found`);
    }

    const event = aggregate.delete();

    const savedEvents = await this.save(aggregate, [event]);

    return { events: savedEvents };
  }

  /**
   * Get a rate code from the read model (optimized for queries)
   */
  async getReadModel(id: string) {
    const client = await getPool().connect();
    try {
      return await getRateCode(client, id);
    } finally {
      client.release();
    }
  }

  /**
   * List all rate codes from the read model
   */
  async listReadModels(includeInactive: boolean = false) {
    const client = await getPool().connect();
    try {
      return await listRateCodes(client, includeInactive);
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
export const rateCodeRepository = new RateCodeRepository();
