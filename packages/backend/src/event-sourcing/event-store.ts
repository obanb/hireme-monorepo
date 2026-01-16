/**
 * Event Store
 *
 * Responsible for persisting and retrieving events from the PostgreSQL database.
 * Implements optimistic concurrency control using version numbers.
 */
import { PoolClient } from 'pg';
import { getPool } from './database';

export interface StoredEvent {
  id: number;
  streamId: string;
  version: number;
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

export interface DomainEvent {
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Load all events for a specific stream (aggregate)
 */
export async function loadEvents(streamId: string): Promise<StoredEvent[]> {
  const pool = getPool();
  const result = await pool.query<{
    id: number;
    stream_id: string;
    version: number;
    type: string;
    data: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    occurred_at: Date;
  }>(
    `SELECT id, stream_id, version, type, data, metadata, occurred_at
     FROM events
     WHERE stream_id = $1
     ORDER BY version ASC`,
    [streamId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    streamId: row.stream_id,
    version: row.version,
    type: row.type,
    data: row.data,
    metadata: row.metadata || undefined,
    occurredAt: row.occurred_at,
  }));
}

/**
 * Append events to a stream within a transaction
 * Implements optimistic concurrency - will fail if expected version doesn't match
 */
export async function appendEvents(
  client: PoolClient,
  streamId: string,
  events: DomainEvent[],
  expectedVersion: number
): Promise<StoredEvent[]> {
  const savedEvents: StoredEvent[] = [];
  let nextVersion = expectedVersion + 1;

  for (const event of events) {
    const result = await client.query<{
      id: number;
      occurred_at: Date;
    }>(
      `INSERT INTO events (stream_id, version, type, data, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, occurred_at`,
      [
        streamId,
        nextVersion,
        event.type,
        JSON.stringify(event.data),
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]
    );

    savedEvents.push({
      id: result.rows[0].id,
      streamId,
      version: nextVersion,
      type: event.type,
      data: event.data,
      metadata: event.metadata,
      occurredAt: result.rows[0].occurred_at,
    });

    nextVersion++;
  }

  return savedEvents;
}

/**
 * Get events that haven't been processed yet (for event relayer)
 */
export async function getUnprocessedEvents(
  lastProcessedId: number,
  limit: number
): Promise<StoredEvent[]> {
  const pool = getPool();
  const result = await pool.query<{
    id: number;
    stream_id: string;
    version: number;
    type: string;
    data: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    occurred_at: Date;
  }>(
    `SELECT id, stream_id, version, type, data, metadata, occurred_at
     FROM events
     WHERE id > $1
     ORDER BY id ASC
     LIMIT $2`,
    [lastProcessedId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    streamId: row.stream_id,
    version: row.version,
    type: row.type,
    data: row.data,
    metadata: row.metadata || undefined,
    occurredAt: row.occurred_at,
  }));
}

/**
 * Get the current checkpoint for the event relayer
 */
export async function getCheckpoint(publisherId: string): Promise<number> {
  const pool = getPool();
  const result = await pool.query<{ last_processed_event_id: number }>(
    `SELECT last_processed_event_id FROM event_checkpoints WHERE id = $1`,
    [publisherId]
  );

  return result.rows[0]?.last_processed_event_id || 0;
}

/**
 * Update the checkpoint after processing events
 */
export async function updateCheckpoint(
  publisherId: string,
  lastProcessedEventId: number
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO event_checkpoints (id, last_processed_event_id)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET last_processed_event_id = $2`,
    [publisherId, lastProcessedEventId]
  );
}
