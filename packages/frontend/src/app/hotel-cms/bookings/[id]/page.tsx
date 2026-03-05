'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';
import { useToast } from '@/context/ToastContext';

interface Room {
  id: string;
  name: string;
  roomNumber: string;
  type: string;
  color: string;
  status: string;
}

interface Reservation {
  id: string;
  originId: string | null;
  guestName: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number | null;
  payedPrice: number | null;
  currency: string;
  roomIds: string[];
  rooms: Room[];
  accountId: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface StoredEvent {
  id: number;
  streamId: string;
  version: number;
  type: string;
  data: string;
  metadata: string | null;
  occurredAt: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#4ADE80',
  PENDING: '#FBBF24',
  CANCELLED: '#FB7185',
};

// ── Activity helpers ──────────────────────────────────────────────────────

interface ActivityMeta {
  color: string;
  title: string;
  actor: string | null;
  detail: string | null;
  icon: React.ReactNode;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function parseActivity(event: StoredEvent, rooms: Room[]): ActivityMeta {
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(event.data); } catch { /* ok */ }

  const roomLabel = (ids: string[]) => {
    if (!ids?.length) return '—';
    const found = ids.map(id => rooms.find(r => r.id === id)).filter(Boolean) as Room[];
    return found.length ? found.map(r => `#${r.roomNumber}`).join(', ') : ids.slice(0, 2).join(', ');
  };

  switch (event.type) {
    case 'ReservationCreated': {
      const bd = data.bookingDetails as Record<string, unknown> | undefined;
      return {
        color: '#A78BFA',
        title: 'Reservation created',
        actor: null,
        detail: bd ? `${bd.checkInDate ?? ''}  →  ${bd.checkOutDate ?? ''}${bd.totalPrice ? ` · ${bd.totalPrice} ${bd.currency ?? ''}` : ''}` : null,
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        ),
      };
    }
    case 'ReservationConfirmed': {
      const actor = (data.confirmedBy as string) || 'Reception';
      return {
        color: '#4ADE80',
        title: 'Check-in confirmed',
        actor,
        detail: data.confirmedAt ? new Date(data.confirmedAt as string).toLocaleString() : null,
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        ),
      };
    }
    case 'ReservationCancelled':
      return {
        color: '#FB7185',
        title: 'Reservation cancelled',
        actor: null,
        detail: (data.reason as string) || null,
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        ),
      };
    case 'RoomsAssigned': {
      const roomIds = (data.roomIds as string[]) || [];
      const prevIds = (data.previousRoomIds as string[]) || [];
      const isReassignment = prevIds.length > 0;
      return {
        color: '#60B8D4',
        title: isReassignment ? 'Room reassigned' : 'Room assigned',
        actor: null,
        detail: isReassignment
          ? `${roomLabel(prevIds)} → ${roomLabel(roomIds)}`
          : roomLabel(roomIds),
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        ),
      };
    }
    case 'AccountCreated':
      return {
        color: '#FBBF24',
        title: 'Account opened',
        actor: 'System',
        detail: data.totalPrice ? `${data.totalPrice} ${data.currency ?? ''}` : null,
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
        ),
      };
    default:
      return {
        color: 'var(--gold)',
        title: event.type,
        actor: null,
        detail: null,
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        ),
      };
  }
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ color: 'var(--text-muted)' }} className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">{label}</p>
      {typeof value === 'string' ? (
        <p style={{ color: 'var(--text-primary)' }} className="text-[13px] font-medium">{value}</p>
      ) : value}
    </div>
  );
}

const mainStyle = {
  marginLeft: 'var(--sidebar-width, 280px)',
  transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
};

export default function ReservationDetailPage() {
  const params = useParams();
  const reservationId = params.id as string;
  const { t } = useLocale();
  const toast = useToast();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  const fetchReservation = useCallback(async () => {
    try {
      setLoading(true);
      const [reservationResponse, eventsResponse] = await Promise.all([
        fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `query GetReservation($id: ID!) { reservation(id: $id) { id originId guestName status checkInDate checkOutDate totalPrice payedPrice currency roomIds rooms { id name roomNumber type color } accountId version createdAt updatedAt } }`,
            variables: { id: reservationId },
          }),
        }),
        fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `query GetEventHistory($id: ID!) { reservationEventHistory(id: $id) { id streamId version type data metadata occurredAt } }`,
            variables: { id: reservationId },
          }),
        }),
      ]);
      const [reservationResult, eventsResult] = await Promise.all([reservationResponse.json(), eventsResponse.json()]);
      if (reservationResult.errors) throw new Error(reservationResult.errors[0]?.message ?? 'Failed to fetch reservation');
      setReservation(reservationResult.data?.reservation ?? null);
      setEvents(eventsResult.data?.reservationEventHistory ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query ListRooms { rooms { id name roomNumber type color status } }` }),
      });
      const result = await response.json();
      if (!result.errors) setAllRooms(result.data?.rooms ?? []);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    fetchReservation();
    fetchRooms();
  }, [fetchReservation, fetchRooms]);

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation ConfirmReservation($input: ConfirmReservationInput!) { confirmReservation(input: $input) { reservation { id status } } }`,
          variables: { input: { reservationId, confirmedBy: 'Hotel Staff' } },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to confirm reservation');
      await fetchReservation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm reservation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { setError('Please provide a cancellation reason'); return; }
    try {
      setActionLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation CancelReservation($input: CancelReservationInput!) { cancelReservation(input: $input) { reservation { id status } } }`,
          variables: { input: { reservationId, reason: cancelReason } },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to cancel reservation');
      setShowCancelDialog(false);
      setCancelReason('');
      await fetchReservation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel reservation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRooms = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation AssignRooms($input: AssignRoomsInput!) { assignRooms(input: $input) { reservation { id roomIds } } }`,
          variables: { input: { reservationId, roomIds: selectedRoomIds } },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to assign rooms');
      setShowRoomDialog(false);
      setSelectedRoomIds([]);
      await fetchReservation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign rooms');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRoomInDialog = (roomId: string) => {
    setSelectedRoomIds(prev => prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]);
  };

  const printRegistrationCard = () => {
    if (!reservation) return;
    const rooms = reservation.rooms?.map((r) => r.roomNumber || r.name).join(', ') || '—';
    const checkIn = new Date(reservation.checkInDate).toLocaleDateString('cs-CZ');
    const checkOut = new Date(reservation.checkOutDate).toLocaleDateString('cs-CZ');
    const html = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <title>Registrační karta — ${reservation.guestName}</title>
  <style>
    @media print { @page { size: A4; margin: 14mm; } body { margin: 0; } .no-print { display: none; } }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; background: #fff; padding: 20px; max-width: 180mm; margin: auto; }
    .header { background: #1a2340; color: #fff; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
    .header-title { font-size: 13px; font-weight: bold; letter-spacing: 0.05em; }
    .header-sub { font-size: 8px; opacity: 0.7; }
    .row { display: flex; gap: 0; margin-bottom: 0; }
    .cell { border: 1px solid #aaa; padding: 6px 8px; flex: 1; background: #f4f6f9; }
    .cell + .cell { border-left: none; }
    .row + .row > .cell { border-top: none; }
    .cell-label { font-size: 7px; color: #555; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
    .cell-value { font-size: 11px; font-weight: bold; min-height: 14px; }
    .white .cell { background: #fff; }
    .section-title { font-size: 8px; font-weight: bold; background: #e8ecf4; padding: 4px 8px; border: 1px solid #aaa; border-bottom: none; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; }
    .signature-row { display: flex; gap: 0; margin-top: 10px; }
    .sig-cell { flex: 1; border: 1px solid #aaa; padding: 6px 8px; min-height: 32px; }
    .sig-cell + .sig-cell { border-left: none; }
    .print-btn { display: block; margin: 16px auto; padding: 10px 28px; background: #1a2340; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-sub">Hotel CMS</div>
    </div>
    <div class="header-title">REGISTRAČNÍ KARTA &nbsp;•&nbsp; REGISTRATION CARD</div>
    <div></div>
  </div>

  <div class="row">
    <div class="cell" style="background:#e8ecf4; flex: 0 0 38%">
      <div class="cell-label">Číslo pokoje / Room Number</div>
      <div class="cell-value">${rooms}</div>
    </div>
    <div class="cell" style="flex: 0 0 30%">
      <div class="cell-label">Příjezd / Arrival</div>
      <div class="cell-value">${checkIn}</div>
    </div>
    <div class="cell" style="flex: 0 0 32%; border-left: none">
      <div class="cell-label">Odjezd / Departure</div>
      <div class="cell-value">${checkOut}</div>
    </div>
  </div>

  <div class="row white">
    <div class="cell" style="flex: 0 0 60%">
      <div class="cell-label">Jméno hosta (příjmení, jméno) / Guest Name</div>
      <div class="cell-value">${reservation.guestName}</div>
    </div>
    <div class="cell" style="flex: 0 0 40%">
      <div class="cell-label">Státní příslušnost / Nationality</div>
      <div class="cell-value" style="min-height:14px"></div>
    </div>
  </div>

  <div class="row white">
    <div class="cell">
      <div class="cell-label">Adresa / Address</div>
      <div class="cell-value" style="min-height:14px"></div>
    </div>
    <div class="cell">
      <div class="cell-label">Datum narození / Date of Birth</div>
      <div class="cell-value" style="min-height:14px"></div>
    </div>
  </div>

  <div class="row white">
    <div class="cell">
      <div class="cell-label">Číslo dokladu / ID / Passport Number</div>
      <div class="cell-value" style="min-height:14px"></div>
    </div>
    <div class="cell">
      <div class="cell-label">Telefon / Phone</div>
      <div class="cell-value" style="min-height:14px"></div>
    </div>
    <div class="cell">
      <div class="cell-label">E-mail</div>
      <div class="cell-value" style="min-height:14px"></div>
    </div>
  </div>

  <div class="section-title">Platba / Payment</div>
  <div class="row white">
    <div class="cell">
      <div class="cell-label">Způsob platby / Payment Method</div>
      <div class="cell-value" style="min-height:14px"></div>
    </div>
    <div class="cell">
      <div class="cell-label">Celková cena / Total Price</div>
      <div class="cell-value">${reservation.totalPrice != null ? reservation.totalPrice + ' ' + reservation.currency : '—'}</div>
    </div>
    <div class="cell">
      <div class="cell-label">Zaplaceno / Paid</div>
      <div class="cell-value">${reservation.payedPrice != null ? reservation.payedPrice + ' ' + reservation.currency : '—'}</div>
    </div>
  </div>

  <div class="signature-row">
    <div class="sig-cell">
      <div class="cell-label">Podpis hosta / Guest Signature</div>
    </div>
    <div class="sig-cell">
      <div class="cell-label">Podpis recepce / Reception</div>
    </div>
  </div>

  <button class="print-btn no-print" onclick="window.print(); window.close();">Tisk / Print</button>
</body>
</html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      toast.error('Pop-up blocked. Please allow pop-ups for this site.');
    }
  };

  const formatEventData = (data: string) => {
    try { return JSON.stringify(JSON.parse(data), null, 2); } catch { return data; }
  };

  const inputStyle = { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' };

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <HotelSidebar />
        <main className="flex-1 px-8 py-8" style={mainStyle}>
          <div style={{ color: 'var(--text-muted)' }} className="py-16 text-center text-[13px] animate-pulse">{t('bookingDetail.loadingReservation')}</div>
        </main>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <HotelSidebar />
        <main className="flex-1 px-8 py-8" style={mainStyle}>
          <div className="max-w-[760px] mx-auto text-center py-16">
            <p style={{ color: 'var(--text-primary)' }} className="text-[15px] font-semibold mb-4">{t('bookingDetail.notFound')}</p>
            <Link href="/hotel-cms/bookings" style={{ background: 'var(--gold)', color: 'var(--background)' }} className="inline-block px-4 py-2 text-[13px] font-semibold rounded-md hover:opacity-90 transition-opacity">
              {t('bookingDetail.backToBookings')}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[reservation.status] ?? '#C9A96E';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main className="flex-1 px-8 py-8" style={mainStyle}>
        <div className="max-w-[760px] mx-auto">
          {/* Back */}
          <Link
            href="/hotel-cms/bookings"
            style={{ color: 'var(--text-muted)' }}
            className="flex items-center gap-2 text-[12.5px] font-medium mb-6 w-fit"
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--gold)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
          >
            <ArrowLeftIcon />
            {t('bookingDetail.backToBookings')}
          </Link>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }} className="px-4 py-3 rounded-md text-[13px] flex items-center justify-between mb-5">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-4 hover:opacity-70">✕</button>
            </div>
          )}

          {/* Header Card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 style={{ color: 'var(--text-primary)' }} className="text-[1.9rem] font-bold tracking-tight">
                    {reservation.guestName}
                  </h1>
                  <span style={{ color: statusColor, background: statusColor + '1A' }} className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md">
                    {reservation.status}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)' }} className="font-mono text-[11px]">ID: {reservation.id}</p>
                {reservation.originId && <p style={{ color: 'var(--text-muted)' }} className="text-[12px] mt-0.5">{t('bookingDetail.origin')}: {reservation.originId}</p>}
                {reservation.accountId && (
                  <Link
                    href={`/hotel-cms/accounts/${reservation.accountId}`}
                    style={{ color: '#A78BFA', background: 'rgba(167,139,250,0.10)' }}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold rounded-md hover:opacity-80 transition-opacity"
                  >
                    {t('accounts.account')} #{reservation.accountId}
                  </Link>
                )}
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={printRegistrationCard}
                  style={{ border: '1px solid var(--card-border)', color: 'var(--text-secondary)', background: 'transparent' }}
                  className="px-3 py-2 text-[12px] font-medium rounded-md hover:opacity-80 transition-opacity flex items-center gap-1.5"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Print Card
                </button>
                {reservation.status === 'PENDING' && (
                  <button
                    onClick={handleConfirm}
                    disabled={actionLoading}
                    style={{ background: 'rgba(74,222,128,0.15)', color: '#4ADE80' }}
                    className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {actionLoading ? t('common.processing') : t('bookingDetail.confirm')}
                  </button>
                )}
                {reservation.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    disabled={actionLoading}
                    style={{ background: 'rgba(251,113,133,0.12)', color: '#FB7185' }}
                    className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* Stay Details */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
              <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold leading-none mb-5">{t('bookingDetail.stayDetails')}</h2>
              <div className="space-y-4">
                <DetailRow label={t('bookings.checkIn')} value={reservation.checkInDate} />
                <DetailRow label={t('bookings.checkOut')} value={reservation.checkOutDate} />
                <DetailRow
                  label={t('bookings.totalPrice')}
                  value={
                    <p style={{ color: 'var(--text-primary)',  }} className="text-[1.3rem] font-bold tabular-nums">
                      {reservation.totalPrice != null ? reservation.totalPrice.toLocaleString('en-US', { style: 'currency', currency: reservation.currency || 'EUR' }) : '—'}
                    </p>
                  }
                />
                <DetailRow
                  label={t('bookings.payedPrice')}
                  value={
                    <p style={{ color: 'var(--text-primary)' }} className="text-[13px] font-semibold tabular-nums">
                      {reservation.payedPrice != null ? reservation.payedPrice.toLocaleString('en-US', { style: 'currency', currency: reservation.currency || 'EUR' }) : '—'}
                    </p>
                  }
                />
              </div>
            </div>

            {/* Room Details */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold leading-none">{t('bookingDetail.roomDetails')}</h2>
                {reservation.status !== 'CANCELLED' && (
                  <button
                    onClick={() => { setSelectedRoomIds(reservation.roomIds || []); setShowRoomDialog(true); }}
                    style={{ color: 'var(--gold)' }}
                    className="text-[12px] font-semibold hover:opacity-70 transition-opacity"
                  >
                    {reservation.rooms && reservation.rooms.length > 0 ? t('bookingDetail.change') : t('bookingDetail.assign')}
                  </button>
                )}
              </div>
              {reservation.rooms && reservation.rooms.length > 0 ? (
                <div className="space-y-3">
                  {reservation.rooms.map(room => (
                    <div key={room.id} className="flex items-center gap-3 p-3 rounded-md" style={{ background: 'var(--surface-hover)' }}>
                      <div className="w-4 h-4 rounded-md flex-shrink-0" style={{ backgroundColor: room.color }} />
                      <div>
                        <p style={{ color: 'var(--text-primary)' }} className="text-[13px] font-semibold">{room.name}</p>
                        <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">#{room.roomNumber} — {room.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p style={{ color: 'var(--text-muted)' }} className="text-[13px] mb-3">{t('bookingDetail.noRoomAssigned')}</p>
                  {reservation.status !== 'CANCELLED' && (
                    <button
                      onClick={() => setShowRoomDialog(true)}
                      style={{ background: 'var(--gold)', color: 'var(--background)' }}
                      className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity"
                    >
                      {t('bookingDetail.assignRoom')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6 mb-5">
            <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold leading-none mb-5">{t('bookingDetail.metadata')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <DetailRow label={t('common.version')} value={<span className="font-mono text-[13px]" style={{ color: 'var(--text-primary)' }}>{reservation.version}</span>} />
              <DetailRow label={t('common.created')} value={new Date(reservation.createdAt).toLocaleString()} />
              <DetailRow label={t('common.updated')} value={new Date(reservation.updatedAt).toLocaleString()} />
            </div>
          </div>

          {/* Activity Feed */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold leading-none mb-1">
                  {t('bookingDetail.eventHistory')}
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">{t('bookingDetail.auditTrail')}</p>
              </div>
              <span style={{ color: 'var(--text-muted)', background: 'var(--surface-hover)', border: '1px solid var(--card-border)' }}
                className="text-[11px] font-semibold px-2 py-1 rounded-md tabular-nums">
                {events.length} events
              </span>
            </div>
            {events.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('bookingDetail.noEvents')}</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-5 bottom-0 w-px" style={{ background: 'var(--card-border)' }} />
                <div className="space-y-0">
                  {[...events].reverse().map((event, idx) => {
                    const act = parseActivity(event, allRooms);
                    const isLast = idx === events.length - 1;
                    return (
                      <div key={event.id} className="relative flex gap-4 pb-5">
                        {/* Icon dot */}
                        <div className="relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center"
                          style={{ background: act.color + '20', border: `1.5px solid ${act.color}`, color: act.color }}>
                          {act.icon}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 pt-1 ${isLast ? '' : ''}`}>
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span style={{ color: 'var(--text-primary)' }} className="text-[13px] font-semibold">{act.title}</span>
                              {act.actor && (
                                <span style={{ color: act.color, background: act.color + '18' }}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                  {act.actor}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span style={{ color: 'var(--text-muted)' }} className="text-[10px] tabular-nums" title={new Date(event.occurredAt).toLocaleString()}>
                                {relativeTime(event.occurredAt)}
                              </span>
                              <span style={{ color: 'var(--text-muted)', background: 'var(--surface-hover)' }}
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded">
                                v{event.version}
                              </span>
                            </div>
                          </div>
                          {act.detail && (
                            <p style={{ color: 'var(--text-secondary)' }} className="text-[12px] mb-1">{act.detail}</p>
                          )}
                          <p style={{ color: 'var(--text-muted)' }} className="text-[10px] tabular-nums">
                            {new Date(event.occurredAt).toLocaleString()}
                          </p>
                          {/* Expandable raw data */}
                          <details className="mt-1">
                            <summary style={{ color: 'var(--text-muted)' }} className="text-[10px] cursor-pointer hover:opacity-70 w-fit">
                              Raw event data
                            </summary>
                            <pre style={{ color: 'var(--text-secondary)', background: 'var(--background)', border: '1px solid var(--card-border)' }}
                              className="mt-1.5 p-2.5 rounded-md text-[10px] overflow-x-auto">
                              {formatEventData(event.data)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold mb-2">{t('bookingDetail.cancelReservation')}</h3>
            <p style={{ color: 'var(--text-secondary)' }} className="text-[13px] mb-4">{t('bookingDetail.cancelReason')}</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t('bookingDetail.cancelReasonPlaceholder')}
              className="w-full px-3 py-2.5 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E] resize-none"
              style={inputStyle}
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowCancelDialog(false); setCancelReason(''); }}
                style={{ color: 'var(--text-secondary)' }}
                className="px-4 py-2 text-[12.5px] font-medium rounded-md hover:opacity-70 transition-opacity"
              >
                {t('common.back')}
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading || !cancelReason.trim()}
                style={{ background: 'rgba(251,113,133,0.15)', color: '#FB7185' }}
                className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {actionLoading ? t('common.processing') : t('bookingDetail.cancelReservation')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Assignment Dialog */}
      {showRoomDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold mb-2">{t('bookingDetail.assignRoom')}</h3>
            <p style={{ color: 'var(--text-secondary)' }} className="text-[13px] mb-4">{t('bookingDetail.selectRooms')}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allRooms.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }} className="text-[13px] text-center py-4">{t('bookingDetail.noRoomsAvailable')}</p>
              ) : (
                allRooms.map((room) => (
                  <label
                    key={room.id}
                    className="flex items-center gap-3 p-3 rounded-md cursor-pointer"
                    style={{
                      border: selectedRoomIds.includes(room.id) ? '1px solid var(--gold)' : '1px solid var(--card-border)',
                      background: selectedRoomIds.includes(room.id) ? 'rgba(201,169,110,0.08)' : 'var(--surface)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoomIds.includes(room.id)}
                      onChange={() => toggleRoomInDialog(room.id)}
                      className="rounded"
                      style={{ accentColor: 'var(--gold)' }}
                    />
                    <div className="w-4 h-4 rounded-md flex-shrink-0" style={{ backgroundColor: room.color }} />
                    <div className="flex-1">
                      <p style={{ color: 'var(--text-primary)' }} className="text-[13px] font-semibold">{room.name}</p>
                      <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">#{room.roomNumber} — {room.type}</p>
                    </div>
                    {room.status !== 'AVAILABLE' && (
                      <span
                        style={{ color: room.status === 'OCCUPIED' ? '#A78BFA' : '#FBBF24', background: room.status === 'OCCUPIED' ? 'rgba(167,139,250,0.10)' : 'rgba(251,191,36,0.10)' }}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                      >
                        {room.status}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowRoomDialog(false); setSelectedRoomIds([]); }}
                style={{ color: 'var(--text-secondary)' }}
                className="px-4 py-2 text-[12.5px] font-medium rounded-md hover:opacity-70 transition-opacity"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAssignRooms}
                disabled={actionLoading}
                style={{ background: 'var(--gold)', color: 'var(--background)' }}
                className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {actionLoading ? t('bookingDetail.assigning') : t('bookingDetail.assignRoom')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
