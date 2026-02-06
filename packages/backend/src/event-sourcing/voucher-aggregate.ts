/**
 * Voucher Aggregate
 */
import { StoredEvent, DomainEvent } from './event-store';

export interface CustomerData {
  name: string | null;
  street: string | null;
  houseNumber: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  tel: string | null;
  company: string | null;
  cin: string | null;
  tin: string | null;
}

export interface GiftData {
  name: string | null;
  street: string | null;
  houseNumber: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  tel: string | null;
}

export interface VoucherState {
  id: string;
  code: string | null;
  number: string;
  hotel: number;
  lang: string;
  createdAt: string | null;
  usedAt: string | null;
  canceledAt: string | null;
  paidAt: string | null;
  variableSymbol: number;
  active: boolean;
  price: number;
  purchasePrice: number;
  currency: string;
  validity: string;
  paymentType: string;
  deliveryType: string;
  deliveryPrice: number;
  note: string | null;
  format: string;
  gift: string | null;
  giftMessage: string | null;
  usedIn: string | null;
  reservationNumber: string | null;
  valueTotal: number;
  valueRemaining: number;
  valueUsed: number;
  applicableInBookolo: boolean;
  isPrivateType: boolean;
  isFreeType: boolean;
  customerData: CustomerData;
  giftData: GiftData;
}

export class VoucherAggregate {
  public readonly id: string;
  public version: number = 0;

  private _code: string | null = null;
  private _number: string = '';
  private _hotel: number = 0;
  private _lang: string = 'cs';
  private _createdAt: string | null = null;
  private _usedAt: string | null = null;
  private _canceledAt: string | null = null;
  private _paidAt: string | null = null;
  private _variableSymbol: number = 0;
  private _active: boolean = true;
  private _price: number = 0;
  private _purchasePrice: number = 0;
  private _currency: string = 'CZK';
  private _validity: string = '';
  private _paymentType: string = 'payment-online-card';
  private _deliveryType: string = 'email';
  private _deliveryPrice: number = 0;
  private _note: string | null = null;
  private _format: string = 'DL';
  private _gift: string | null = null;
  private _giftMessage: string | null = null;
  private _usedIn: string | null = null;
  private _reservationNumber: string | null = null;
  private _valueTotal: number = 0;
  private _valueRemaining: number = 0;
  private _valueUsed: number = 0;
  private _applicableInBookolo: boolean = false;
  private _isPrivateType: boolean = false;
  private _isFreeType: boolean = false;
  private _customerData: CustomerData = {
    name: null, street: null, houseNumber: null, city: null, postalCode: null,
    country: null, email: null, tel: null, company: null, cin: null, tin: null,
  };
  private _giftData: GiftData = {
    name: null, street: null, houseNumber: null, city: null, postalCode: null,
    country: null, email: null, tel: null,
  };

  constructor(id: string) {
    this.id = id;
  }

  get state(): VoucherState {
    return {
      id: this.id,
      code: this._code,
      number: this._number,
      hotel: this._hotel,
      lang: this._lang,
      createdAt: this._createdAt,
      usedAt: this._usedAt,
      canceledAt: this._canceledAt,
      paidAt: this._paidAt,
      variableSymbol: this._variableSymbol,
      active: this._active,
      price: this._price,
      purchasePrice: this._purchasePrice,
      currency: this._currency,
      validity: this._validity,
      paymentType: this._paymentType,
      deliveryType: this._deliveryType,
      deliveryPrice: this._deliveryPrice,
      note: this._note,
      format: this._format,
      gift: this._gift,
      giftMessage: this._giftMessage,
      usedIn: this._usedIn,
      reservationNumber: this._reservationNumber,
      valueTotal: this._valueTotal,
      valueRemaining: this._valueRemaining,
      valueUsed: this._valueUsed,
      applicableInBookolo: this._applicableInBookolo,
      isPrivateType: this._isPrivateType,
      isFreeType: this._isFreeType,
      customerData: { ...this._customerData },
      giftData: { ...this._giftData },
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
      case 'VoucherCreated':
        this.applyCreated(event.data as unknown as VoucherCreatedData);
        break;
      case 'VoucherUpdated':
        this.applyUpdated(event.data as unknown as VoucherUpdatedData);
        break;
      case 'VoucherCanceled':
        this.applyCanceled(event.data as unknown as VoucherCanceledData);
        break;
      case 'VoucherUsed':
        this.applyUsed(event.data as unknown as VoucherUsedData);
        break;
      case 'VoucherPaid':
        this.applyPaid(event.data as unknown as VoucherPaidData);
        break;
      case 'VoucherDeleted':
        this._active = false;
        break;
    }
  }

  private applyCreated(data: VoucherCreatedData): void {
    this._code = data.code ?? null;
    this._number = data.number;
    this._hotel = data.hotel ?? 0;
    this._lang = data.lang ?? 'cs';
    this._createdAt = data.createdAt;
    this._variableSymbol = data.variableSymbol;
    this._active = true;
    this._price = data.price;
    this._purchasePrice = data.purchasePrice ?? data.price;
    this._currency = data.currency ?? 'CZK';
    this._validity = data.validity;
    this._paymentType = data.paymentType ?? 'payment-online-card';
    this._deliveryType = data.deliveryType ?? 'email';
    this._deliveryPrice = data.deliveryPrice ?? 0;
    this._note = data.note ?? null;
    this._format = data.format ?? 'DL';
    this._gift = data.gift ?? null;
    this._giftMessage = data.giftMessage ?? null;
    this._valueTotal = data.price;
    this._valueRemaining = data.price;
    this._valueUsed = 0;
    this._applicableInBookolo = data.applicableInBookolo ?? false;
    this._isPrivateType = data.isPrivateType ?? false;
    this._isFreeType = data.isFreeType ?? data.price === 0;
    if (data.customerData) {
      this._customerData = { ...this._customerData, ...data.customerData };
    }
    if (data.giftData) {
      this._giftData = { ...this._giftData, ...data.giftData };
    }
  }

  private applyUpdated(data: VoucherUpdatedData): void {
    if (data.code !== undefined) this._code = data.code;
    if (data.price !== undefined) this._price = data.price;
    if (data.purchasePrice !== undefined) this._purchasePrice = data.purchasePrice;
    if (data.currency !== undefined) this._currency = data.currency;
    if (data.validity !== undefined) this._validity = data.validity;
    if (data.paymentType !== undefined) this._paymentType = data.paymentType;
    if (data.deliveryType !== undefined) this._deliveryType = data.deliveryType;
    if (data.deliveryPrice !== undefined) this._deliveryPrice = data.deliveryPrice;
    if (data.note !== undefined) this._note = data.note;
    if (data.format !== undefined) this._format = data.format;
    if (data.gift !== undefined) this._gift = data.gift;
    if (data.giftMessage !== undefined) this._giftMessage = data.giftMessage;
    if (data.active !== undefined) this._active = data.active;
    if (data.applicableInBookolo !== undefined) this._applicableInBookolo = data.applicableInBookolo;
    if (data.isPrivateType !== undefined) this._isPrivateType = data.isPrivateType;
    if (data.customerData) {
      this._customerData = { ...this._customerData, ...data.customerData };
    }
    if (data.giftData) {
      this._giftData = { ...this._giftData, ...data.giftData };
    }
  }

  private applyCanceled(data: VoucherCanceledData): void {
    this._active = false;
    this._canceledAt = data.canceledAt;
  }

  private applyUsed(data: VoucherUsedData): void {
    const amount = data.amount;
    this._valueUsed += amount;
    this._valueRemaining -= amount;
    if (this._valueRemaining < 0) this._valueRemaining = 0;
    if (!this._usedAt) this._usedAt = data.usedAt;
    if (data.reservationNumber) this._reservationNumber = data.reservationNumber;
    if (data.usedIn) this._usedIn = data.usedIn;
    if (this._valueRemaining === 0) this._active = false;
  }

  private applyPaid(data: VoucherPaidData): void {
    this._paidAt = data.paidAt;
  }

  static create(id: string, details: VoucherDetails): { aggregate: VoucherAggregate; event: DomainEvent } {
    const aggregate = new VoucherAggregate(id);
    const timestamp = new Date().toISOString();
    const voucherNumber = generateVoucherNumber();
    const variableSymbol = generateVariableSymbol();

    const event: DomainEvent = {
      type: 'VoucherCreated',
      data: {
        voucherId: id,
        number: voucherNumber,
        variableSymbol,
        createdAt: timestamp,
        ...details,
      },
      metadata: { timestamp },
    };
    aggregate.apply(event);
    return { aggregate, event };
  }

  update(updates: Partial<VoucherDetails> & { active?: boolean }): DomainEvent {
    const event: DomainEvent = {
      type: 'VoucherUpdated',
      data: { voucherId: this.id, ...updates },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }

  cancel(reason?: string): DomainEvent {
    const event: DomainEvent = {
      type: 'VoucherCanceled',
      data: {
        voucherId: this.id,
        canceledAt: new Date().toISOString(),
        reason,
      },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }

  use(amount: number, reservationNumber?: string, usedIn?: string): DomainEvent {
    if (amount > this._valueRemaining) {
      throw new Error(`Cannot use ${amount}, only ${this._valueRemaining} remaining`);
    }
    const event: DomainEvent = {
      type: 'VoucherUsed',
      data: {
        voucherId: this.id,
        amount,
        usedAt: new Date().toISOString(),
        reservationNumber,
        usedIn,
      },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }

  markPaid(): DomainEvent {
    const event: DomainEvent = {
      type: 'VoucherPaid',
      data: {
        voucherId: this.id,
        paidAt: new Date().toISOString(),
      },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }

  delete(): DomainEvent {
    const event: DomainEvent = {
      type: 'VoucherDeleted',
      data: { voucherId: this.id, deletedAt: new Date().toISOString() },
      metadata: { timestamp: new Date().toISOString() },
    };
    this.apply(event);
    return event;
  }
}

// Helper to generate random voucher number
function generateVoucherNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to generate variable symbol
function generateVariableSymbol(): number {
  return Math.floor(Math.random() * 90000000) + 10000000;
}

interface VoucherCreatedData {
  voucherId: string;
  code?: string;
  number: string;
  hotel?: number;
  lang?: string;
  createdAt: string;
  variableSymbol: number;
  price: number;
  purchasePrice?: number;
  currency?: string;
  validity: string;
  paymentType?: string;
  deliveryType?: string;
  deliveryPrice?: number;
  note?: string;
  format?: string;
  gift?: string;
  giftMessage?: string;
  applicableInBookolo?: boolean;
  isPrivateType?: boolean;
  isFreeType?: boolean;
  customerData?: Partial<CustomerData>;
  giftData?: Partial<GiftData>;
}

interface VoucherUpdatedData {
  voucherId: string;
  code?: string;
  price?: number;
  purchasePrice?: number;
  currency?: string;
  validity?: string;
  paymentType?: string;
  deliveryType?: string;
  deliveryPrice?: number;
  note?: string;
  format?: string;
  gift?: string;
  giftMessage?: string;
  active?: boolean;
  applicableInBookolo?: boolean;
  isPrivateType?: boolean;
  customerData?: Partial<CustomerData>;
  giftData?: Partial<GiftData>;
}

interface VoucherCanceledData {
  voucherId: string;
  canceledAt: string;
  reason?: string;
}

interface VoucherUsedData {
  voucherId: string;
  amount: number;
  usedAt: string;
  reservationNumber?: string;
  usedIn?: string;
}

interface VoucherPaidData {
  voucherId: string;
  paidAt: string;
}

export interface VoucherDetails {
  code?: string;
  hotel?: number;
  lang?: string;
  price: number;
  purchasePrice?: number;
  currency?: string;
  validity: string;
  paymentType?: string;
  deliveryType?: string;
  deliveryPrice?: number;
  note?: string;
  format?: string;
  gift?: string;
  giftMessage?: string;
  applicableInBookolo?: boolean;
  isPrivateType?: boolean;
  isFreeType?: boolean;
  customerData?: Partial<CustomerData>;
  giftData?: Partial<GiftData>;
}
