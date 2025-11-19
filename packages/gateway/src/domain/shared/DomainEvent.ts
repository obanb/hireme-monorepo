export interface DomainEvent {
  type: string;
  aggregateId: string;
  version: number;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

