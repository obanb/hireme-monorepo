/**
 * Reservation Aggregate
 *
 * Encapsulates the business logic for reservations.
 * Reconstructs state from events and produces new events from commands.
 */
import { StoredEvent, DomainEvent } from './event-store';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface ReservationState {
  id: string;
  status: ReservationStatus;
  guestName: string | null;
  originId: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  totalAmount: number | null;
  currency: string | null;
  roomId: string | null;
  cancellationReason: string | null;
}

export class ReservationAggregate {
  public readonly id: string;
  public version: number = 0;

  private _status: ReservationStatus = 'PENDING';
  private _guestName: string | null = null;
  private _originId: string | null = null;
  private _checkInDate: string | null = null;
  private _checkOutDate: string | null = null;
  private _totalAmount: number | null = null;
  private _currency: string | null = null;
  private _roomId: string | null = null;
  private _cancellationReason: string | null = null;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Get the current state of the aggregate
   */
  get state(): ReservationState {
    return {
      id: this.id,
      status: this._status,
      guestName: this._guestName,
      originId: this._originId,
      checkInDate: this._checkInDate,
      checkOutDate: this._checkOutDate,
      totalAmount: this._totalAmount,
      currency: this._currency,
      roomId: this._roomId,
      cancellationReason: this._cancellationReason,
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
      case 'ReservationCreated':
        this.applyReservationCreated(event.data as unknown as ReservationCreatedData);
        break;
      case 'ReservationConfirmed':
        this.applyReservationConfirmed(event.data as unknown as ReservationConfirmedData);
        break;
      case 'ReservationCancelled':
        this.applyReservationCancelled(event.data as unknown as ReservationCancelledData);
        break;
      case 'RoomAssigned':
        this.applyRoomAssigned(event.data as unknown as RoomAssignedData);
        break;
      default:
        console.warn(`Unknown event type: ${event.type}`);
    }
  }

  private applyReservationCreated(data: ReservationCreatedData): void {
    this._status = 'PENDING';
    const booking = data.bookingDetails;
    if (booking) {
      this._originId = booking.originId || null;
      this._totalAmount = booking.totalAmount || null;
      this._currency = booking.currency || null;
      this._checkInDate = booking.arrivalTime || null;
      this._checkOutDate = booking.departureTime || null;
      this._roomId = booking.roomId || null;
      if (booking.customer) {
        this._guestName = `${booking.customer.firstName || ''} ${booking.customer.lastName || ''}`.trim() || null;
      }
    }
  }

  private applyReservationConfirmed(_data: ReservationConfirmedData): void {
    this._status = 'CONFIRMED';
  }

  private applyReservationCancelled(data: ReservationCancelledData): void {
    this._status = 'CANCELLED';
    this._cancellationReason = data.reason;
  }

  private applyRoomAssigned(data: RoomAssignedData): void {
    this._roomId = data.roomId;
  }

  // ============ COMMANDS ============

  /**
   * Create a new reservation
   * @throws Error if reservation already exists
   */
  static create(
    id: string,
    bookingDetails: BookingDetails
  ): { aggregate: ReservationAggregate; event: DomainEvent } {
    const aggregate = new ReservationAggregate(id);

    const event: DomainEvent = {
      type: 'ReservationCreated',
      data: {
        reservationId: id,
        bookingDetails,
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
   * Confirm the reservation
   * @throws Error if reservation is not pending or already confirmed/cancelled
   */
  confirm(confirmedBy?: string): DomainEvent {
    if (this._status === 'CONFIRMED') {
      throw new Error('Reservation is already confirmed');
    }

    if (this._status === 'CANCELLED') {
      throw new Error('Cannot confirm a cancelled reservation');
    }

    const event: DomainEvent = {
      type: 'ReservationConfirmed',
      data: {
        reservationId: this.id,
        confirmedAt: new Date().toISOString(),
        confirmedBy,
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
   * Cancel the reservation
   * @throws Error if reservation is already cancelled
   */
  cancel(reason: string): DomainEvent {
    if (this._status === 'CANCELLED') {
      throw new Error('Reservation is already cancelled');
    }

    const event: DomainEvent = {
      type: 'ReservationCancelled',
      data: {
        reservationId: this.id,
        reason,
        cancelledAt: new Date().toISOString(),
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
   * Assign a room to the reservation
   * @throws Error if reservation is cancelled
   */
  assignRoom(roomId: string): DomainEvent {
    if (this._status === 'CANCELLED') {
      throw new Error('Cannot assign room to a cancelled reservation');
    }

    const event: DomainEvent = {
      type: 'RoomAssigned',
      data: {
        reservationId: this.id,
        roomId,
        previousRoomId: this._roomId,
        assignedAt: new Date().toISOString(),
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

interface ReservationCreatedData {
  reservationId: string;
  bookingDetails?: BookingDetails;
}

interface ReservationConfirmedData {
  reservationId: string;
  confirmedAt: string;
  confirmedBy?: string;
}

interface ReservationCancelledData {
  reservationId: string;
  reason: string;
  cancelledAt: string;
}

interface RoomAssignedData {
  reservationId: string;
  roomId: string;
  previousRoomId: string | null;
  assignedAt: string;
}

export interface BookingDetails {
  originId?: string;
  totalAmount?: number;
  currency?: string;
  arrivalTime?: string;
  departureTime?: string;
  roomId?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
  };
}
