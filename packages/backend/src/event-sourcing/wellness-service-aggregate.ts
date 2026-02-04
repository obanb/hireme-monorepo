/**
 * WellnessService Aggregate
 */
import { StoredEvent, DomainEvent } from './event-store';

export interface WellnessServiceState {
  id: string;
  name: string | null;
  priceNormal: number;
  priceOBE: number | null;
  priceOVE: number | null;
  vatCharge: number;
  serviceTypeBitMask: number;
  duration: number;
  pauseBefore: number;
  pauseAfter: number;
  needsTherapist: boolean;
  needsRoom: boolean;
  isActive: boolean;
}

export class WellnessServiceAggregate {
  public readonly id: string;
  public version: number = 0;

  private _name: string | null = null;
  private _priceNormal: number = 0;
  private _priceOBE: number | null = null;
  private _priceOVE: number | null = null;
  private _vatCharge: number = 21;
  private _serviceTypeBitMask: number = 0;
  private _duration: number = 60;
  private _pauseBefore: number = 0;
  private _pauseAfter: number = 0;
  private _needsTherapist: boolean = true;
  private _needsRoom: boolean = true;
  private _isActive: boolean = true;

  constructor(id: string) {
    this.id = id;
  }

  get state(): WellnessServiceState {
    return {
      id: this.id,
      name: this._name,
      priceNormal: this._priceNormal,
      priceOBE: this._priceOBE,
      priceOVE: this._priceOVE,
      vatCharge: this._vatCharge,
      serviceTypeBitMask: this._serviceTypeBitMask,
      duration: this._duration,
      pauseBefore: this._pauseBefore,
      pauseAfter: this._pauseAfter,
      needsTherapist: this._needsTherapist,
      needsRoom: this._needsRoom,
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
      case 'WellnessServiceCreated':
        this.applyCreated(event.data as unknown as WellnessServiceCreatedData);
        break;
      case 'WellnessServiceUpdated':
        this.applyUpdated(event.data as unknown as WellnessServiceUpdatedData);
        break;
      case 'WellnessServiceDeleted':
        this._isActive = false;
        break;
    }
  }

  private applyCreated(data: WellnessServiceCreatedData): void {
    this._name = data.name;
    this._priceNormal = data.priceNormal;
    this._priceOBE = data.priceOBE ?? null;
    this._priceOVE = data.priceOVE ?? null;
    this._vatCharge = data.vatCharge;
    this._serviceTypeBitMask = data.serviceTypeBitMask ?? 0;
    this._duration = data.duration;
    this._pauseBefore = data.pauseBefore ?? 0;
    this._pauseAfter = data.pauseAfter ?? 0;
    this._needsTherapist = data.needsTherapist ?? true;
    this._needsRoom = data.needsRoom ?? true;
    this._isActive = true;
  }

  private applyUpdated(data: WellnessServiceUpdatedData): void {
    if (data.name !== undefined) this._name = data.name;
    if (data.priceNormal !== undefined) this._priceNormal = data.priceNormal;
    if (data.priceOBE !== undefined) this._priceOBE = data.priceOBE;
    if (data.priceOVE !== undefined) this._priceOVE = data.priceOVE;
    if (data.vatCharge !== undefined) this._vatCharge = data.vatCharge;
    if (data.serviceTypeBitMask !== undefined) this._serviceTypeBitMask = data.serviceTypeBitMask;
    if (data.duration !== undefined) this._duration = data.duration;
    if (data.pauseBefore !== undefined) this._pauseBefore = data.pauseBefore;
    if (data.pauseAfter !== undefined) this._pauseAfter = data.pauseAfter;
    if (data.needsTherapist !== undefined) this._needsTherapist = data.needsTherapist;
    if (data.needsRoom !== undefined) this._needsRoom = data.needsRoom;
    if (data.isActive !== undefined) this._isActive = data.isActive;
  }

  static create(id: string, details: WellnessServiceDetails): { aggregate: WellnessServiceAggregate; event: DomainEvent } {
    const aggregate = new WellnessServiceAggregate(id);
    const event: DomainEvent = {
      type: 'WellnessServiceCreated',
      data: { serviceId: id, ...details },
      metadata: { timestamp: new Date().toISOString() },
    };
    aggregate.apply(event);
    return { aggregate, event };
  }

  update(updates: Partial<WellnessServiceDetails> & { isActive?: boolean }): DomainEvent {
    const event: DomainEvent = {
      type: 'WellnessServiceUpdated',
      data: { serviceId: this.id, ...updates },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }

  delete(): DomainEvent {
    const event: DomainEvent = {
      type: 'WellnessServiceDeleted',
      data: { serviceId: this.id, deletedAt: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }
}

interface WellnessServiceCreatedData {
  serviceId: string;
  name: string;
  priceNormal: number;
  priceOBE?: number;
  priceOVE?: number;
  vatCharge: number;
  serviceTypeBitMask?: number;
  duration: number;
  pauseBefore?: number;
  pauseAfter?: number;
  needsTherapist?: boolean;
  needsRoom?: boolean;
}

interface WellnessServiceUpdatedData {
  serviceId: string;
  name?: string;
  priceNormal?: number;
  priceOBE?: number;
  priceOVE?: number;
  vatCharge?: number;
  serviceTypeBitMask?: number;
  duration?: number;
  pauseBefore?: number;
  pauseAfter?: number;
  needsTherapist?: boolean;
  needsRoom?: boolean;
  isActive?: boolean;
}

export interface WellnessServiceDetails {
  name: string;
  priceNormal: number;
  priceOBE?: number;
  priceOVE?: number;
  vatCharge: number;
  serviceTypeBitMask?: number;
  duration: number;
  pauseBefore?: number;
  pauseAfter?: number;
  needsTherapist?: boolean;
  needsRoom?: boolean;
}
