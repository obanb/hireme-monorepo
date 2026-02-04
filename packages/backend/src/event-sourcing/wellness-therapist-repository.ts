/**
 * WellnessTherapist Repository
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import { applyWellnessTherapistProjection, getWellnessTherapist, listWellnessTherapists } from './wellness-therapist-projections';
import { WellnessTherapistAggregate, WellnessTherapistDetails } from './wellness-therapist-aggregate';

export class WellnessTherapistRepository {
  async load(id: string): Promise<WellnessTherapistAggregate | null> {
    const events = await loadEvents(id);
    if (events.length === 0) return null;
    const aggregate = new WellnessTherapistAggregate(id);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  async save(aggregate: WellnessTherapistAggregate, newEvents: DomainEvent[]): Promise<StoredEvent[]> {
    if (newEvents.length === 0) return [];
    return withTransaction(async (client) => {
      const savedEvents = await appendEvents(client, aggregate.id, newEvents, aggregate.version);
      for (const event of savedEvents) {
        await applyWellnessTherapistProjection(client, aggregate.id, event);
      }
      return savedEvents;
    });
  }

  async create(id: string, details: WellnessTherapistDetails): Promise<{ aggregate: WellnessTherapistAggregate; events: StoredEvent[] }> {
    const existing = await this.load(id);
    if (existing) throw new Error(`WellnessTherapist with ID ${id} already exists`);
    const { aggregate, event } = WellnessTherapistAggregate.create(id, details);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async update(id: string, updates: Partial<WellnessTherapistDetails> & { isActive?: boolean }): Promise<{ aggregate: WellnessTherapistAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`WellnessTherapist with ID ${id} not found`);
    const event = aggregate.update(updates);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async delete(id: string): Promise<{ events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`WellnessTherapist with ID ${id} not found`);
    const event = aggregate.delete();
    const savedEvents = await this.save(aggregate, [event]);
    return { events: savedEvents };
  }

  async getReadModel(id: string) {
    const client = await getPool().connect();
    try { return await getWellnessTherapist(client, id); }
    finally { client.release(); }
  }

  async listReadModels(includeInactive: boolean = false) {
    const client = await getPool().connect();
    try { return await listWellnessTherapists(client, includeInactive); }
    finally { client.release(); }
  }
}

export const wellnessTherapistRepository = new WellnessTherapistRepository();
