/**
 * Guest Aggregate
 */
import { StoredEvent, DomainEvent } from './event-store';

export interface GuestAddress {
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface GuestState {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  birthPlace: string | null;
  nationality: string | null;
  citizenship: string | null;
  passportNumber: string | null;
  visaNumber: string | null;
  purposeOfStay: string | null;
  homeAddress: GuestAddress;
  notes: string | null;
  isActive: boolean;
}

export class GuestAggregate {
  public readonly id: string;
  public version: number = 0;

  private _email: string = '';
  private _firstName: string | null = null;
  private _lastName: string | null = null;
  private _phone: string | null = null;
  private _dateOfBirth: string | null = null;
  private _birthPlace: string | null = null;
  private _nationality: string | null = null;
  private _citizenship: string | null = null;
  private _passportNumber: string | null = null;
  private _visaNumber: string | null = null;
  private _purposeOfStay: string | null = null;
  private _homeAddress: GuestAddress = { street: null, city: null, postalCode: null, country: null };
  private _notes: string | null = null;
  private _isActive: boolean = true;

  constructor(id: string) {
    this.id = id;
  }

  get state(): GuestState {
    return {
      id: this.id,
      email: this._email,
      firstName: this._firstName,
      lastName: this._lastName,
      phone: this._phone,
      dateOfBirth: this._dateOfBirth,
      birthPlace: this._birthPlace,
      nationality: this._nationality,
      citizenship: this._citizenship,
      passportNumber: this._passportNumber,
      visaNumber: this._visaNumber,
      purposeOfStay: this._purposeOfStay,
      homeAddress: { ...this._homeAddress },
      notes: this._notes,
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
      case 'GuestCreated':
        this.applyCreated(event.data as unknown as GuestCreatedData);
        break;
      case 'GuestUpdated':
        this.applyUpdated(event.data as unknown as GuestUpdatedData);
        break;
      case 'GuestDeleted':
        this._isActive = false;
        break;
    }
  }

  private applyCreated(data: GuestCreatedData): void {
    this._email = data.email;
    this._firstName = data.firstName ?? null;
    this._lastName = data.lastName ?? null;
    this._phone = data.phone ?? null;
    this._dateOfBirth = data.dateOfBirth ?? null;
    this._birthPlace = data.birthPlace ?? null;
    this._nationality = data.nationality ?? null;
    this._citizenship = data.citizenship ?? null;
    this._passportNumber = data.passportNumber ?? null;
    this._visaNumber = data.visaNumber ?? null;
    this._purposeOfStay = data.purposeOfStay ?? null;
    if (data.homeAddress) {
      this._homeAddress = { ...this._homeAddress, ...data.homeAddress };
    }
    this._notes = data.notes ?? null;
    this._isActive = true;
  }

  private applyUpdated(data: GuestUpdatedData): void {
    if (data.email !== undefined) this._email = data.email;
    if (data.firstName !== undefined) this._firstName = data.firstName;
    if (data.lastName !== undefined) this._lastName = data.lastName;
    if (data.phone !== undefined) this._phone = data.phone;
    if (data.dateOfBirth !== undefined) this._dateOfBirth = data.dateOfBirth;
    if (data.birthPlace !== undefined) this._birthPlace = data.birthPlace;
    if (data.nationality !== undefined) this._nationality = data.nationality;
    if (data.citizenship !== undefined) this._citizenship = data.citizenship;
    if (data.passportNumber !== undefined) this._passportNumber = data.passportNumber;
    if (data.visaNumber !== undefined) this._visaNumber = data.visaNumber;
    if (data.purposeOfStay !== undefined) this._purposeOfStay = data.purposeOfStay;
    if (data.homeAddress) {
      this._homeAddress = { ...this._homeAddress, ...data.homeAddress };
    }
    if (data.notes !== undefined) this._notes = data.notes;
  }

  static create(id: string, details: GuestDetails): { aggregate: GuestAggregate; event: DomainEvent } {
    const aggregate = new GuestAggregate(id);
    const timestamp = new Date().toISOString();

    const event: DomainEvent = {
      type: 'GuestCreated',
      data: {
        guestId: id,
        createdAt: timestamp,
        ...details,
      },
      metadata: { timestamp },
    };
    aggregate.apply(event);
    return { aggregate, event };
  }

  update(updates: Partial<GuestDetails>): DomainEvent {
    const event: DomainEvent = {
      type: 'GuestUpdated',
      data: { guestId: this.id, ...updates },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }

  delete(): DomainEvent {
    const event: DomainEvent = {
      type: 'GuestDeleted',
      data: { guestId: this.id, deletedAt: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }
}

interface GuestCreatedData {
  guestId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  birthPlace?: string;
  nationality?: string;
  citizenship?: string;
  passportNumber?: string;
  visaNumber?: string;
  purposeOfStay?: string;
  homeAddress?: Partial<GuestAddress>;
  notes?: string;
  createdAt: string;
}

interface GuestUpdatedData {
  guestId: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  birthPlace?: string | null;
  nationality?: string | null;
  citizenship?: string | null;
  passportNumber?: string | null;
  visaNumber?: string | null;
  purposeOfStay?: string | null;
  homeAddress?: Partial<GuestAddress>;
  notes?: string | null;
}

export interface GuestDetails {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  birthPlace?: string;
  nationality?: string;
  citizenship?: string;
  passportNumber?: string;
  visaNumber?: string;
  purposeOfStay?: string;
  homeAddress?: Partial<GuestAddress>;
  notes?: string;
}
