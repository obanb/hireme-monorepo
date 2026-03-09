export type CheckReservationStatus = 'GREEN' | 'YELLOW' | 'RED' | 'PENDING' | 'NONE';

export interface CheckReservationBooking {
  originId: string;
  hotelTimeId: number | null;
  provider: string;
  date: string;
  adultCount: number;
  childCount: number;
  checkin: string;
  checkout: string;
  owner: string;
  customerNote: string | null;
  notesStatus: CheckReservationStatus;
  featuresStatus: CheckReservationStatus;
  vouchersStatus: CheckReservationStatus;
  paymentsStatus: CheckReservationStatus;
  customerNoteStatus: CheckReservationStatus;
  inventoriesStatus: CheckReservationStatus;
  hskStatus: CheckReservationStatus;
  status: CheckReservationStatus;
}
