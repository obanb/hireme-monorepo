/**
 * WellnessRoomType Aggregate
 */
import { StoredEvent, DomainEvent } from './event-store';

export interface WellnessRoomTypeState {
  id: string;
  name: string | null;
  bit: number;
  maskValue: number;
  isActive: boolean;
}

export class WellnessRoomTypeAggregate {
  public readonly id: string;
  public version: number = 0;

  private _name: string | null = null;
  private _bit: number = 0;
  private _maskValue: number = 1;
  private _isActive: boolean = true;

  constructor(id: string) {
    this.id = id;
  }

  get state(): WellnessRoomTypeState {
    return {
      id: this.id,
      name: this._name,
      bit: this._bit,
      maskValue: this._maskValue,
      isActive: this._isActive,
    };
  }

  loadFromHistory(events: StoredEvent[]): void {
    for (const event of events) {
      this.apply(event);
      this.version = event.version;
    }
  }

  private apply(event: StoredEvent | DomainEvent): void {
    switch (event.type) {
      case 'WellnessRoomTypeCreated':
        this.applyCreated(event.data as unknown as WellnessRoomTypeCreatedData);
        break;
      case 'WellnessRoomTypeUpdated':
        this.applyUpdated(event.data as unknown as WellnessRoomTypeUpdatedData);
        break;
      case 'WellnessRoomTypeDeleted':
        this._isActive = false;
        break;
    }
  }

  private applyCreated(data: WellnessRoomTypeCreatedData): void {
    this._name = data.name;
    this._bit = data.bit;
    this._maskValue = data.maskValue;
    this._isActive = true;
  }

  private applyUpdated(data: WellnessRoomTypeUpdatedData): void {
    if (data.name !== undefined) this._name = data.name;
    if (data.bit !== undefined) this._bit = data.bit;
    if (data.maskValue !== undefined) this._maskValue = data.maskValue;
    if (data.isActive !== undefined) this._isActive = data.isActive;
  }

  static create(id: string, details: WellnessRoomTypeDetails): { aggregate: WellnessRoomTypeAggregate; event: DomainEvent } {
    const aggregate = new WellnessRoomTypeAggregate(id);
    const event: DomainEvent = {
      type: 'WellnessRoomTypeCreated',
      data: { roomTypeId: id, ...details },
      metadata: { timestamp: new Date().toISOString() },
    };
    aggregate.apply(event);
    return { aggregate, event };
  }

  update(updates: Partial<WellnessRoomTypeDetails> & { isActive?: boolean }): DomainEvent {
    const event: DomainEvent = {
      type: 'WellnessRoomTypeUpdated',
      data: { roomTypeId: this.id, ...updates },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }

  delete(): DomainEvent {
    const event: DomainEvent = {
      type: 'WellnessRoomTypeDeleted',
      data: { roomTypeId: this.id, deletedAt: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }
}

interface WellnessRoomTypeCreatedData {
  roomTypeId: string;
  name: string;
  bit: number;
  maskValue: number;
}

interface WellnessRoomTypeUpdatedData {
  roomTypeId: string;
  name?: string;
  bit?: number;
  maskValue?: number;
  isActive?: boolean;
}

export interface WellnessRoomTypeDetails {
  name: string;
  bit: number;
  maskValue: number;
}
