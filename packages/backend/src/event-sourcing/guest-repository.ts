/**
 * Guest Repository
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import { applyGuestProjection, getGuest, getGuestByEmail, listGuests } from './guest-projections';
import { GuestAggregate, GuestDetails } from './guest-aggregate';

export class GuestRepository {
  async load(id: string): Promise<GuestAggregate | null> {
    const events = await loadEvents(id);
    if (events.length === 0) return null;
    const aggregate = new GuestAggregate(id);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  async save(aggregate: GuestAggregate, newEvents: DomainEvent[]): Promise<StoredEvent[]> {
    if (newEvents.length === 0) return [];
    return withTransaction(async (client) => {
      const savedEvents = await appendEvents(client, aggregate.id, newEvents, aggregate.version);
      for (const event of savedEvents) {
        await applyGuestProjection(client, aggregate.id, event);
      }
      return savedEvents;
    });
  }

  async create(id: string, details: GuestDetails): Promise<{ aggregate: GuestAggregate; events: StoredEvent[] }> {
    const existing = await this.load(id);
    if (existing) throw new Error(`Guest with ID ${id} already exists`);
    const { aggregate, event } = GuestAggregate.create(id, details);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async update(id: string, updates: Partial<GuestDetails>): Promise<{ aggregate: GuestAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`Guest with ID ${id} not found`);
    const event = aggregate.update(updates);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async delete(id: string): Promise<{ events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`Guest with ID ${id} not found`);
    const event = aggregate.delete();
    const savedEvents = await this.save(aggregate, [event]);
    return { events: savedEvents };
  }

  async getReadModel(id: string) {
    const client = await getPool().connect();
    try { return await getGuest(client, id); }
    finally { client.release(); }
  }

  async getReadModelByEmail(email: string) {
    const client = await getPool().connect();
    try { return await getGuestByEmail(client, email); }
    finally { client.release(); }
  }

  async listReadModels(options: { filter?: { email?: string; name?: string; nationality?: string; passportNumber?: string }; limit?: number; offset?: number } = {}) {
    const client = await getPool().connect();
    try { return await listGuests(client, options); }
    finally { client.release(); }
  }
}

export const guestRepository = new GuestRepository();
