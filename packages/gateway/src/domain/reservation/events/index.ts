import { DomainEvent } from '../../shared/DomainEvent';

export interface ReservationCreated extends DomainEvent {
  type: 'ReservationCreated';
  hotelId: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
}

export interface ReservationConfirmed extends DomainEvent {
  type: 'ReservationConfirmed';
}

export interface ReservationCancelled extends DomainEvent {
  type: 'ReservationCancelled';
  reason?: string;
}

export type ReservationEvent = ReservationCreated | ReservationConfirmed | ReservationCancelled;

