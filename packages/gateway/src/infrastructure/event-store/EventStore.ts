import { DomainEvent } from '../../domain/shared/DomainEvent';

export interface EventStore {
  appendEvents(
    streamId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void>;

  getEvents(streamId: string): Promise<DomainEvent[]>;

  getEventsByType(eventType: string, limit?: number): Promise<DomainEvent[]>;

  getVersion(streamId: string): Promise<number>;
}

export class ConcurrencyError extends Error {
  constructor(
    public readonly streamId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Concurrency conflict: Expected version ${expectedVersion}, but actual version is ${actualVersion}`
    );
    this.name = 'ConcurrencyError';
  }
}

