/**
 * WellnessRoomType Repository
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import { applyWellnessRoomTypeProjection, getWellnessRoomType, listWellnessRoomTypes } from './wellness-room-type-projections';
import { WellnessRoomTypeAggregate, WellnessRoomTypeDetails } from './wellness-room-type-aggregate';

export class WellnessRoomTypeRepository {
  async load(id: string): Promise<WellnessRoomTypeAggregate | null> {
    const events = await loadEvents(id);
    if (events.length === 0) return null;
    const aggregate = new WellnessRoomTypeAggregate(id);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  async save(aggregate: WellnessRoomTypeAggregate, newEvents: DomainEvent[]): Promise<StoredEvent[]> {
    if (newEvents.length === 0) return [];
    return withTransaction(async (client) => {
      const savedEvents = await appendEvents(client, aggregate.id, newEvents, aggregate.version);
      for (const event of savedEvents) {
        await applyWellnessRoomTypeProjection(client, aggregate.id, event);
      }
      return savedEvents;
    });
  }

  async create(id: string, details: WellnessRoomTypeDetails): Promise<{ aggregate: WellnessRoomTypeAggregate; events: StoredEvent[] }> {
    const existing = await this.load(id);
    if (existing) throw new Error(`WellnessRoomType with ID ${id} already exists`);
    const { aggregate, event } = WellnessRoomTypeAggregate.create(id, details);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async update(id: string, updates: Partial<WellnessRoomTypeDetails> & { isActive?: boolean }): Promise<{ aggregate: WellnessRoomTypeAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`WellnessRoomType with ID ${id} not found`);
    const event = aggregate.update(updates);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async delete(id: string): Promise<{ events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`WellnessRoomType with ID ${id} not found`);
    const event = aggregate.delete();
    const savedEvents = await this.save(aggregate, [event]);
    return { events: savedEvents };
  }

  async getReadModel(id: string) {
    const client = await getPool().connect();
    try { return await getWellnessRoomType(client, id); }
    finally { client.release(); }
  }

  async listReadModels(includeInactive: boolean = false) {
    const client = await getPool().connect();
    try { return await listWellnessRoomTypes(client, includeInactive); }
    finally { client.release(); }
  }
}

export const wellnessRoomTypeRepository = new WellnessRoomTypeRepository();
