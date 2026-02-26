export function formatReservation(reservation: {
  id: string;
  originId: string | null;
  guestName: string | null;
  guestEmail?: string | null;
  guestId?: string | null;
  status: string;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  totalPrice: number | null;
  payedPrice: number | null;
  currency: string | null;
  roomIds: string[];
  accountId?: number | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: reservation.id,
    originId: reservation.originId,
    guestName: reservation.guestName,
    guestEmail: reservation.guestEmail || null,
    guestId: reservation.guestId || null,
    status: reservation.status,
    checkInDate: reservation.checkInDate?.toISOString().split('T')[0] || null,
    checkOutDate: reservation.checkOutDate?.toISOString().split('T')[0] || null,
    totalPrice: reservation.totalPrice,
    payedPrice: reservation.payedPrice,
    currency: reservation.currency,
    roomIds: reservation.roomIds || [],
    accountId: reservation.accountId ?? null,
    version: reservation.version,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}
