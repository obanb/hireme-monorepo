/**
 * WellnessBooking Aggregate
 */
import { StoredEvent, DomainEvent } from './event-store';

export type WellnessBookingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface WellnessBookingState {
  id: string;
  reservationId: string | null;
  guestName: string | null;
  serviceId: string | null;
  therapistId: string | null;
  roomTypeId: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  endTime: string | null;
  status: WellnessBookingStatus;
  notes: string | null;
  price: number;
}

export class WellnessBookingAggregate {
  public readonly id: string;
  public version: number = 0;

  private _reservationId: string | null = null;
  private _guestName: string | null = null;
  private _serviceId: string | null = null;
  private _therapistId: string | null = null;
  private _roomTypeId: string | null = null;
  private _scheduledDate: string | null = null;
  private _scheduledTime: string | null = null;
  private _endTime: string | null = null;
  private _status: WellnessBookingStatus = 'SCHEDULED';
  private _notes: string | null = null;
  private _price: number = 0;

  constructor(id: string) {
    this.id = id;
  }

  get state(): WellnessBookingState {
    return {
      id: this.id,
      reservationId: this._reservationId,
      guestName: this._guestName,
      serviceId: this._serviceId,
      therapistId: this._therapistId,
      roomTypeId: this._roomTypeId,
      scheduledDate: this._scheduledDate,
      scheduledTime: this._scheduledTime,
      endTime: this._endTime,
      status: this._status,
      notes: this._notes,
      price: this._price,
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
      case 'WellnessBookingCreated':
        this.applyCreated(event.data as unknown as WellnessBookingCreatedData);
        break;
      case 'WellnessBookingUpdated':
        this.applyUpdated(event.data as unknown as WellnessBookingUpdatedData);
        break;
      case 'WellnessBookingCancelled':
        this._status = 'CANCELLED';
        break;
    }
  }

  private applyCreated(data: WellnessBookingCreatedData): void {
    this._reservationId = data.reservationId ?? null;
    this._guestName = data.guestName;
    this._serviceId = data.serviceId;
    this._therapistId = data.therapistId ?? null;
    this._roomTypeId = data.roomTypeId ?? null;
    this._scheduledDate = data.scheduledDate;
    this._scheduledTime = data.scheduledTime;
    this._endTime = data.endTime;
    this._notes = data.notes ?? null;
    this._price = data.price;
    this._status = 'SCHEDULED';
  }

  private applyUpdated(data: WellnessBookingUpdatedData): void {
    if (data.therapistId !== undefined) this._therapistId = data.therapistId;
    if (data.roomTypeId !== undefined) this._roomTypeId = data.roomTypeId;
    if (data.scheduledDate !== undefined) this._scheduledDate = data.scheduledDate;
    if (data.scheduledTime !== undefined) this._scheduledTime = data.scheduledTime;
    if (data.endTime !== undefined) this._endTime = data.endTime;
    if (data.notes !== undefined) this._notes = data.notes;
    if (data.status !== undefined) this._status = data.status;
  }

  static create(id: string, details: WellnessBookingDetails): { aggregate: WellnessBookingAggregate; event: DomainEvent } {
    const aggregate = new WellnessBookingAggregate(id);
    const event: DomainEvent = {
      type: 'WellnessBookingCreated',
      data: { bookingId: id, ...details },
      metadata: { timestamp: new Date().toISOString() },
    };
    aggregate.apply(event);
    return { aggregate, event };
  }

  update(updates: Partial<WellnessBookingUpdateDetails>): DomainEvent {
    const event: DomainEvent = {
      type: 'WellnessBookingUpdated',
      data: { bookingId: this.id, ...updates },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }

  cancel(reason?: string): DomainEvent {
    const event: DomainEvent = {
      type: 'WellnessBookingCancelled',
      data: { bookingId: this.id, reason, cancelledAt: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }
}

interface WellnessBookingCreatedData {
  bookingId: string;
  reservationId?: string;
  guestName: string;
  serviceId: string;
  therapistId?: string;
  roomTypeId?: string;
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  notes?: string;
  price: number;
}

interface WellnessBookingUpdatedData {
  bookingId: string;
  therapistId?: string;
  roomTypeId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  endTime?: string;
  notes?: string;
  status?: WellnessBookingStatus;
}

export interface WellnessBookingDetails {
  reservationId?: string;
  guestName: string;
  serviceId: string;
  therapistId?: string;
  roomTypeId?: string;
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  notes?: string;
  price: number;
}

export interface WellnessBookingUpdateDetails {
  therapistId?: string;
  roomTypeId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  endTime?: string;
  notes?: string;
  status?: WellnessBookingStatus;
}
