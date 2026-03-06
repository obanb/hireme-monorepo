function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
    checkInDate: reservation.checkInDate ? formatDate(reservation.checkInDate) : null,
    checkOutDate: reservation.checkOutDate ? formatDate(reservation.checkOutDate) : null,
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
