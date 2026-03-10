'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ArrivingGuestPerson {
  id: number;
  firstname: string;
  surname: string;
}

interface ArrivingGuest {
  id: number;
  hotelName: string;
  bookingId: number;
  idStay: string;
  tier: number;
  tierLabel: string;
  firstname: string;
  surname: string;
  guests: ArrivingGuestPerson[];
  arrival: string;
  departure: string;
  paxCountAdults: number;
  paxCountChildren: number;
  paxCountAgeGroup1: number;
  paxCountAgeGroup2: number;
  paxCountAgeGroup3: number;
  paxCountAgeGroup4: number;
  roomType: string;
  roomRateCode: string;
  roomResType: string;
  roomState: string;
  provider: string;
  roomCode: string | null;
  benefits: string[];
  inventoryItems: string[];
  deepLink: string;
}

interface ArrivingGuestsPage {
  items: ArrivingGuest[];
  total: number;
  totalRooms: number;
  totalGuests: number;
  page: number;
  limit: number;
  totalPages: number;
}

type ArrivalPeriod = 'today' | 'tomorrow' | 'days7';

// ── GQL ────────────────────────────────────────────────────────────────────────

const LIST_QUERY = `
  query ArrivingGuests($filter: ArrivingGuestsFilter, $page: Int, $limit: Int) {
    arrivingGuests(filter: $filter, page: $page, limit: $limit) {
      total totalRooms totalGuests page limit totalPages
      items {
        id hotelName bookingId idStay
        tier tierLabel
        firstname surname
        guests { id firstname surname }
        arrival departure
        paxCountAdults paxCountChildren
        roomType roomRateCode roomResType roomState
        provider roomCode
        benefits inventoryItems
        deepLink
      }
    }
  }
`;

// ── Hotel name list ────────────────────────────────────────────────────────────

const HOTEL_NAMES = [
  'OREA Congress Hotel Brno',
  'OREA Hotel Angelo Praha',
  'OREA Hotel Arigone Olomouc',
  'Orea Hotel Pyramida Prague',
  'OREA Hotel Špicák Šumava',
  'OREA Hotel Voro Brno',
  'OREA Place Marienbad',
  'OREA Place Seno',
  'OREA Resort Devet Skal',
  'OREA Resort Horal Špindleruv Mlýn',
  'OREA Resort Horizont Šumava',
  'OREA Resort Panorama Moravský kras',
  'OREA Resort Santon Brno',
  'OREA Resort Sklár Harrachov',
  'OREA Spa Hotel Bohemia Mariánské Lázne',
  'OREA Spa Hotel Cristal',
  'OREA Spa Hotel Palace Zvon Mariánské Lázne',
  "OREA Hotel Andel's",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<ArrivalPeriod, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  days7: 'Next 7 Days',
};

const TIER_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: '#F5F5F4', text: '#78716C', label: 'Newcomer' },
  2: { bg: '#EFF6FF', text: '#3B82F6', label: 'Silver' },
  3: { bg: '#FFF8E1', text: '#CA8A04', label: 'Gold' },
  4: { bg: '#F5F3FF', text: '#7C3AED', label: 'Platinum' },
};

const PROVIDER_COLORS: Record<string, string> = {
  'Booking.com': '#003B95',
  'Expedia':     '#FFB900',
  'Direct':      '#1D3557',
  'HotelTime':   '#059669',
  'Airbnb':      '#FF385C',
};

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

function nightCount(arrival: string, departure: string): number {
  const a = new Date(arrival).getTime();
  const b = new Date(departure).getTime();
  return Math.round((b - a) / 86400000);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TierBadge({ tier, label }: { tier: number; label: string }) {
  const meta = TIER_COLORS[tier] ?? TIER_COLORS[1];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: meta.bg, color: meta.text,
      borderRadius: 4, padding: '1px 6px',
      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      {tier === 4 && <span style={{ fontSize: 9 }}>★</span>}
      {label}
    </span>
  );
}

function RoomCell({ roomCode, roomState }: { roomCode: string | null; roomState: string }) {
  const isCheckedIn = roomState === 'CheckedIn';
  if (roomCode) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
          color: 'var(--accent)',
          background: 'var(--accent-light)',
          borderRadius: 4, padding: '1px 6px',
        }}>
          {roomCode}
        </span>
        {isCheckedIn && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: '#059669',
            background: '#D1FAE5', borderRadius: 3, padding: '1px 5px',
          }}>
            IN
          </span>
        )}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      color: '#CA8A04', fontSize: 11,
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </svg>
      No room
    </span>
  );
}

function ProviderDot({ provider }: { provider: string }) {
  const color = PROVIDER_COLORS[provider] ?? '#6B7280';
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color, flexShrink: 0,
        boxShadow: `0 0 0 2px ${color}22`,
      }} />
      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{provider}</span>
    </span>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>—</span>;
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {items.map((item, i) => (
        <span key={i} style={{
          fontSize: 10, fontWeight: 500,
          color, background: `${color}15`,
          borderRadius: 3, padding: '1px 5px',
          border: `1px solid ${color}30`,
        }}>
          {item}
        </span>
      ))}
    </span>
  );
}

function GuestNames({ guests, firstname, surname }: {
  guests: ArrivingGuestPerson[];
  firstname: string;
  surname: string;
}) {
  const names = guests.length
    ? guests.map(g => `${g.firstname} ${g.surname}`)
    : [`${firstname} ${surname}`];

  return (
    <span>
      <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{names[0]}</span>
      {names.length > 1 && (
        <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}> +{names.length - 1}</span>
      )}
    </span>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 12,
      flex: 1, minWidth: 140,
    }}>
      <span style={{
        width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--accent-light)',
        borderRadius: 8, color: 'var(--accent)', flexShrink: 0,
      }}>
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--fg)', lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2, letterSpacing: '0.03em' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function ArrivingGuestsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [period, setPeriod] = useState<ArrivalPeriod>(
    (searchParams.get('period') as ArrivalPeriod) ?? 'today'
  );
  const [hotelName, setHotelName] = useState<string>(searchParams.get('hotel') ?? '');
  const [checkedIn, setCheckedIn] = useState<boolean | null>(() => {
    const v = searchParams.get('checkedIn');
    return v === 'true' ? true : v === 'false' ? false : null;
  });
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ArrivingGuestsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: Record<string, unknown> = { period };
      if (hotelName) filter.hotelName = hotelName;
      if (checkedIn !== null) filter.checkedIn = checkedIn;

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: LIST_QUERY, variables: { filter, page, limit: 25 } }),
      });
      const json = await res.json();
      if (json.errors?.length) throw new Error(json.errors[0].message);
      setData(json.data.arrivingGuests);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period, hotelName, checkedIn, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [period, hotelName, checkedIn]);

  // Persist filters in URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('period', period);
    if (hotelName) params.set('hotel', hotelName);
    if (checkedIn !== null) params.set('checkedIn', String(checkedIn));
    if (search) params.set('q', search);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [period, hotelName, checkedIn, search, router]);

  const q = search.trim().toLowerCase();
  const visibleItems = (data?.items ?? [])
    .filter(g => {
      if (!q) return true;
      return (
        String(g.bookingId).includes(q) ||
        g.firstname.toLowerCase().includes(q) ||
        g.surname.toLowerCase().includes(q) ||
        g.guests.some(p => `${p.firstname} ${p.surname}`.toLowerCase().includes(q)) ||
        g.hotelName.toLowerCase().includes(q) ||
        g.provider.toLowerCase().includes(q) ||
        (g.roomCode ?? '').toLowerCase().includes(q) ||
        g.roomRateCode.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // No-room guests float to top — they need urgent attention
      const aUrgent = !a.roomCode ? 0 : 1;
      const bUrgent = !b.roomCode ? 0 : 1;
      return aUrgent - bUrgent;
    });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--fg)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Arriving Guests
          </h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: 13, margin: '4px 0 0', lineHeight: 1.4 }}>
            Upcoming reservations and check-in overview
          </p>
        </div>
        <Link
          href="/reception/arriving-guests/calendar"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px',
            borderRadius: 8,
            background: 'var(--accent)',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 13, fontWeight: 500,
            letterSpacing: '-0.01em',
            boxShadow: '0 1px 4px rgba(29,53,87,0.25)',
            transition: 'opacity 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          7-Day Calendar
        </Link>
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        marginBottom: 20,
      }}>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="Search by ID, guest, hotel, provider…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '6px 12px 6px 30px', width: 230,
              background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
              borderRadius: 8, color: 'var(--fg)', fontSize: 13,
              fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        {/* Period tabs */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 8,
          padding: 3,
          gap: 2,
        }}>
          {(['today', 'tomorrow', 'days7'] as ArrivalPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: period === p ? 600 : 400,
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? '#fff' : 'var(--fg-muted)',
                transition: 'all 0.15s',
                letterSpacing: period === p ? '-0.01em' : '0',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Hotel dropdown */}
        <div style={{ position: 'relative' }}>
          <select
            value={hotelName}
            onChange={e => setHotelName(e.target.value)}
            style={{
              appearance: 'none',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: '6px 32px 6px 12px',
              fontSize: 12.5,
              color: hotelName ? 'var(--fg)' : 'var(--fg-subtle)',
              cursor: 'pointer',
              minWidth: 200,
              fontFamily: 'var(--font-body)',
            }}
          >
            <option value="">All Hotels</option>
            {HOTEL_NAMES.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="var(--fg-subtle)" strokeWidth="2.5"
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>

        {/* Checked-in toggle */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 8,
          padding: 3, gap: 2,
        }}>
          {([null, true, false] as (boolean | null)[]).map((val) => {
            const label = val === null ? 'All' : val ? 'Checked in' : 'Not checked in';
            const active = checkedIn === val;
            return (
              <button
                key={String(val)}
                onClick={() => setCheckedIn(val)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  background: active
                    ? val === true ? '#059669' : val === false ? '#DC2626' : 'var(--accent)'
                    : 'transparent',
                  color: active ? '#fff' : 'var(--fg-muted)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {val === true && <span style={{ marginRight: 4 }}>●</span>}
                {val === false && <span style={{ marginRight: 4, opacity: 0.6 }}>○</span>}
                {label}
              </button>
            );
          })}
        </div>

        {/* Reset */}
        {(hotelName || checkedIn !== null || search) && (
          <button
            onClick={() => { setHotelName(''); setCheckedIn(null); setSearch(''); }}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: 'transparent', cursor: 'pointer',
              fontSize: 12, color: 'var(--fg-muted)',
            }}
          >
            ✕ Reset
          </button>
        )}
      </div>

      {/* ── Stats bar ── */}
      {data && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <StatCard label="Reservations" value={data.total} icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          } />
          <StatCard label="Rooms" value={data.totalRooms} icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>
            </svg>
          } />
          <StatCard label="Guests" value={data.totalGuests} icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          } />
          {data.totalPages > 1 && (
            <StatCard label={`Page ${data.page} of ${data.totalPages}`} value={`${(data.page - 1) * 25 + 1}–${Math.min(data.page * 25, data.total)}`} icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            } />
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: 'var(--status-red-bg)',
          border: '1px solid var(--status-red-border)',
          borderRadius: 8, padding: '12px 16px',
          color: 'var(--status-red)', fontSize: 13, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 52, borderRadius: 8, animationDelay: `${i * 0.05}s` }}
            />
          ))}
        </div>
      )}

      {/* ── Table ── */}
      {!loading && data && (
        <>
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border-strong)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '90px 90px 1fr 1fr 90px 110px 80px 100px 1fr 1fr',
              gap: '0 12px',
              padding: '9px 16px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-strong)',
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
            }}>
              <div>Booking</div>
              <div>Room</div>
              <div>Guest(s)</div>
              <div>Hotel</div>
              <div>Type</div>
              <div>Dates</div>
              <div>Pax</div>
              <div>Rate / Provider</div>
              <div>Benefits</div>
              <div>Inventory</div>
            </div>

            {/* Rows */}
            {visibleItems.length === 0 && (
              <div style={{
                padding: '48px 16px',
                textAlign: 'center',
                color: 'var(--fg-subtle)',
                fontSize: 14,
              }}>
                {search ? `No results for "${search}"` : 'No arriving guests for this period'}
              </div>
            )}

            {visibleItems.map((guest, idx) => {
              const nights = nightCount(guest.arrival, guest.departure);
              const isChecked = guest.roomState === 'CheckedIn';
              const noRoom = !guest.roomCode;

              return (
                <div
                  key={guest.id}
                  className="animate-fade-up"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 90px 1fr 1fr 90px 110px 80px 100px 1fr 1fr',
                    gap: '0 12px',
                    padding: '12px 16px',
                    borderBottom: idx < visibleItems.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center',
                    animationDelay: `${idx * 0.025}s`,
                    transition: 'background 0.1s',
                    boxShadow: noRoom ? 'inset 3px 0 0 0 #F59E0B' : undefined,
                    background: noRoom ? '#FFFBEB' : 'transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = noRoom ? '#FEF3C7' : 'var(--bg-surface)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = noRoom ? '#FFFBEB' : 'transparent'}
                >
                  {/* Booking ID */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 500,
                      color: 'var(--accent)',
                    }}>
                      #{guest.bookingId}
                    </span>
                    <TierBadge tier={guest.tier} label={guest.tierLabel} />
                  </div>

                  {/* Room */}
                  <div>
                    <RoomCell roomCode={guest.roomCode ?? null} roomState={guest.roomState} />
                  </div>

                  {/* Guests */}
                  <div style={{ fontSize: 13, minWidth: 0 }}>
                    <GuestNames
                      guests={guest.guests}
                      firstname={guest.firstname}
                      surname={guest.surname}
                    />
                  </div>

                  {/* Hotel */}
                  <div style={{
                    fontSize: 11.5, color: 'var(--fg-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {guest.hotelName}
                  </div>

                  {/* Room type */}
                  <div>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
                      background: 'var(--bg-elevated)',
                      color: 'var(--fg-muted)',
                      borderRadius: 4, padding: '2px 6px',
                    }}>
                      {guest.roomType}
                    </span>
                  </div>

                  {/* Dates */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>
                      {fmtDate(guest.arrival)} → {fmtDate(guest.departure)}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>
                      {nights} night{nights !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Pax */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span title="Adults" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
                      </svg>
                      <span style={{ color: 'var(--fg)' }}>{guest.paxCountAdults}</span>
                    </span>
                    {guest.paxCountChildren > 0 && (
                      <span title="Children" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2">
                          <circle cx="12" cy="8" r="4"/><path d="M8 14c-3 1-5 3-5 5h18c0-2-2-4-5-5"/>
                        </svg>
                        <span style={{ color: 'var(--fg-subtle)' }}>{guest.paxCountChildren}</span>
                      </span>
                    )}
                  </div>

                  {/* Rate / Provider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10.5,
                      color: 'var(--fg-muted)',
                    }}>
                      {guest.roomRateCode}
                    </span>
                    <ProviderDot provider={guest.provider} />
                  </div>

                  {/* Benefits */}
                  <div>
                    <TagList items={guest.benefits} color="#1D3557" />
                  </div>

                  {/* Inventory */}
                  <div>
                    <TagList items={guest.inventoryItems} color="#059669" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {data.totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 20,
            }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{
                  padding: '6px 14px', borderRadius: 7,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface)',
                  cursor: page <= 1 ? 'default' : 'pointer',
                  color: page <= 1 ? 'var(--fg-subtle)' : 'var(--fg)',
                  fontSize: 13,
                }}
              >
                ← Prev
              </button>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - page) <= 2)
                .map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: 34, height: 34, borderRadius: 7,
                      border: '1px solid',
                      borderColor: p === page ? 'var(--accent)' : 'var(--border-strong)',
                      background: p === page ? 'var(--accent)' : 'var(--bg-surface)',
                      color: p === page ? '#fff' : 'var(--fg)',
                      cursor: 'pointer', fontSize: 13, fontWeight: p === page ? 600 : 400,
                    }}
                  >
                    {p}
                  </button>
                ))}
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{
                  padding: '6px 14px', borderRadius: 7,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface)',
                  cursor: page >= data.totalPages ? 'default' : 'pointer',
                  color: page >= data.totalPages ? 'var(--fg-subtle)' : 'var(--fg)',
                  fontSize: 13,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ArrivingGuestsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: 'var(--fg-subtle)' }}>Loading…</div>}>
      <ArrivingGuestsInner />
    </Suspense>
  );
}
