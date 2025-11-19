export interface CreateReservationCommand {
  reservationId: string;
  hotelId: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
}

export interface ConfirmReservationCommand {
  reservationId: string;
}

export interface CancelReservationCommand {
  reservationId: string;
  reason?: string;
}

