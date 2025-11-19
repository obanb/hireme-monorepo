import { Pool, PoolClient } from 'pg';
import { EventStore, ConcurrencyError } from './EventStore';
import { DomainEvent } from '../../domain/shared/DomainEvent';

export class PostgresEventStore implements EventStore {
  constructor(private pool: Pool) {
    this.initializeTables();
  }

  private async initializeTables(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS events (
          id BIGSERIAL PRIMARY KEY,
          stream_id VARCHAR(255) NOT NULL,
          version INT NOT NULL,
          event_type VARCHAR(255) NOT NULL,
          event_data JSONB NOT NULL,
          metadata JSONB,
          occurred_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(stream_id, version)
        );

        CREATE INDEX IF NOT EXISTS idx_stream_version ON events(stream_id, version);
        CREATE INDEX IF NOT EXISTS idx_event_type ON events(event_type);
        CREATE INDEX IF NOT EXISTS idx_occurred_at ON events(occurred_at);
      `);
    } finally {
      client.release();
    }
  }

  async appendEvents(
    streamId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check current version
      const versionResult = await client.query(
        'SELECT COALESCE(MAX(version), 0) as version FROM events WHERE stream_id = $1',
        [streamId]
      );
      const currentVersion = parseInt(versionResult.rows[0].version);

      if (currentVersion !== expectedVersion) {
        await client.query('ROLLBACK');
        throw new ConcurrencyError(streamId, expectedVersion, currentVersion);
      }

      // Insert events
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const version = expectedVersion + i + 1;

        await client.query(
          `INSERT INTO events (stream_id, version, event_type, event_data, metadata, occurred_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            streamId,
            version,
            event.type,
            JSON.stringify(event),
            event.metadata ? JSON.stringify(event.metadata) : null,
            event.occurredAt
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvents(streamId: string): Promise<DomainEvent[]> {
    const result = await this.pool.query(
      `SELECT event_data FROM events 
       WHERE stream_id = $1 
       ORDER BY version ASC`,
      [streamId]
    );

    return result.rows.map(row => this.deserializeEvent(row.event_data));
  }

  async getEventsByType(eventType: string, limit: number = 100): Promise<DomainEvent[]> {
    const result = await this.pool.query(
      `SELECT event_data FROM events 
       WHERE event_type = $1 
       ORDER BY occurred_at ASC 
       LIMIT $2`,
      [eventType, limit]
    );

    return result.rows.map(row => this.deserializeEvent(row.event_data));
  }

  async getVersion(streamId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COALESCE(MAX(version), 0) as version FROM events WHERE stream_id = $1',
      [streamId]
    );

    return parseInt(result.rows[0].version);
  }

  private deserializeEvent(eventData: any): DomainEvent {
    return {
      ...eventData,
      occurredAt: new Date(eventData.occurredAt)
    };
  }
}

