export function formatWellnessTherapist(therapist: {
  id: string;
  code: string;
  name: string;
  serviceTypesBitMask: number;
  isVirtual: boolean;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: therapist.id,
    code: therapist.code,
    name: therapist.name,
    serviceTypesBitMask: therapist.serviceTypesBitMask,
    isVirtual: therapist.isVirtual,
    isActive: therapist.isActive,
    version: therapist.version,
    createdAt: therapist.createdAt.toISOString(),
    updatedAt: therapist.updatedAt.toISOString(),
  };
}

export function formatWellnessRoomType(roomType: {
  id: string;
  name: string;
  bit: number;
  maskValue: number;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: roomType.id,
    name: roomType.name,
    bit: roomType.bit,
    maskValue: roomType.maskValue,
    isActive: roomType.isActive,
    version: roomType.version,
    createdAt: roomType.createdAt.toISOString(),
    updatedAt: roomType.updatedAt.toISOString(),
  };
}

export function formatWellnessService(service: {
  id: string;
  name: string;
  priceNormal: number;
  priceOBE: number | null;
  priceOVE: number | null;
  vatCharge: number;
  serviceTypeBitMask: number;
  duration: number;
  pauseBefore: number;
  pauseAfter: number;
  needsTherapist: boolean;
  needsRoom: boolean;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: service.id,
    name: service.name,
    priceNormal: service.priceNormal,
    priceOBE: service.priceOBE,
    priceOVE: service.priceOVE,
    vatCharge: service.vatCharge,
    serviceTypeBitMask: service.serviceTypeBitMask,
    duration: service.duration,
    pauseBefore: service.pauseBefore,
    pauseAfter: service.pauseAfter,
    needsTherapist: service.needsTherapist,
    needsRoom: service.needsRoom,
    isActive: service.isActive,
    version: service.version,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

export function formatWellnessBooking(booking: {
  id: string;
  reservationId: string | null;
  guestName: string;
  serviceId: string;
  therapistId: string | null;
  roomTypeId: string | null;
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  price: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: booking.id,
    reservationId: booking.reservationId,
    guestName: booking.guestName,
    serviceId: booking.serviceId,
    therapistId: booking.therapistId,
    roomTypeId: booking.roomTypeId,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime,
    endTime: booking.endTime,
    status: booking.status,
    notes: booking.notes,
    price: booking.price,
    version: booking.version,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}
