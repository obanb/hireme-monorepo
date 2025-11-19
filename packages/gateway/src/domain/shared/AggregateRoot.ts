import { DomainEvent } from './DomainEvent';

export abstract class AggregateRoot {
  protected id: string;
  protected version: number = 0;
  private uncommittedEvents: DomainEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  getId(): string {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  protected addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
    this.applyEvent(event);
  }

  protected abstract applyEvent(event: DomainEvent): void;

  protected incrementVersion(): void {
    this.version++;
  }
}

