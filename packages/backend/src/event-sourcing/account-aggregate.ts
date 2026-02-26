/**
 * Account Aggregate
 *
 * Represents a financial account linked to a reservation.
 * Tracks totalPrice and payedPrice.
 */
import { StoredEvent, DomainEvent } from './event-store';

export interface AccountState {
  streamId: string;
  reservationId: string | null;
  totalPrice: number;
  payedPrice: number;
  currency: string | null;
}

export interface AccountDetails {
  reservationId: string;
  totalPrice: number;
  payedPrice: number;
  currency?: string;
}

export class AccountAggregate {
  public readonly id: string; // UUID stream id
  public version: number = 0;

  private _reservationId: string | null = null;
  private _totalPrice: number = 0;
  private _payedPrice: number = 0;
  private _currency: string | null = null;

  constructor(id: string) {
    this.id = id;
  }

  get state(): AccountState {
    return {
      streamId: this.id,
      reservationId: this._reservationId,
      totalPrice: this._totalPrice,
      payedPrice: this._payedPrice,
      currency: this._currency,
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
      case 'AccountCreated':
        this.applyAccountCreated(event.data as unknown as AccountCreatedData);
        break;
      default:
        console.warn(`Unknown account event type: ${event.type}`);
    }
  }

  private applyAccountCreated(data: AccountCreatedData): void {
    this._reservationId = data.reservationId;
    this._totalPrice = data.totalPrice;
    this._payedPrice = data.payedPrice;
    this._currency = data.currency || null;
  }

  static create(
    streamId: string,
    details: AccountDetails
  ): { aggregate: AccountAggregate; event: DomainEvent } {
    const aggregate = new AccountAggregate(streamId);

    const event: DomainEvent = {
      type: 'AccountCreated',
      data: {
        streamId,
        reservationId: details.reservationId,
        totalPrice: details.totalPrice,
        payedPrice: details.payedPrice,
        currency: details.currency || null,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    aggregate.apply(event);

    return { aggregate, event };
  }
}

interface AccountCreatedData {
  streamId: string;
  reservationId: string;
  totalPrice: number;
  payedPrice: number;
  currency: string | null;
}
