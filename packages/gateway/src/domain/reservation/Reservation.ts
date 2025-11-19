import { AggregateRoot } from '../shared/AggregateRoot';
import { DomainEvent } from '../shared/DomainEvent';
import {
  ReservationCreated,
  ReservationConfirmed,
  ReservationCancelled
} from './events';
import {
  CreateReservationCommand,
  ConfirmReservationCommand,
  CancelReservationCommand
} from './commands';

export class Reservation extends AggregateRoot {
  private hotelId: string;
  private guestName: string;
  private checkIn: Date;
  private checkOut: Date;
  private status: 'pending' | 'confirmed' | 'cancelled' = 'pending';

  private constructor(id: string) {
    super(id);
  }

  static create(command: CreateReservationCommand): Reservation {
    // Validate business rules
    if (!command.guestName || command.guestName.length < 2) {
      throw new Error('Guest name must be at least 2 characters');
    }

    if (command.checkIn >= command.checkOut) {
      throw new Error('Check-in date must be before check-out date');
    }

    if (command.checkIn < new Date()) {
      throw new Error('Check-in date cannot be in the past');
    }

    const reservation = new Reservation(command.reservationId);
    const event: ReservationCreated = {
      type: 'ReservationCreated',
      aggregateId: command.reservationId,
      version: 1,
      occurredAt: new Date(),
      hotelId: command.hotelId,
      guestName: command.guestName,
      checkIn: command.checkIn,
      checkOut: command.checkOut
    };

    reservation.addEvent(event);
    return reservation;
  }

  static fromEvents(events: DomainEvent[]): Reservation {
    if (events.length === 0) {
      throw new Error('Cannot create reservation from empty events');
    }

    const reservation = new Reservation(events[0].aggregateId);
    events.forEach(event => reservation.applyEvent(event));
    return reservation;
  }

  protected applyEvent(event: DomainEvent): void {
    switch (event.type) {
      case 'ReservationCreated':
        const createdEvent = event as ReservationCreated;
        this.hotelId = createdEvent.hotelId;
        this.guestName = createdEvent.guestName;
        this.checkIn = createdEvent.checkIn;
        this.checkOut = createdEvent.checkOut;
        this.status = 'pending';
        break;

      case 'ReservationConfirmed':
        this.status = 'confirmed';
        break;

      case 'ReservationCancelled':
        this.status = 'cancelled';
        break;
    }

    this.version = event.version;
  }

  confirm(command: ConfirmReservationCommand): ReservationConfirmed {
    if (this.status !== 'pending') {
      throw new Error(`Cannot confirm reservation with status: ${this.status}`);
    }

    const event: ReservationConfirmed = {
      type: 'ReservationConfirmed',
      aggregateId: this.id,
      version: this.version + 1,
      occurredAt: new Date()
    };

    this.addEvent(event);
    return event;
  }

  cancel(command: CancelReservationCommand): ReservationCancelled {
    if (this.status === 'cancelled') {
      throw new Error('Reservation is already cancelled');
    }

    const event: ReservationCancelled = {
      type: 'ReservationCancelled',
      aggregateId: this.id,
      version: this.version + 1,
      occurredAt: new Date(),
      reason: command.reason
    };

    this.addEvent(event);
    return event;
  }

  // Getters
  getHotelId(): string {
    return this.hotelId;
  }

  getGuestName(): string {
    return this.guestName;
  }

  getStatus(): string {
    return this.status;
  }

  getCheckIn(): Date {
    return this.checkIn;
  }

  getCheckOut(): Date {
    return this.checkOut;
  }
}

