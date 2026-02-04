/**
 * WellnessBooking Repository
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import { applyWellnessBookingProjection, getWellnessBooking, listWellnessBookings } from './wellness-booking-projections';
import { WellnessBookingAggregate, WellnessBookingDetails, WellnessBookingUpdateDetails } from './wellness-booking-aggregate';

export class WellnessBookingRepository {
  async load(id: string): Promise<WellnessBookingAggregate | null> {
    const events = await loadEvents(id);
    if (events.length === 0) return null;
    const aggregate = new WellnessBookingAggregate(id);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  async save(aggregate: WellnessBookingAggregate, newEvents: DomainEvent[]): Promise<StoredEvent[]> {
    if (newEvents.length === 0) return [];
    return withTransaction(async (client) => {
      const savedEvents = await appendEvents(client, aggregate.id, newEvents, aggregate.version);
      for (const event of savedEvents) {
        await applyWellnessBookingProjection(client, aggregate.id, event);
      }
      return savedEvents;
    });
  }

  async create(id: string, details: WellnessBookingDetails): Promise<{ aggregate: WellnessBookingAggregate; events: StoredEvent[] }> {
    const existing = await this.load(id);
    if (existing) throw new Error(`WellnessBooking with ID ${id} already exists`);
    const { aggregate, event } = WellnessBookingAggregate.create(id, details);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async update(id: string, updates: WellnessBookingUpdateDetails): Promise<{ aggregate: WellnessBookingAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`WellnessBooking with ID ${id} not found`);
    const event = aggregate.update(updates);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async cancel(id: string, reason?: string): Promise<{ aggregate: WellnessBookingAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`WellnessBooking with ID ${id} not found`);
    const event = aggregate.cancel(reason);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async getReadModel(id: string) {
    const client = await getPool().connect();
    try { return await getWellnessBooking(client, id); }
    finally { client.release(); }
  }

  async listReadModels(filter?: {
    scheduledDateFrom?: string;
    scheduledDateTo?: string;
    therapistId?: string;
    roomTypeId?: string;
    serviceId?: string;
    status?: string;
    guestName?: string;
  }) {
    const client = await getPool().connect();
    try { return await listWellnessBookings(client, filter); }
    finally { client.release(); }
  }
}

export const wellnessBookingRepository = new WellnessBookingRepository();
