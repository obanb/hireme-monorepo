'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

interface ActivityEvent {
  id: number;
  streamId: string;
  type: string;
  data: string;
  occurredAt: string;
  guestName: string | null;
}

interface Reservation {
  id: string;
  originId: string | null;
  guestName: string;
  guestEmail: string | null;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number | null;
  payedPrice: number | null;
  currency: string;
  roomIds: string[];
  accountId: number | null;
  version: number;
  createdAt: string;
}

interface Room {
  id: string;
  name: string;
  roomNumber: string;
  type: string;
  capacity: number;
  status: string;
  color: string;
}

interface CreateReservationInput {
  originId: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number | '';
  payedPrice: number | '';
  currency: string;
  roomIds: string[];
}

interface ReservationFilter {
  status: string;
  guestName: string;
  checkInFrom: string;
  checkInTo: string;
  checkOutFrom: string;
  checkOutTo: string;
  createdFrom: string;
  createdTo: string;
  currency: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const emptyFilter: ReservationFilter = {
  status: '', guestName: '', checkInFrom: '', checkInTo: '',
  checkOutFrom: '', checkOutTo: '', createdFrom: '', createdTo: '', currency: '',
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#4ADE80',
  PENDING: '#FBBF24',
  CANCELLED: '#FB7185',
};

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

function RefreshIcon({ spin }: { spin?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={spin ? 'animate-spin' : ''}>
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function ChevronIcon({ up }: { up?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={up ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  );
}

const inputStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--card-border)',
  color: 'var(--text-primary)',
};

const inputClass = 'w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]';

function BookingsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<ReservationFilter>(emptyFilter);
  const [appliedFilters, setAppliedFilters] = useState<ReservationFilter>(emptyFilter);
  const [formData, setFormData] = useState<CreateReservationInput>({
    originId: '', guestFirstName: '', guestLastName: '', guestEmail: '',
    checkInDate: '', checkOutDate: '', totalPrice: '', payedPrice: '', currency: 'EUR', roomIds: [],
  });

  useEffect(() => {
    const roomId = searchParams.get('roomId');
    const checkInDate = searchParams.get('checkInDate');
    if (roomId || checkInDate) {
      setShowForm(true);
      setFormData(prev => ({
        ...prev,
        roomIds: roomId ? [roomId] : prev.roomIds,
        checkInDate: checkInDate || prev.checkInDate,
      }));
      router.replace('/hotel-cms/bookings', { scroll: false });
    }
  }, [searchParams, router]);

  const buildFilterInput = useCallback((f: ReservationFilter) => {
    const filter: Record<string, string> = {};
    if (f.status) filter.status = f.status;
    if (f.guestName) filter.guestName = f.guestName;
    if (f.checkInFrom) filter.checkInFrom = f.checkInFrom;
    if (f.checkInTo) filter.checkInTo = f.checkInTo;
    if (f.checkOutFrom) filter.checkOutFrom = f.checkOutFrom;
    if (f.checkOutTo) filter.checkOutTo = f.checkOutTo;
    if (f.createdFrom) filter.createdFrom = f.createdFrom;
    if (f.createdTo) filter.createdTo = f.createdTo;
    if (f.currency) filter.currency = f.currency;
    return Object.keys(filter).length > 0 ? filter : null;
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query ListRooms { rooms { id name roomNumber type capacity status color } }`,
        }),
      });
      const result = await response.json();
      if (!result.errors) setRooms(result.data?.rooms ?? []);
    } catch { /* silently fail */ }
  }, []);

  const fetchRecentActivity = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `{ recentActivity(limit: 15) { id streamId type data occurredAt guestName } }`,
        }),
      });
      const result = await response.json();
      if (!result.errors) setRecentActivity(result.data?.recentActivity ?? []);
    } catch { /* silently fail */ }
  }, []);

  const fetchReservations = useCallback(async (filterToApply?: ReservationFilter) => {
    try {
      setLoading(true);
      const filterInput = buildFilterInput(filterToApply ?? appliedFilters);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            query ListReservations($filter: ReservationFilterInput) {
              reservations(filter: $filter) {
                id originId guestName guestEmail status checkInDate checkOutDate
                totalPrice payedPrice currency roomIds accountId version createdAt
              }
            }
          `,
          variables: { filter: filterInput },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to fetch reservations');
      setReservations(result.data?.reservations ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reservations');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, buildFilterInput]);

  useEffect(() => {
    fetchReservations();
    fetchRooms();
    fetchRecentActivity();
  }, [fetchReservations, fetchRooms, fetchRecentActivity]);

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    fetchReservations(filters);
  };

  const handleClearFilters = () => {
    setFilters(emptyFilter);
    setAppliedFilters(emptyFilter);
    fetchReservations(emptyFilter);
  };

  const activeFilterCount = Object.values(appliedFilters).filter(v => v !== '').length;

  const toggleRoomSelection = (roomId: string) => {
    setFormData(prev => ({
      ...prev,
      roomIds: prev.roomIds.includes(roomId)
        ? prev.roomIds.filter(id => id !== roomId)
        : [...prev.roomIds, roomId],
    }));
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation CreateReservation($input: CreateReservationInput!) {
              createReservation(input: $input) {
                reservation { id guestName status }
                account { id }
                events { id type }
              }
            }
          `,
          variables: {
            input: {
              originId: formData.originId || `WEB-${Date.now()}`,
              guestFirstName: formData.guestFirstName,
              guestLastName: formData.guestLastName,
              guestEmail: formData.guestEmail,
              checkInDate: formData.checkInDate,
              checkOutDate: formData.checkOutDate,
              totalPrice: formData.totalPrice !== '' ? parseFloat(String(formData.totalPrice)) : null,
              payedPrice: formData.payedPrice !== '' ? parseFloat(String(formData.payedPrice)) : 0,
              currency: formData.currency,
              roomIds: formData.roomIds,
            },
          },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to create reservation');
      setFormData({ originId: '', guestFirstName: '', guestLastName: '', guestEmail: '', checkInDate: '', checkOutDate: '', totalPrice: '', payedPrice: '', currency: 'EUR', roomIds: [] });
      setShowForm(false);
      fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main
        className="flex-1 px-8 py-8"
        style={{ marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }} className="text-[2.75rem] font-bold tracking-tight mb-1">
                {t('bookings.title')}
              </h1>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">{t('bookings.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{ background: showForm ? 'var(--surface-hover)' : 'var(--gold)', color: showForm ? 'var(--text-secondary)' : 'var(--background)', border: showForm ? '1px solid var(--card-border)' : 'none' }}
              className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-md hover:opacity-90 transition-opacity"
            >
              <PlusIcon />
              {showForm ? t('common.cancel') : t('bookings.newReservation')}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }} className="px-4 py-3 rounded-md text-[13px] flex items-center justify-between mb-5">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-4 hover:opacity-70">✕</button>
            </div>
          )}

          {/* Create Form */}
          {showForm && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6 mb-5">
              <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold leading-none mb-5">
                {t('bookings.createNew')}
              </h2>
              <form onSubmit={handleCreateReservation} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: `${t('bookings.firstName')} *`, key: 'guestFirstName', type: 'text', placeholder: 'John', required: true },
                    { label: `${t('bookings.lastName')} *`, key: 'guestLastName', type: 'text', placeholder: 'Doe', required: true },
                    { label: `${t('common.email')} *`, key: 'guestEmail', type: 'email', placeholder: 'john@example.com', required: true },
                    { label: `${t('bookings.checkInDate')} *`, key: 'checkInDate', type: 'date', placeholder: '', required: true },
                    { label: `${t('bookings.checkOutDate')} *`, key: 'checkOutDate', type: 'date', placeholder: '', required: true },
                    { label: t('bookings.totalPrice'), key: 'totalPrice', type: 'number', placeholder: '299.99', required: false },
                    { label: t('bookings.payedPrice'), key: 'payedPrice', type: 'number', placeholder: '0.00', required: false },
                    { label: t('bookings.originId'), key: 'originId', type: 'text', placeholder: 'BOOKING-123 (auto-generated if empty)', required: false },
                  ].map(({ label, key, type, placeholder, required }) => (
                    <div key={key}>
                      <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{label}</label>
                      <input
                        type={type}
                        required={required}
                        value={String(formData[key as keyof CreateReservationInput])}
                        onChange={(e) => setFormData({ ...formData, [key]: type === 'number' ? (e.target.value === '' ? '' : parseFloat(e.target.value)) : e.target.value })}
                        placeholder={placeholder}
                        className={inputClass}
                        style={inputStyle}
                        min={type === 'number' ? '0' : undefined}
                        step={type === 'number' ? '0.01' : undefined}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('bookings.currency')}</label>
                    <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className={inputClass} style={inputStyle}>
                      {['EUR', 'USD', 'GBP', 'CZK'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Room multi-select */}
                <div>
                  <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2">
                    {t('bookings.rooms')}
                    {formData.roomIds.length > 0 && (
                      <span style={{ color: 'var(--gold)', background: 'rgba(201,169,110,0.15)' }} className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {formData.roomIds.length} {t('bookings.selected')}
                      </span>
                    )}
                  </label>
                  {rooms.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }} className="text-[12px]">{t('bookings.noRoomAssigned')}</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                      {rooms.map((room) => {
                        const isSelected = formData.roomIds.includes(room.id);
                        return (
                          <label
                            key={room.id}
                            className="flex items-center gap-2 p-2 rounded-md cursor-pointer text-[12px]"
                            style={{
                              border: isSelected ? `1px solid var(--gold)` : '1px solid var(--card-border)',
                              background: isSelected ? 'rgba(201,169,110,0.08)' : 'var(--surface)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRoomSelection(room.id)}
                              className="rounded"
                              style={{ accentColor: 'var(--gold)' }}
                            />
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: room.color }} />
                            <span style={{ color: 'var(--text-secondary)' }} className="truncate">#{room.roomNumber}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                    className="px-5 py-2 text-[12.5px] font-medium rounded-md hover:opacity-80 transition-opacity"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    style={{ background: 'var(--gold)', color: 'var(--background)' }}
                    className="px-5 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {creating ? t('common.creating') : t('bookings.createReservation')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters Panel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl mb-5 overflow-hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left"
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--text-muted)' }}><FilterIcon /></span>
                <span style={{ color: 'var(--text-primary)' }} className="text-[13px] font-medium">{t('common.filters')}</span>
                {activeFilterCount > 0 && (
                  <span style={{ color: 'var(--gold)', background: 'rgba(201,169,110,0.15)' }} className="text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <span style={{ color: 'var(--text-muted)' }}><ChevronIcon up={showFilters} /></span>
            </button>

            {showFilters && (
              <div style={{ borderTop: '1px solid var(--card-border)' }} className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('filters.status')}</label>
                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={inputClass} style={inputStyle}>
                      <option value="">{t('filters.allStatuses')}</option>
                      <option value="PENDING">{t('filters.pending')}</option>
                      <option value="CONFIRMED">{t('filters.confirmed')}</option>
                      <option value="CANCELLED">{t('filters.cancelled')}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('filters.guestName')}</label>
                    <input type="text" value={filters.guestName} onChange={(e) => setFilters({ ...filters, guestName: e.target.value })} placeholder="Search by name..." className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('bookings.currency')}</label>
                    <select value={filters.currency} onChange={(e) => setFilters({ ...filters, currency: e.target.value })} className={inputClass} style={inputStyle}>
                      <option value="">{t('filters.allCurrencies')}</option>
                      {['EUR', 'USD', 'GBP', 'CZK'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {[
                    { label: t('filters.checkInFrom'), key: 'checkInFrom' },
                    { label: t('filters.checkInTo'), key: 'checkInTo' },
                    { label: t('filters.checkOutFrom'), key: 'checkOutFrom' },
                    { label: t('filters.checkOutTo'), key: 'checkOutTo' },
                    { label: t('filters.createdFrom'), key: 'createdFrom' },
                    { label: t('filters.createdTo'), key: 'createdTo' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{label}</label>
                      <input type="date" value={filters[key as keyof ReservationFilter]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} className={inputClass} style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-5 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <button onClick={handleClearFilters} style={{ color: 'var(--text-secondary)' }} className="px-4 py-2 text-[12.5px] font-medium rounded-md hover:opacity-70 transition-opacity">
                    {t('common.clearAll')}
                  </button>
                  <button onClick={handleApplyFilters} style={{ background: 'var(--gold)', color: 'var(--background)' }} className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity">
                    {t('common.applyFilters')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reservations Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold leading-none">
                {t('bookings.reservations')}
                {activeFilterCount > 0 && <span style={{ color: 'var(--text-muted)' }} className="ml-2 text-[13px] font-normal">— {t('bookings.filtered')}</span>}
              </h2>
              <button
                onClick={() => fetchReservations()}
                disabled={loading}
                style={{ color: 'var(--text-secondary)' }}
                className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium rounded-md hover:opacity-70 transition-opacity disabled:opacity-50"
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <RefreshIcon spin={loading} />
                {t('common.refresh')}
              </button>
            </div>

            {loading ? (
              <div style={{ color: 'var(--text-muted)' }} className="py-16 text-center text-[13px] animate-pulse">{t('bookings.loadingReservations')}</div>
            ) : reservations.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }} className="py-16 text-center">
                <p style={{ color: 'var(--text-primary)' }} className="text-[15px] font-semibold mb-1">
                  {activeFilterCount > 0 ? t('bookings.noMatching') : t('bookings.noReservations')}
                </p>
                <p className="text-[12px]">{activeFilterCount > 0 ? 'Try adjusting your filters' : t('bookings.createFirst')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)' }}>
                      {[t('bookings.guest'), t('filters.status'), t('bookings.rooms'), t('bookings.checkIn'), t('bookings.checkOut'), t('bookings.totalPrice'), t('accounts.account'), t('common.created')].map((h) => (
                        <th key={h} style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)' }} className="text-left px-5 py-3 text-[9px] font-semibold tracking-[0.2em] uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((reservation, i) => {
                      const reservationRooms = rooms.filter(r => reservation.roomIds.includes(r.id));
                      const statusColor = STATUS_COLORS[reservation.status] ?? '#C9A96E';
                      return (
                        <tr
                          key={reservation.id}
                          style={{ borderBottom: i < reservations.length - 1 ? '1px solid var(--card-border)' : 'none', cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          onClick={() => router.push(`/hotel-cms/bookings/${reservation.id}`)}
                        >
                          <td className="px-5 py-4">
                            <div style={{ color: 'var(--text-primary)' }} className="text-[13px] font-semibold">{reservation.guestName}</div>
                            {reservation.guestEmail && <div style={{ color: 'var(--text-muted)' }} className="text-[11px]">{reservation.guestEmail}</div>}
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: statusColor, background: statusColor + '1A' }} className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md">
                              {reservation.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {reservationRooms.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {reservationRooms.map(room => (
                                  <div key={room.id} className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: room.color }} />
                                    <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">#{room.roomNumber}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: 'var(--text-secondary)' }} className="text-[13px] tabular-nums">{reservation.checkInDate}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: 'var(--text-secondary)' }} className="text-[13px] tabular-nums">{reservation.checkOutDate}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: 'var(--text-primary)',  }} className="font-bold tabular-nums text-[13px]">
                              {reservation.totalPrice != null ? reservation.totalPrice.toLocaleString('en-US', { style: 'currency', currency: reservation.currency || 'EUR' }) : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {reservation.accountId ? (
                              <span
                                onClick={(e) => { e.stopPropagation(); router.push(`/hotel-cms/accounts/${reservation.accountId}`); }}
                                style={{ color: '#A78BFA', background: 'rgba(167,139,250,0.10)' }}
                                className="inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-md cursor-pointer hover:opacity-80"
                              >
                                #{reservation.accountId}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: 'var(--text-muted)' }} className="text-[11px] tabular-nums">
                              {reservation.createdAt ? new Date(reservation.createdAt).toLocaleDateString() : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Activity Feed */}
          {recentActivity.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ color: 'var(--text-primary)' }} className="text-[15px] font-semibold">Recent Activity</h3>
                <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">Latest events across all bookings</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {recentActivity.map((ev) => {
                  const COLOR: Record<string, string> = {
                    ReservationCreated: '#A78BFA',
                    ReservationConfirmed: '#4ADE80',
                    ReservationCancelled: '#FB7185',
                    RoomsAssigned: '#60B8D4',
                    AccountCreated: '#FBBF24',
                  };
                  const LABEL: Record<string, string> = {
                    ReservationCreated: 'Created',
                    ReservationConfirmed: 'Confirmed',
                    ReservationCancelled: 'Cancelled',
                    RoomsAssigned: 'Room assigned',
                    AccountCreated: 'Account opened',
                  };
                  const color = COLOR[ev.type] ?? 'var(--gold)';
                  const label = LABEL[ev.type] ?? ev.type;

                  let actor: string | null = null;
                  let detail: string | null = null;
                  try {
                    const d = JSON.parse(ev.data) as Record<string, unknown>;
                    if (ev.type === 'ReservationConfirmed') actor = (d.confirmedBy as string) || 'Reception';
                    if (ev.type === 'ReservationCancelled') detail = d.reason as string;
                    if (ev.type === 'RoomsAssigned') {
                      const ids = d.roomIds as string[] | undefined;
                      detail = ids?.length ? `${ids.length} room${ids.length > 1 ? 's' : ''}` : null;
                    }
                  } catch { /* ok */ }

                  const diffMs = Date.now() - new Date(ev.occurredAt).getTime();
                  const diffMin = Math.floor(diffMs / 60000);
                  const timeLabel = diffMin < 1 ? 'just now' : diffMin < 60 ? `${diffMin}m ago` : diffMin < 1440 ? `${Math.floor(diffMin / 60)}h ago` : new Date(ev.occurredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

                  return (
                    <div
                      key={ev.id}
                      onClick={() => router.push(`/hotel-cms/bookings/${ev.streamId}`)}
                      style={{ background: 'var(--surface-hover)', border: `1px solid ${color}22`, cursor: 'pointer' }}
                      className="flex items-center gap-3 p-3 rounded-lg hover:opacity-80 transition-opacity"
                    >
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ background: color + '20', border: `1.5px solid ${color}` }}>
                        <span style={{ color }} className="text-[8px] font-bold">●</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span style={{ color }} className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</span>
                          {actor && <span style={{ color: 'var(--text-muted)' }} className="text-[10px]">· {actor}</span>}
                        </div>
                        <p style={{ color: 'var(--text-primary)' }} className="text-[12px] font-medium truncate">{ev.guestName ?? 'Unknown guest'}</p>
                        {detail && <p style={{ color: 'var(--text-muted)' }} className="text-[10px] truncate">{detail}</p>}
                      </div>
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] tabular-nums flex-shrink-0">{timeLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function BookingsPage() {
  const { t } = useLocale();
  return (
    <Suspense fallback={
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <HotelSidebar />
        <main className="flex-1 px-8 py-8" style={{ marginLeft: 'var(--sidebar-width, 280px)' }}>
          <div style={{ color: 'var(--text-muted)' }} className="text-center py-16 text-[13px] animate-pulse">{t('common.loading')}</div>
        </main>
      </div>
    }>
      <BookingsPageContent />
    </Suspense>
  );
}
