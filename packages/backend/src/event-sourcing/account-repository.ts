/**
 * Account Repository
 *
 * Handles loading and saving account aggregates.
 */
import { getPool, withTransaction } from './database';
import { loadEvents, appendEvents, DomainEvent, StoredEvent } from './event-store';
import {
  applyAccountProjection,
  getAccount,
  getAccountByStreamId,
  getAccountByReservationId,
  listAccounts,
  AccountRow,
} from './account-projections';
import { AccountAggregate, AccountDetails } from './account-aggregate';

export class AccountRepository {
  async load(streamId: string): Promise<AccountAggregate | null> {
    const events = await loadEvents(streamId);
    if (events.length === 0) return null;
    const aggregate = new AccountAggregate(streamId);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  async save(
    aggregate: AccountAggregate,
    newEvents: DomainEvent[]
  ): Promise<{ storedEvents: StoredEvent[]; accountId: number | null }> {
    if (newEvents.length === 0) return { storedEvents: [], accountId: null };

    return withTransaction(async (client) => {
      const savedEvents = await appendEvents(
        client,
        aggregate.id,
        newEvents,
        aggregate.version
      );

      let accountId: number | null = null;
      for (const event of savedEvents) {
        const id = await applyAccountProjection(client, aggregate.id, event);
        if (id !== null) accountId = id;
      }

      return { storedEvents: savedEvents, accountId };
    });
  }

  /**
   * Create a new account and link it back to the reservation
   */
  async create(
    streamId: string,
    details: AccountDetails
  ): Promise<{ aggregate: AccountAggregate; events: StoredEvent[]; accountId: number }> {
    const existing = await this.load(streamId);
    if (existing) {
      throw new Error(`Account with stream ID ${streamId} already exists`);
    }

    const { aggregate, event } = AccountAggregate.create(streamId, details);
    const { storedEvents, accountId } = await this.save(aggregate, [event]);

    if (accountId === null) {
      throw new Error('Failed to get account ID after creation');
    }

    // Link account_id back to reservation
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE reservations SET account_id = $1 WHERE id = $2`,
        [accountId, details.reservationId]
      );
    } finally {
      client.release();
    }

    aggregate.version = storedEvents[storedEvents.length - 1]?.version ?? 0;

    return { aggregate, events: storedEvents, accountId };
  }

  async getById(id: number): Promise<AccountRow | null> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      return await getAccount(client, id);
    } finally {
      client.release();
    }
  }

  async getByStreamId(streamId: string): Promise<AccountRow | null> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      return await getAccountByStreamId(client, streamId);
    } finally {
      client.release();
    }
  }

  async getByReservationId(reservationId: string): Promise<AccountRow | null> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      return await getAccountByReservationId(client, reservationId);
    } finally {
      client.release();
    }
  }

  async list(options?: {
    filter?: {
      reservationId?: string;
      minTotal?: number;
      maxTotal?: number;
      createdFrom?: string;
      createdTo?: string;
    };
    limit?: number;
    offset?: number;
  }): Promise<AccountRow[]> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      return await listAccounts(client, options);
    } finally {
      client.release();
    }
  }
}

export const accountRepository = new AccountRepository();
