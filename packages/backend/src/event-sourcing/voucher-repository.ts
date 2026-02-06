/**
 * Voucher Repository
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import { applyVoucherProjection, getVoucher, listVouchers } from './voucher-projections';
import { VoucherAggregate, VoucherDetails } from './voucher-aggregate';

export class VoucherRepository {
  async load(id: string): Promise<VoucherAggregate | null> {
    const events = await loadEvents(id);
    if (events.length === 0) return null;
    const aggregate = new VoucherAggregate(id);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  async save(aggregate: VoucherAggregate, newEvents: DomainEvent[]): Promise<StoredEvent[]> {
    if (newEvents.length === 0) return [];
    return withTransaction(async (client) => {
      const savedEvents = await appendEvents(client, aggregate.id, newEvents, aggregate.version);
      for (const event of savedEvents) {
        await applyVoucherProjection(client, aggregate.id, event);
      }
      return savedEvents;
    });
  }

  async create(id: string, details: VoucherDetails): Promise<{ aggregate: VoucherAggregate; events: StoredEvent[] }> {
    const existing = await this.load(id);
    if (existing) throw new Error(`Voucher with ID ${id} already exists`);
    const { aggregate, event } = VoucherAggregate.create(id, details);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async update(id: string, updates: Partial<VoucherDetails> & { active?: boolean }): Promise<{ aggregate: VoucherAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`Voucher with ID ${id} not found`);
    const event = aggregate.update(updates);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async cancel(id: string, reason?: string): Promise<{ aggregate: VoucherAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`Voucher with ID ${id} not found`);
    const event = aggregate.cancel(reason);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async use(id: string, amount: number, reservationNumber?: string, usedIn?: string): Promise<{ aggregate: VoucherAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`Voucher with ID ${id} not found`);
    const event = aggregate.use(amount, reservationNumber, usedIn);
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async markPaid(id: string): Promise<{ aggregate: VoucherAggregate; events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`Voucher with ID ${id} not found`);
    const event = aggregate.markPaid();
    const savedEvents = await this.save(aggregate, [event]);
    aggregate.version = savedEvents[savedEvents.length - 1].version;
    return { aggregate, events: savedEvents };
  }

  async delete(id: string): Promise<{ events: StoredEvent[] }> {
    const aggregate = await this.load(id);
    if (!aggregate) throw new Error(`Voucher with ID ${id} not found`);
    const event = aggregate.delete();
    const savedEvents = await this.save(aggregate, [event]);
    return { events: savedEvents };
  }

  async getReadModel(id: string) {
    const client = await getPool().connect();
    try { return await getVoucher(client, id); }
    finally { client.release(); }
  }

  async listReadModels(options: { includeInactive?: boolean; hotel?: number; status?: string } = {}) {
    const client = await getPool().connect();
    try { return await listVouchers(client, options); }
    finally { client.release(); }
  }
}

export const voucherRepository = new VoucherRepository();
