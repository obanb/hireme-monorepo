/**
 * WellnessService Repository
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import { applyWellnessServiceProjection, getWellnessService, listWellnessServices } from './wellness-service-projections';
import { WellnessServiceAggregate, WellnessServiceDetails } from './wellness-service-aggregate';

export class WellnessServiceRepository {
  async load(id: string): Promise<WellnessServiceAggregate | null> {
    const events = await loadEvents(id);
    if (events.length === 0) return null;
    const aggregate = new WellnessServiceAggregate(id);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  async save(aggregate: WellnessServiceAggregate, newEvents: DomainEvent[]): Promise<StoredEvent[]> {
    if (newEvents.length === 0) return [];
    return withTransaction(async (client) => {
      const savedEvents = await appendEvents(client, aggregate.id, newEvents, aggregate.version);
      for (const event of savedEvents) {
        await applyWellnessServiceProjection(client, aggregate.id, event);
      }
      return savedEvents;
    });
  }

  async create(id: string, details: WellnessServiceDetails): Promise<{ aggregate: WellnessServiceAggregate; events: StoredEvent[] }> {
    const existing = await this.load(id);
    if (existing) throw new Error(`WellnessService with ID ${id} already exists`);
    const { aggregate, event } = WellnessServiceAggregate.create(id, details);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async update(id: string, updates: Partial<WellnessServiceDetails> & { isActive?: boolean }): Promise<{ aggregate: WellnessServiceAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`WellnessService with ID ${id} not found`);
    const event = aggregate.update(updates);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async delete(id: string): Promise<{ events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`WellnessService with ID ${id} not found`);
    const event = aggregate.delete();
    const savedEvents = await this.save(aggregate, [event]);
    return { events: savedEvents };
  }

  async getReadModel(id: string) {
    const client = await getPool().connect();
    try { return await getWellnessService(client, id); }
    finally { client.release(); }
  }

  async listReadModels(includeInactive: boolean = false) {
    const client = await getPool().connect();
    try { return await listWellnessServices(client, includeInactive); }
    finally { client.release(); }
  }
}

export const wellnessServiceRepository = new WellnessServiceRepository();
