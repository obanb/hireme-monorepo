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

// ── Booking engine segment types ──────────────────────────────────────────────

export interface BEPaymentData {
  paidAmount: number;
  paymentType: string;
  currency: string;
}
export interface BEPaymentSegment {
  id: string;
  data: BEPaymentData;
  error: boolean;
  errors: string[];
  reprocessed: boolean | null;
  reprocessAvailable: boolean | null;
}

export interface BEVoucherAmount { amount: number; currency: string; }
export interface BEVoucherData {
  amount: BEVoucherAmount;
  transactionId: string;
  voucherNumber: string;
  status: string;
  errorMessage: string | null;
}
export interface BEVoucherSegment {
  id: string;
  data: BEVoucherData;
  error: boolean;
  errors: string[];
  reprocessed: boolean | null;
  reprocessAvailable: boolean | null;
}

export interface BENoteSegment {
  id: string;
  data: string;
  error: boolean;
  errors: string[];
  reprocessed: boolean | null;
  reprocessAvailable: boolean | null;
}

export interface BEHSKNoteSegment {
  id: string;
  data: string;
  error: boolean;
  errors: string[];
  reprocessed: boolean | null;
  reprocessAvailable: boolean | null;
}

export interface BERoomFeatureData {
  featureMask: number;
  codes: string[];
  roomType: string;
}
export interface BERoomFeatureSegment {
  id: string;
  data: BERoomFeatureData;
  error: boolean;
  errors: string[];
  reprocessed: boolean | null;
  reprocessAvailable: boolean | null;
}

export interface BEInventoryItem { id: number; amount: number; name: string; code: string; }
export interface BEInventoryData { inventories: BEInventoryItem[]; roomType: string; }
export interface BEInventorySegment {
  id: string;
  data: BEInventoryData;
  error: boolean;
  errors: string[];
  reprocessed: boolean | null;
  reprocessAvailable: boolean | null;
}

export interface BEPromoCodeSegment {
  id: string;
  data: string;
  error: boolean;
  errors: string[];
  reprocessed: boolean | null;
  reprocessAvailable: boolean | null;
}

export interface BEContactData { email: string; phone: string; }
export interface BECompanyData {
  id: string;
  name: string;
  dic: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  comment: string | null;
  contact: BEContactData;
}
export interface BECompanySegment {
  id: string;
  data: BECompanyData;
  error: boolean;
  errors: string[];
  reprocessed: boolean | null;
  reprocessAvailable: boolean | null;
}

export interface ReservationCheckDetail extends CheckReservationBooking {
  payments: BEPaymentSegment[];
  vouchers: BEVoucherSegment[];
  notes: BENoteSegment[];
  hskNotes: BEHSKNoteSegment[];
  roomFeatures: BERoomFeatureSegment[];
  inventories: BEInventorySegment[];
  promoCodes: BEPromoCodeSegment[];
  companies: BECompanySegment[];
}
