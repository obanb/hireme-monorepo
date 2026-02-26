/**
 * Event Sourcing Module
 *
 * This module provides a complete event sourcing implementation for the hotel CMS platform.
 *
 * Features:
 * - PostgreSQL (Supabase) as the event store
 * - RabbitMQ for async event distribution
 * - Optimistic concurrency control
 * - Synchronous projections for read models
 * - Polling publisher pattern for event relaying
 */

// Configuration
export { config } from './config';

// Database
export {
  getPool,
  initializeDatabase,
  withTransaction,
  closePool,
} from './database';

// Event Store
export {
  loadEvents,
  appendEvents,
  getUnprocessedEvents,
  getCheckpoint,
  updateCheckpoint,
  type StoredEvent,
  type DomainEvent,
} from './event-store';

// Projections
export {
  applyReservationProjection,
  getReservation,
} from './projections';

// Aggregate
export {
  ReservationAggregate,
  type ReservationState,
  type ReservationStatus,
  type BookingDetails,
} from './aggregate';

// Repository
export {
  ReservationRepository,
  reservationRepository,
} from './repository';

// Room Aggregate
export {
  RoomAggregate,
  type RoomState,
  type RoomType,
  type RoomStatus,
  type RoomDetails,
} from './room-aggregate';

// Room Projections
export {
  applyRoomProjection,
  getRoom,
} from './room-projections';

// Room Repository
export {
  RoomRepository,
  roomRepository,
} from './room-repository';

// Event Relayer
export {
  EventRelayer,
  eventRelayer,
  createExampleConsumer,
} from './event-relayer';

// RoomType Aggregate
export {
  RoomTypeAggregate,
  type RoomTypeState,
  type RoomTypeDetails,
} from './room-type-aggregate';

// RoomType Projections
export {
  applyRoomTypeProjection,
  getRoomType,
  listRoomTypes,
} from './room-type-projections';

// RoomType Repository
export {
  RoomTypeRepository,
  roomTypeRepository,
} from './room-type-repository';

// RateCode Aggregate
export {
  RateCodeAggregate,
  type RateCodeState,
  type RateCodeDetails,
} from './rate-code-aggregate';

// RateCode Projections
export {
  applyRateCodeProjection,
  getRateCode,
  listRateCodes,
} from './rate-code-projections';

// RateCode Repository
export {
  RateCodeRepository,
  rateCodeRepository,
} from './rate-code-repository';

// Seed Data
export { seedDefaultRoomTypes } from './seed-data';

// Wellness Therapist
export {
  WellnessTherapistAggregate,
  type WellnessTherapistState,
  type WellnessTherapistDetails,
} from './wellness-therapist-aggregate';

export {
  applyWellnessTherapistProjection,
  getWellnessTherapist,
  listWellnessTherapists,
} from './wellness-therapist-projections';

export {
  WellnessTherapistRepository,
  wellnessTherapistRepository,
} from './wellness-therapist-repository';

// Wellness Room Type
export {
  WellnessRoomTypeAggregate,
  type WellnessRoomTypeState,
  type WellnessRoomTypeDetails,
} from './wellness-room-type-aggregate';

export {
  applyWellnessRoomTypeProjection,
  getWellnessRoomType,
  listWellnessRoomTypes,
} from './wellness-room-type-projections';

export {
  WellnessRoomTypeRepository,
  wellnessRoomTypeRepository,
} from './wellness-room-type-repository';

// Wellness Service
export {
  WellnessServiceAggregate,
  type WellnessServiceState,
  type WellnessServiceDetails,
} from './wellness-service-aggregate';

export {
  applyWellnessServiceProjection,
  getWellnessService,
  listWellnessServices,
} from './wellness-service-projections';

export {
  WellnessServiceRepository,
  wellnessServiceRepository,
} from './wellness-service-repository';

// Wellness Booking
export {
  WellnessBookingAggregate,
  type WellnessBookingState,
  type WellnessBookingDetails,
  type WellnessBookingStatus,
} from './wellness-booking-aggregate';

export {
  applyWellnessBookingProjection,
  getWellnessBooking,
  listWellnessBookings,
} from './wellness-booking-projections';

export {
  WellnessBookingRepository,
  wellnessBookingRepository,
} from './wellness-booking-repository';

// Voucher
export {
  VoucherAggregate,
  type VoucherState,
  type VoucherDetails,
  type CustomerData,
  type GiftData,
} from './voucher-aggregate';

export {
  applyVoucherProjection,
  getVoucher,
  listVouchers,
} from './voucher-projections';

export {
  VoucherRepository,
  voucherRepository,
} from './voucher-repository';

// Guest
export {
  GuestAggregate,
  type GuestState,
  type GuestDetails,
  type GuestAddress,
} from './guest-aggregate';

export {
  applyGuestProjection,
  getGuest,
  getGuestByEmail,
  listGuests,
} from './guest-projections';

export {
  GuestRepository,
  guestRepository,
} from './guest-repository';

// Statistics
export {
  statisticsRepository,
} from './statistics-repository';

// Account
export {
  AccountAggregate,
  type AccountState,
  type AccountDetails,
} from './account-aggregate';

export {
  applyAccountProjection,
  getAccount,
  getAccountByStreamId,
  getAccountByReservationId,
  listAccounts,
  type AccountRow,
} from './account-projections';

export {
  AccountRepository,
  accountRepository,
} from './account-repository';
