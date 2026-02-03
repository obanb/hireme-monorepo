/**
 * RoomType Aggregate
 *
 * Encapsulates the business logic for room types.
 * Reconstructs state from events and produces new events from commands.
 */
import { StoredEvent, DomainEvent } from './event-store';

export interface RoomTypeState {
  id: string;
  code: string | null;
  name: string | null;
  isActive: boolean;
}

export class RoomTypeAggregate {
  public readonly id: string;
  public version: number = 0;

  private _code: string | null = null;
  private _name: string | null = null;
  private _isActive: boolean = true;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Get the current state of the aggregate
   */
  get state(): RoomTypeState {
    return {
      id: this.id,
      code: this._code,
      name: this._name,
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
      case 'RoomTypeCreated':
        this.applyRoomTypeCreated(event.data as unknown as RoomTypeCreatedData);
        break;
      case 'RoomTypeUpdated':
        this.applyRoomTypeUpdated(event.data as unknown as RoomTypeUpdatedData);
        break;
      case 'RoomTypeDeleted':
        this.applyRoomTypeDeleted();
        break;
      default:
        console.warn(`Unknown event type: ${event.type}`);
    }
  }

  private applyRoomTypeCreated(data: RoomTypeCreatedData): void {
    this._code = data.code;
    this._name = data.name;
    this._isActive = true;
  }

  private applyRoomTypeUpdated(data: RoomTypeUpdatedData): void {
    if (data.code !== undefined) this._code = data.code;
    if (data.name !== undefined) this._name = data.name;
    if (data.isActive !== undefined) this._isActive = data.isActive;
  }

  private applyRoomTypeDeleted(): void {
    this._isActive = false;
  }

  // ============ COMMANDS ============

  /**
   * Create a new room type
   */
  static create(
    id: string,
    details: RoomTypeDetails
  ): { aggregate: RoomTypeAggregate; event: DomainEvent } {
    const aggregate = new RoomTypeAggregate(id);

    const event: DomainEvent = {
      type: 'RoomTypeCreated',
      data: {
        roomTypeId: id,
        code: details.code,
        name: details.name,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    aggregate.apply(event);

    return { aggregate, event };
  }

  /**
   * Update the room type details
   */
  update(updates: Partial<RoomTypeDetails> & { isActive?: boolean }): DomainEvent {
    const event: DomainEvent = {
      type: 'RoomTypeUpdated',
      data: {
        roomTypeId: this.id,
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
   * Soft delete the room type (sets isActive to false)
   */
  delete(): DomainEvent {
    const event: DomainEvent = {
      type: 'RoomTypeDeleted',
      data: {
        roomTypeId: this.id,
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

interface RoomTypeCreatedData {
  roomTypeId: string;
  code: string;
  name: string;
}

interface RoomTypeUpdatedData {
  roomTypeId: string;
  code?: string;
  name?: string;
  isActive?: boolean;
}

export interface RoomTypeDetails {
  code: string;
  name: string;
}
