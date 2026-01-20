/**
 * Room Aggregate
 *
 * Encapsulates the business logic for rooms.
 * Reconstructs state from events and produces new events from commands.
 */
import { StoredEvent, DomainEvent } from './event-store';

export type RoomType = 'SINGLE' | 'DOUBLE' | 'SUITE' | 'DELUXE' | 'PENTHOUSE';
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

export interface RoomState {
  id: string;
  name: string | null;
  roomNumber: string | null;
  type: RoomType | null;
  capacity: number | null;
  status: RoomStatus;
  color: string;
}

export class RoomAggregate {
  public readonly id: string;
  public version: number = 0;

  private _name: string | null = null;
  private _roomNumber: string | null = null;
  private _type: RoomType | null = null;
  private _capacity: number | null = null;
  private _status: RoomStatus = 'AVAILABLE';
  private _color: string = '#3b82f6';

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Get the current state of the aggregate
   */
  get state(): RoomState {
    return {
      id: this.id,
      name: this._name,
      roomNumber: this._roomNumber,
      type: this._type,
      capacity: this._capacity,
      status: this._status,
      color: this._color,
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
      case 'RoomCreated':
        this.applyRoomCreated(event.data as unknown as RoomCreatedData);
        break;
      case 'RoomUpdated':
        this.applyRoomUpdated(event.data as unknown as RoomUpdatedData);
        break;
      case 'RoomStatusChanged':
        this.applyRoomStatusChanged(event.data as unknown as RoomStatusChangedData);
        break;
      default:
        console.warn(`Unknown event type: ${event.type}`);
    }
  }

  private applyRoomCreated(data: RoomCreatedData): void {
    this._name = data.name;
    this._roomNumber = data.roomNumber;
    this._type = data.type;
    this._capacity = data.capacity;
    this._status = 'AVAILABLE';
    this._color = data.color || '#3b82f6';
  }

  private applyRoomUpdated(data: RoomUpdatedData): void {
    if (data.name !== undefined) this._name = data.name;
    if (data.roomNumber !== undefined) this._roomNumber = data.roomNumber;
    if (data.type !== undefined) this._type = data.type;
    if (data.capacity !== undefined) this._capacity = data.capacity;
    if (data.color !== undefined) this._color = data.color;
  }

  private applyRoomStatusChanged(data: RoomStatusChangedData): void {
    this._status = data.status;
  }

  // ============ COMMANDS ============

  /**
   * Create a new room
   * @throws Error if room already exists
   */
  static create(
    id: string,
    details: RoomDetails
  ): { aggregate: RoomAggregate; event: DomainEvent } {
    const aggregate = new RoomAggregate(id);

    const event: DomainEvent = {
      type: 'RoomCreated',
      data: {
        roomId: id,
        name: details.name,
        roomNumber: details.roomNumber,
        type: details.type,
        capacity: details.capacity,
        color: details.color || '#3b82f6',
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    // Apply immediately so aggregate reflects new state
    aggregate.apply(event);

    return { aggregate, event };
  }

  /**
   * Update the room details
   */
  update(updates: Partial<RoomDetails>): DomainEvent {
    const event: DomainEvent = {
      type: 'RoomUpdated',
      data: {
        roomId: this.id,
        ...updates,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    // Apply immediately so aggregate reflects new state
    this.apply(event);

    return event;
  }

  /**
   * Change the room status
   */
  changeStatus(status: RoomStatus, reason?: string): DomainEvent {
    const event: DomainEvent = {
      type: 'RoomStatusChanged',
      data: {
        roomId: this.id,
        status,
        previousStatus: this._status,
        reason,
        changedAt: new Date().toISOString(),
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    // Apply immediately so aggregate reflects new state
    this.apply(event);

    return event;
  }
}

// ============ TYPE DEFINITIONS ============

interface RoomCreatedData {
  roomId: string;
  name: string;
  roomNumber: string;
  type: RoomType;
  capacity: number;
  color?: string;
}

interface RoomUpdatedData {
  roomId: string;
  name?: string;
  roomNumber?: string;
  type?: RoomType;
  capacity?: number;
  color?: string;
}

interface RoomStatusChangedData {
  roomId: string;
  status: RoomStatus;
  previousStatus: RoomStatus;
  reason?: string;
  changedAt: string;
}

export interface RoomDetails {
  name: string;
  roomNumber: string;
  type: RoomType;
  capacity: number;
  color?: string;
}
