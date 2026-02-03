/**
 * RateCode Aggregate
 *
 * Encapsulates the business logic for rate codes.
 * Reconstructs state from events and produces new events from commands.
 */
import { StoredEvent, DomainEvent } from './event-store';

export interface RateCodeState {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  isActive: boolean;
}

export class RateCodeAggregate {
  public readonly id: string;
  public version: number = 0;

  private _code: string | null = null;
  private _name: string | null = null;
  private _description: string | null = null;
  private _isActive: boolean = true;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Get the current state of the aggregate
   */
  get state(): RateCodeState {
    return {
      id: this.id,
      code: this._code,
      name: this._name,
      description: this._description,
      isActive: this._isActive,
    };
  }

  /**
   * Rehydrate the aggregate from a list of historical events
   */
  loadFromHistory(events: StoredEvent[]): void {
    for (const event of events) {
      this.apply(event);
      this.version = event.version;
    }
  }

  /**
   * Apply an event to update the aggregate state
   */
  private apply(event: StoredEvent | DomainEvent): void {
    switch (event.type) {
      case 'RateCodeCreated':
        this.applyRateCodeCreated(event.data as unknown as RateCodeCreatedData);
        break;
      case 'RateCodeUpdated':
        this.applyRateCodeUpdated(event.data as unknown as RateCodeUpdatedData);
        break;
      case 'RateCodeDeleted':
        this.applyRateCodeDeleted();
        break;
      default:
        console.warn(`Unknown event type: ${event.type}`);
    }
  }

  private applyRateCodeCreated(data: RateCodeCreatedData): void {
    this._code = data.code;
    this._name = data.name;
    this._description = data.description || null;
    this._isActive = true;
  }

  private applyRateCodeUpdated(data: RateCodeUpdatedData): void {
    if (data.code !== undefined) this._code = data.code;
    if (data.name !== undefined) this._name = data.name;
    if (data.description !== undefined) this._description = data.description;
    if (data.isActive !== undefined) this._isActive = data.isActive;
  }

  private applyRateCodeDeleted(): void {
    this._isActive = false;
  }

  // ============ COMMANDS ============

  /**
   * Create a new rate code
   */
  static create(
    id: string,
    details: RateCodeDetails
  ): { aggregate: RateCodeAggregate; event: DomainEvent } {
    const aggregate = new RateCodeAggregate(id);

    const event: DomainEvent = {
      type: 'RateCodeCreated',
      data: {
        rateCodeId: id,
        code: details.code,
        name: details.name,
        description: details.description,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    aggregate.apply(event);

    return { aggregate, event };
  }

  /**
   * Update the rate code details
   */
  update(updates: Partial<RateCodeDetails> & { isActive?: boolean }): DomainEvent {
    const event: DomainEvent = {
      type: 'RateCodeUpdated',
      data: {
        rateCodeId: this.id,
        ...updates,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    this.apply(event);

    return event;
  }

  /**
   * Soft delete the rate code (sets isActive to false)
   */
  delete(): DomainEvent {
    const event: DomainEvent = {
      type: 'RateCodeDeleted',
      data: {
        rateCodeId: this.id,
        deletedAt: new Date().toISOString(),
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    this.apply(event);

    return event;
  }
}

// ============ TYPE DEFINITIONS ============

interface RateCodeCreatedData {
  rateCodeId: string;
  code: string;
  name: string;
  description?: string;
}

interface RateCodeUpdatedData {
  rateCodeId: string;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface RateCodeDetails {
  code: string;
  name: string;
  description?: string;
}
