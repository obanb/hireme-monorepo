/**
 * WellnessTherapist Aggregate
 */
import { StoredEvent, DomainEvent } from './event-store';

export interface WellnessTherapistState {
  id: string;
  code: string | null;
  name: string | null;
  serviceTypesBitMask: number;
  isVirtual: boolean;
  isActive: boolean;
}

export class WellnessTherapistAggregate {
  public readonly id: string;
  public version: number = 0;

  private _code: string | null = null;
  private _name: string | null = null;
  private _serviceTypesBitMask: number = 0;
  private _isVirtual: boolean = false;
  private _isActive: boolean = true;

  constructor(id: string) {
    this.id = id;
  }

  get state(): WellnessTherapistState {
    return {
      id: this.id,
      code: this._code,
      name: this._name,
      serviceTypesBitMask: this._serviceTypesBitMask,
      isVirtual: this._isVirtual,
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
      case 'WellnessTherapistCreated':
        this.applyCreated(event.data as unknown as WellnessTherapistCreatedData);
        break;
      case 'WellnessTherapistUpdated':
        this.applyUpdated(event.data as unknown as WellnessTherapistUpdatedData);
        break;
      case 'WellnessTherapistDeleted':
        this._isActive = false;
        break;
    }
  }

  private applyCreated(data: WellnessTherapistCreatedData): void {
    this._code = data.code;
    this._name = data.name;
    this._serviceTypesBitMask = data.serviceTypesBitMask ?? 0;
    this._isVirtual = data.isVirtual ?? false;
    this._isActive = true;
  }

  private applyUpdated(data: WellnessTherapistUpdatedData): void {
    if (data.code !== undefined) this._code = data.code;
    if (data.name !== undefined) this._name = data.name;
    if (data.serviceTypesBitMask !== undefined) this._serviceTypesBitMask = data.serviceTypesBitMask;
    if (data.isVirtual !== undefined) this._isVirtual = data.isVirtual;
    if (data.isActive !== undefined) this._isActive = data.isActive;
  }

  static create(id: string, details: WellnessTherapistDetails): { aggregate: WellnessTherapistAggregate; event: DomainEvent } {
    const aggregate = new WellnessTherapistAggregate(id);
    const event: DomainEvent = {
      type: 'WellnessTherapistCreated',
      data: { therapistId: id, ...details },
      metadata: { timestamp: new Date().toISOString() },
    };
    aggregate.apply(event);
    return { aggregate, event };
  }

  update(updates: Partial<WellnessTherapistDetails> & { isActive?: boolean }): DomainEvent {
    const event: DomainEvent = {
      type: 'WellnessTherapistUpdated',
      data: { therapistId: this.id, ...updates },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }

  delete(): DomainEvent {
    const event: DomainEvent = {
      type: 'WellnessTherapistDeleted',
      data: { therapistId: this.id, deletedAt: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }
}

interface WellnessTherapistCreatedData {
  therapistId: string;
  code: string;
  name: string;
  serviceTypesBitMask?: number;
  isVirtual?: boolean;
}

interface WellnessTherapistUpdatedData {
  therapistId: string;
  code?: string;
  name?: string;
  serviceTypesBitMask?: number;
  isVirtual?: boolean;
  isActive?: boolean;
}

export interface WellnessTherapistDetails {
  code: string;
  name: string;
  serviceTypesBitMask?: number;
  isVirtual?: boolean;
}
