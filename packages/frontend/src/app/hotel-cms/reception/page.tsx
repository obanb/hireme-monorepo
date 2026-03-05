'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HotelSidebar from '@/components/HotelSidebar';
import ComposeEmailModal from '@/components/ComposeEmailModal';
import CheckInWizard from '@/components/CheckInWizard';
import { useLocale } from '@/context/LocaleContext';
import { useToast } from '@/context/ToastContext';

interface GuestTier {
  tier: { name: string; color: string } | null;
  reservationCount: number;
  totalSpend: number;
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
  currency: string;
  roomIds: string[];
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

type DateFilter = 'today' | 'tomorrow' | 'week' | 'custom';
type StatusFilter = 'all' | 'PENDING' | 'CONFIRMED';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

function formatDate(date: Date): string { return date.toISOString().split('T')[0]; }
function getToday(): string { return formatDate(new Date()); }
function getTomorrow(): string { const t = new Date(); t.setDate(t.getDate() + 1); return formatDate(t); }
function getWeekEnd(): string { const t = new Date(); t.setDate(t.getDate() + 7); return formatDate(t); }
function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function getDaysDiff(d1: string, d2: string): number {
  return Math.ceil((new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 60 * 60 * 24));
}

const inputStyle = { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' };

export default function ReceptionPage() {
  const { t } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guestTierMap, setGuestTierMap] = useState<Map<string, GuestTier>>(new Map());
  const [loading, setLoading] = useState(true);
  const [emailTarget, setEmailTarget] = useState<{ to: string; toName: string } | null>(null);
  const [wizardReservation, setWizardReservation] = useState<Reservation | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customDateFrom, setCustomDateFrom] = useState(getToday());
  const [customDateTo, setCustomDateTo] = useState(getToday());

  const dateRange = useMemo(() => {
    switch (dateFilter) {
      case 'today': return { from: getToday(), to: getToday() };
      case 'tomorrow': return { from: getTomorrow(), to: getTomorrow() };
      case 'week': return { from: getToday(), to: getWeekEnd() };
      case 'custom': return { from: customDateFrom, to: customDateTo };
    }
  }, [dateFilter, customDateFrom, customDateTo]);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ query: `{ rooms { id name roomNumber type capacity status color } }` }),
      });
      const json = await res.json();
      if (!json.errors) setRooms(json.data?.rooms ?? []);
    } catch { /* silent */ }
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          query: `query($filter: ReservationFilterInput) { reservations(filter: $filter) { id originId guestName status checkInDate checkOutDate guestEmail totalPrice currency roomIds version createdAt } }`,
          variables: { filter: { checkInFrom: dateRange.from, checkInTo: dateRange.to } },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setReservations(json.data?.reservations ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch reservations');
    } finally { setLoading(false); }
  }, [dateRange, toast]);

  useEffect(() => { fetchReservations(); fetchRooms(); }, [fetchReservations, fetchRooms]);

  useEffect(() => {
    const emails = [...new Set(reservations.map((r) => r.guestEmail).filter(Boolean) as string[])];
    if (!emails.length) return;
    Promise.all(emails.map((email) =>
      fetch(GRAPHQL_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ query: `query($email:String!){guestTierInfo(email:$email){tier{name color}reservationCount totalSpend}}`, variables: { email } }),
      }).then(r => r.json()).then(j => ({ email, data: j.data?.guestTierInfo ?? null })).catch(() => ({ email, data: null }))
    )).then(results => {
      const map = new Map<string, GuestTier>();
      results.forEach(({ email, data }) => { if (data) map.set(email, data); });
      setGuestTierMap(map);
    });
  }, [reservations]);

  const filteredReservations = useMemo(() => reservations
    .filter(r => {
      if (r.status === 'CANCELLED') return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.guestName?.toLowerCase().includes(q) || r.originId?.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate) || (a.status === 'PENDING' ? -1 : 1)),
  [reservations, statusFilter, searchQuery]);

  const groupedReservations = useMemo(() => {
    const groups: Record<string, Reservation[]> = {};
    filteredReservations.forEach(r => { (groups[r.checkInDate] ??= []).push(r); });
    return groups;
  }, [filteredReservations]);

  // Keyboard navigation on arrivals list (↑↓ to move, Enter to open wizard)
  useEffect(() => {
    if (wizardReservation) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, filteredReservations.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && selectedIdx >= 0) {
        e.preventDefault();
        const res = filteredReservations[selectedIdx];
        if (res) setWizardReservation(res);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [wizardReservation, selectedIdx, filteredReservations]);

  const stats = useMemo(() => ({
    total: filteredReservations.length,
    pending: filteredReservations.filter(r => r.status === 'PENDING').length,
    confirmed: filteredReservations.filter(r => r.status === 'CONFIRMED').length,
    noRoom: filteredReservations.filter(r => r.roomIds.length === 0).length,
  }), [filteredReservations]);

  const getRoom = (roomIds: string[]) => roomIds.length ? rooms.find(r => r.id === roomIds[0]) ?? null : null;

  const getDateLabel = (d: string) => d === getToday() ? 'Today' : d === getTomorrow() ? 'Tomorrow' : formatDisplayDate(d);

  const mainStyle = { marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' };

  const statCards = [
    { label: t('reception.todayArrivals'), value: stats.total, color: '#60B8D4' },
    { label: t('filters.pending'), value: stats.pending, color: '#FBBF24' },
    { label: t('reception.inHouse'), value: stats.confirmed, color: '#4ADE80' },
    { label: 'No Room Assigned', value: stats.noRoom, color: '#FB7185' },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main className="flex-1 px-8 py-8" style={mainStyle}>
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }} className="text-[2.75rem] font-bold tracking-tight mb-1">
                {t('reception.title')}
              </h1>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">{t('reception.subtitle')}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Link
                href="/hotel-cms/predictions"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Predictions
              </Link>
              <div className="text-right">
                <p style={{ color: 'var(--text-muted)' }} className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Current Date</p>
                <p style={{ color: 'var(--text-primary)' }} className="text-[1.4rem] font-bold">{formatDisplayDate(getToday())}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {statCards.map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-5">
                <p style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold tracking-[0.2em] uppercase mb-2">{label}</p>
                <p style={{ color,  }} className="text-[2rem] font-bold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date tabs */}
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--background)' }}>
                {(['today', 'tomorrow', 'week', 'custom'] as DateFilter[]).map((f) => (
                  <button key={f} onClick={() => setDateFilter(f)}
                    style={dateFilter === f
                      ? { background: 'var(--gold)', color: 'var(--background)' }
                      : { color: 'var(--text-secondary)', background: 'transparent' }}
                    className="px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all capitalize"
                  >
                    {f === 'today' ? 'Today' : f === 'tomorrow' ? 'Tomorrow' : f === 'week' ? 'This Week' : 'Custom'}
                  </button>
                ))}
              </div>

              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)}
                    className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                  <input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)}
                    className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
                </div>
              )}

              <div style={{ width: 1, height: 24, background: 'var(--card-border)' }} />

              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle}>
                <option value="all">{t('common.all')}</option>
                <option value="PENDING">{t('filters.pending')}</option>
                <option value="CONFIRMED">{t('filters.confirmed')}</option>
              </select>

              <input type="text" placeholder={t('reception.searchGuest')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />

              <button onClick={fetchReservations} disabled={loading}
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium hover:opacity-80 disabled:opacity-50 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''}>
                  <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('common.refresh')}
              </button>
            </div>
          </div>

          {/* Arrivals list */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--gold)' }} />
            </div>
          ) : filteredReservations.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-16 text-center">
              <p style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold mb-2">{t('reception.noArrivals')}</p>
              <p style={{ color: 'var(--text-muted)' }} className="text-[13px]">No arrivals match the current filter.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedReservations).map(([date, dayRes]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="flex items-center gap-2 px-4 py-1.5 rounded-md">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--gold)' }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
                        <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
                        <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
                      </svg>
                      <span style={{ color: 'var(--text-primary)' }} className="text-[12.5px] font-semibold">{getDateLabel(date)}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">{dayRes.length} arrival{dayRes.length !== 1 ? 's' : ''}</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--card-border)' }} />
                  </div>

                  <div className="space-y-3">
                    {dayRes.map((res) => {
                      const globalIdx = filteredReservations.indexOf(res);
                      const room = getRoom(res.roomIds);
                      const nights = getDaysDiff(res.checkInDate, res.checkOutDate);
                      const isPending = res.status === 'PENDING';
                      const tierInfo = res.guestEmail ? guestTierMap.get(res.guestEmail) : null;
                      const initials = (res.guestName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                      const isSelected = globalIdx === selectedIdx;

                      return (
                        <div key={res.id}
                          onClick={() => setSelectedIdx(globalIdx)}
                          style={{
                            background: 'var(--surface)',
                            border: isSelected
                              ? '1px solid var(--gold)'
                              : `1px solid ${isPending ? 'rgba(251,191,36,0.3)' : 'var(--card-border)'}`,
                            outline: isSelected ? '2px solid rgba(168,120,58,0.2)' : 'none',
                            cursor: 'pointer',
                          }}
                          className="rounded-xl p-5 transition-all">
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                              style={{ background: 'var(--gold)', color: 'var(--background)' }}>
                              {initials}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 style={{ color: 'var(--text-primary)' }} className="text-[15px] font-semibold truncate">{res.guestName}</h3>
                                <span style={{ color: isPending ? '#FBBF24' : '#4ADE80', background: (isPending ? '#FBBF24' : '#4ADE80') + '1A' }}
                                  className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${isPending ? 'animate-pulse' : ''}`}
                                    style={{ background: isPending ? '#FBBF24' : '#4ADE80' }} />
                                  {isPending ? 'Awaiting' : 'Confirmed'}
                                </span>
                                {tierInfo?.tier && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: tierInfo.tier.color }}>
                                    ★ {tierInfo.tier.name}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span style={{ color: 'var(--text-muted)' }} className="font-mono text-[11px]">#{res.originId || res.id.slice(0, 8)}</span>
                                <span style={{ color: 'var(--card-border)' }}>·</span>
                                <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">{nights} night{nights !== 1 ? 's' : ''}</span>
                                <span style={{ color: 'var(--card-border)' }}>·</span>
                                <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">Out: {formatDisplayDate(res.checkOutDate)}</span>
                              </div>
                            </div>

                            {/* Room */}
                            <div className="flex-shrink-0 text-right px-4" style={{ borderLeft: '1px solid var(--card-border)' }}>
                              {room ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ background: room.color }} />
                                  <div>
                                    <p style={{ color: 'var(--text-primary)' }} className="text-[13px] font-semibold">Room #{room.roomNumber}</p>
                                    <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">{room.type}</p>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#FB7185', background: 'rgba(251,113,133,0.1)' }} className="text-[11px] font-semibold px-2 py-1 rounded-md">No Room</span>
                              )}
                            </div>

                            {/* Amount */}
                            <div className="flex-shrink-0 text-right px-4" style={{ borderLeft: '1px solid var(--card-border)' }}>
                              <p style={{ color: 'var(--text-muted)' }} className="text-[9px] uppercase tracking-[0.15em] mb-0.5">Total</p>
                              <p style={{ color: 'var(--text-primary)',  }} className="text-[15px] font-bold tabular-nums">
                                {res.totalPrice?.toLocaleString('en-US', { style: 'currency', currency: res.currency || 'EUR', maximumFractionDigits: 0 }) || '—'}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex-shrink-0 flex items-center gap-2 pl-4" style={{ borderLeft: '1px solid var(--card-border)' }}>
                              {isPending ? (
                                <button onClick={e => { e.stopPropagation(); setWizardReservation(res); }}
                                  style={{ background: 'var(--gold)', color: 'var(--background)' }}
                                  className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
                                    <polyline points="10 17 15 12 10 7" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="15" y1="12" x2="3" y2="12" strokeLinecap="round" />
                                  </svg>
                                  Quick Check-In
                                </button>
                              ) : (
                                <span style={{ color: '#4ADE80', background: 'rgba(74,222,128,0.1)' }} className="px-3 py-2 text-[12px] font-semibold rounded-md flex items-center gap-1">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                  Checked In
                                </span>
                              )}
                              {res.guestEmail && (
                                <button onClick={e => { e.stopPropagation(); setEmailTarget({ to: res.guestEmail!, toName: res.guestName }); }}
                                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                                  className="p-2 rounded-md hover:opacity-80">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                  </svg>
                                </button>
                              )}
                              <button onClick={() => router.push(`/hotel-cms/bookings/${res.id}`)}
                                style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                                className="px-3 py-2 text-[12px] font-medium rounded-md hover:opacity-80">
                                {t('common.view')}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {emailTarget && (
        <ComposeEmailModal to={emailTarget.to} toName={emailTarget.toName} onClose={() => setEmailTarget(null)} />
      )}

      {wizardReservation && (
        <CheckInWizard
          reservation={wizardReservation}
          rooms={rooms}
          tierInfo={wizardReservation.guestEmail ? guestTierMap.get(wizardReservation.guestEmail) ?? null : null}
          onComplete={() => { fetchReservations(); setSelectedIdx(-1); }}
          onClose={() => setWizardReservation(null)}
        />
      )}
    </div>
  );
}
