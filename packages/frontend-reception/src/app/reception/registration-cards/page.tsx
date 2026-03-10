'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ── Bulk PDF progress modal ────────────────────────────────────────────────────

interface BulkProgress { current: number; total: number; phase: 'generating' | 'done' | 'error'; error?: string; }

function BulkProgressModal({ progress, onClose }: { progress: BulkProgress; onClose: () => void }) {
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 14, padding: '28px 32px',
        width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        border: '1px solid var(--border)',
      }}>
        {progress.phase === 'error' ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--status-red)', marginBottom: 8 }}>Error</div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>{progress.error}</div>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Close</button>
          </>
        ) : progress.phase === 'done' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--status-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>
              </span>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Download ready</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 20 }}>
              {progress.total} cards merged — your download should start automatically.
            </div>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Close</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>
              Generating PDF…
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>
              {progress.current} of {progress.total} cards
            </div>
            {/* Progress bar */}
            <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: 'var(--accent)',
                width: `${pct}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textAlign: 'right' }}>{pct}%</div>
          </>
        )}
      </div>
    </div>
  );
}

const ENDPOINT     = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';
const PDF_ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API?.replace('/graphql', '') ?? 'http://localhost:4002';

// ── Hotel list ─────────────────────────────────────────────────────────────────

const HOTEL_NAMES = [
  "OREA Congress Hotel Brno",
  "OREA Hotel Angelo Praha",
  "OREA Hotel Arigone Olomouc",
  "Orea Hotel Pyramida Prague",
  "OREA Hotel Špicák Šumava",
  "OREA Hotel Voro Brno",
  "OREA Place Marienbad",
  "OREA Place Seno",
  "OREA Resort Devet Skal",
  "OREA Resort Horal Špindleruv Mlýn",
  "OREA Resort Horizont Šumava",
  "OREA Resort Panorama Moravský kras",
  "OREA Resort Santon Brno",
  "OREA Resort Sklár Harrachov",
  "OREA Spa Hotel Bohemia Mariánské Lázne",
  "OREA Spa Hotel Cristal",
  "OREA Spa Hotel Palace Zvon Mariánské Lázne",
  "OREA Hotel Andel's",
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface RegCardHotel {
  id: number;
  nameShort: string;
}

interface RegCard {
  id: number;
  idCard: number;
  firstname: string;
  surname: string;
  dateOfBirth: string | null;
  carPlate: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  countryOfResidence: string | null;
  arrival: string;
  departure: string;
  reservationId: number;
  hotel: RegCardHotel;
  room: string | null;
  isDataConfirmed: boolean;
  isGDPRRead: boolean;
  isHouseRulesAccepted: boolean;
}

interface RegCardsPage {
  items: RegCard[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── GQL ────────────────────────────────────────────────────────────────────────

const LIST_QUERY = `
  query RegistrationCards($filter: RegistrationCardsFilter, $page: Int, $limit: Int) {
    registrationCards(filter: $filter, page: $page, limit: $limit) {
      total page limit totalPages
      items {
        id idCard firstname surname dateOfBirth
        carPlate street city zip countryOfResidence
        arrival departure room reservationId
        hotel { id nameShort }
        isDataConfirmed isGDPRRead isHouseRulesAccepted
      }
    }
  }
`;

const LIMIT = 10;

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// ── Status dots ────────────────────────────────────────────────────────────────

function StatusDots({ confirmed, gdpr, rules }: { confirmed: boolean; gdpr: boolean; rules: boolean }) {
  const items = [
    { label: 'Data', ok: confirmed },
    { label: 'GDPR', ok: gdpr },
    { label: 'Rules', ok: rules },
  ];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {items.map(({ label, ok }) => (
        <span
          key={label}
          title={label}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: ok ? 'var(--status-green-bg)' : 'var(--status-red-bg)',
            border: `1px solid ${ok ? 'var(--status-green-border)' : 'var(--status-red-border)'}`,
          }}
        >
          {ok ? (
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="var(--status-green)" strokeWidth="2" strokeLinecap="round">
              <path d="M2 6l3 3 5-5"/>
            </svg>
          ) : (
            <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="var(--status-red)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 3l6 6M9 3l-6 6"/>
            </svg>
          )}
        </span>
      ))}
    </div>
  );
}

// ── Inner page (uses useSearchParams) ─────────────────────────────────────────

function RegistrationCardsInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [data,         setData]         = useState<RegCardsPage | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const page        = Number(searchParams.get('page')    ?? 1);
  const search      = searchParams.get('search')         ?? '';
  const hotelName   = searchParams.get('hotel')          ?? '';
  const arrival     = searchParams.get('arrival')        ?? '';
  const departure   = searchParams.get('departure')      ?? '';
  const dateOfBirth = searchParams.get('dob')            ?? '';

  const startBulkDownload = useCallback(() => {
    const params = new URLSearchParams();
    if (search)      params.set('search',      search);
    if (hotelName)   params.set('hotelName',   hotelName);
    if (arrival)     params.set('arrival',     arrival);
    if (departure)   params.set('departure',   departure);
    if (dateOfBirth) params.set('dateOfBirth', dateOfBirth);
    const qs = params.toString();

    setBulkProgress({ current: 0, total: 0, phase: 'generating' });

    const es = new EventSource(
      `${PDF_ENDPOINT}/api/pdf/registration-cards/bulk-stream${qs ? `?${qs}` : ''}`
    );
    esRef.current = es;

    es.addEventListener('start', (e) => {
      const d = JSON.parse(e.data);
      setBulkProgress({ current: 0, total: d.total, phase: 'generating' });
    });
    es.addEventListener('progress', (e) => {
      const d = JSON.parse(e.data);
      setBulkProgress({ current: d.current, total: d.total, phase: 'generating' });
    });
    es.addEventListener('done', (e) => {
      const d = JSON.parse(e.data);
      es.close();
      setBulkProgress(prev => ({ ...prev!, current: d.total, total: d.total, phase: 'done' }));
      // Trigger download via hidden anchor
      const a = document.createElement('a');
      a.href = `${PDF_ENDPOINT}/api/pdf/registration-cards/download/${d.token}`;
      a.download = 'registration-cards.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    es.addEventListener('error', (e) => {
      es.close();
      const msg = e instanceof MessageEvent ? JSON.parse(e.data)?.message : 'Unknown error';
      setBulkProgress(prev => ({ ...prev!, phase: 'error', error: msg }));
    });
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return;
      es.close();
      setBulkProgress(prev => prev?.phase !== 'done' ? { ...prev!, phase: 'error', error: 'Connection lost.' } : prev);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, hotelName, arrival, departure, dateOfBirth]);

  // local input state for debouncing search
  const [searchInput, setSearchInput] = useState(search);

  const buildParams = useCallback((overrides: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (search)      p.set('search',    search);
    if (hotelName)   p.set('hotel',     hotelName);
    if (arrival)     p.set('arrival',   arrival);
    if (departure)   p.set('departure', departure);
    if (dateOfBirth) p.set('dob',       dateOfBirth);
    p.set('page', String(page));
    Object.entries(overrides).forEach(([k, v]) => v ? p.set(k, String(v)) : p.delete(k));
    return p.toString();
  }, [search, hotelName, arrival, departure, dateOfBirth, page]);

  const navigate = (overrides: Record<string, string | number>) => {
    router.push(`/reception/registration-cards?${buildParams(overrides)}`);
  };

  useEffect(() => {
    setLoading(true);
    const filter: Record<string, string | null> = {
      search:      search      || null,
      hotelName:   hotelName   || null,
      arrival:     arrival     || null,
      departure:   departure   || null,
      dateOfBirth: dateOfBirth || null,
    };
    // remove nulls
    const cleanFilter = Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== null));

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: LIST_QUERY,
        variables: { filter: cleanFilter, page, limit: LIMIT },
      }),
    })
      .then(r => r.json())
      .then(json => setData(json.data?.registrationCards ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [search, hotelName, arrival, departure, dateOfBirth, page]);

  // debounce search input → url
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== search) navigate({ search: searchInput, page: 1 });
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const hasFilters = search || hotelName || arrival || departure || dateOfBirth;

  return (
    <>
    {bulkProgress && (
      <BulkProgressModal
        progress={bulkProgress}
        onClose={() => { esRef.current?.close(); setBulkProgress(null); }}
      />
    )}
    <div>

      {/* ── Page header ── */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center', gap: 14,
        height: 52, flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"/>
          </svg>
          Registration Cards
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
          {loading ? 'Loading…' : `${data?.total ?? 0} records`}
        </div>
        {!loading && data && data.total > 0 && (
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={startBulkDownload}
              disabled={bulkProgress?.phase === 'generating'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 13px', borderRadius: 7,
                border: 'none', background: 'var(--accent)',
                color: '#fff', cursor: bulkProgress?.phase === 'generating' ? 'default' : 'pointer',
                fontSize: 12, fontWeight: 600,
                opacity: bulkProgress?.phase === 'generating' ? 0.7 : 1,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download all ({data.total}) PDF
            </button>
          </div>
        )}
      </div>

    <div style={{ padding: '20px 24px 60px' }}>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: 18,
        background: '#FFFFFF', border: '1px solid var(--border)',
        borderRadius: 10, padding: '12px 14px',
        boxShadow: 'var(--shadow-card)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Name, document, reservation…"
            style={{
              width: '100%', padding: '7px 10px 7px 30px',
              border: '1px solid var(--border)', borderRadius: 7,
              fontSize: 12, color: 'var(--fg)', background: 'var(--bg)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Hotel */}
        <div style={{ position: 'relative' }}>
          <select
            value={hotelName}
            onChange={e => navigate({ hotel: e.target.value, page: 1 })}
            style={{
              appearance: 'none',
              padding: '7px 30px 7px 10px',
              border: '1px solid var(--border)', borderRadius: 7,
              fontSize: 12, color: hotelName ? 'var(--fg)' : 'var(--fg-subtle)',
              background: 'var(--bg)', cursor: 'pointer',
              minWidth: 160, fontFamily: 'var(--font-body)',
            }}
          >
            <option value="">All Hotels</option>
            {HOTEL_NAMES.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2.5"
            style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>

        {/* Arrival */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>Arrival</span>
          <input
            type="date"
            value={arrival}
            onChange={e => navigate({ arrival: e.target.value, page: 1 })}
            style={{
              padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 7,
              fontSize: 12, color: 'var(--fg)', background: 'var(--bg)',
            }}
          />
        </div>

        {/* Departure */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>Departure</span>
          <input
            type="date"
            value={departure}
            onChange={e => navigate({ departure: e.target.value, page: 1 })}
            style={{
              padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 7,
              fontSize: 12, color: 'var(--fg)', background: 'var(--bg)',
            }}
          />
        </div>

        {/* Date of birth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>Birth date</span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={e => navigate({ dob: e.target.value, page: 1 })}
            style={{
              padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 7,
              fontSize: 12, color: 'var(--fg)', background: 'var(--bg)',
            }}
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={() => { setSearchInput(''); router.push('/reception/registration-cards'); }}
            style={{
              padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--fg-muted)', fontSize: 12, cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{
        background: '#FFFFFF', borderRadius: 10,
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '110px 160px 100px 90px 100px 1fr 70px 160px 110px 80px',
          gap: '0 12px', padding: '9px 16px',
          background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
          fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
          letterSpacing: '0.07em', textTransform: 'uppercase',
        }}>
          <div>Res. ID</div>
          <div>Name</div>
          <div>Birth Date</div>
          <div>Card ID</div>
          <div>Car Plate</div>
          <div>Address</div>
          <div>State</div>
          <div>Check-in → Out</div>
          <div>Hotel</div>
          <div>Room</div>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44, borderRadius: 0 }} />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 13 }}>
            No registration cards found.
          </div>
        ) : (
          data.items.map((card, idx) => {
            const allOk = card.isDataConfirmed && card.isGDPRRead && card.isHouseRulesAccepted;
            return (
              <Link
                key={card.id}
                href={`/reception/registration-cards/${card.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 160px 100px 90px 100px 1fr 70px 160px 110px 80px',
                  gap: '0 12px', padding: '11px 16px',
                  textDecoration: 'none', color: 'var(--fg)',
                  borderBottom: idx < data.items.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center',
                  background: allOk ? 'var(--bg-surface)' : 'var(--status-red-bg)',
                  transition: 'background 0.1s',
                  borderLeft: allOk ? '3px solid transparent' : '3px solid var(--status-red-border)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = allOk ? 'var(--bg-hover)' : '#FEE2E2')}
                onMouseLeave={e => (e.currentTarget.style.background = allOk ? 'var(--bg-surface)' : 'var(--status-red-bg)')}
              >
                {/* Res. ID */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                  #{card.reservationId}
                </div>

                {/* Name */}
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {card.firstname} {card.surname}
                </div>

                {/* Birth Date */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                  {fmtDate(card.dateOfBirth)}
                </div>

                {/* Card ID */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                  {card.idCard}
                </div>

                {/* Car Plate */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {card.carPlate || <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
                </div>

                {/* Address */}
                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  <span style={{ fontSize: 12 }}>
                    {[card.street, card.city].filter(Boolean).join(', ') || <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
                  </span>
                  {card.countryOfResidence && (
                    <span style={{
                      marginLeft: 5, fontSize: 10, fontWeight: 700,
                      color: 'var(--fg-subtle)', letterSpacing: '0.05em',
                    }}>
                      {card.countryOfResidence}
                    </span>
                  )}
                </div>

                {/* State */}
                <StatusDots confirmed={card.isDataConfirmed} gdpr={card.isGDPRRead} rules={card.isHouseRulesAccepted} />

                {/* Dates */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                  {fmtDate(card.arrival)} → {fmtDate(card.departure)}
                </div>

                {/* Hotel */}
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {card.hotel.nameShort}
                </div>

                {/* Room */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                  {card.room ? (
                    <span style={{ color: 'var(--status-green)', background: 'var(--status-green-bg)', borderRadius: 4, padding: '1px 6px' }}>
                      {card.room}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--fg-subtle)' }}>—</span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, fontSize: 11, color: 'var(--fg-subtle)' }}>
        <span>State dots: <b>Data</b> · <b>GDPR</b> · <b>Rules</b></span>
        <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
        <span style={{ color: 'var(--status-red)', fontWeight: 500 }}>Red row = incomplete acceptance</span>
      </div>

      {/* ── Pagination ── */}
      {data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20 }}>
          <button
            disabled={page <= 1}
            onClick={() => navigate({ page: page - 1 })}
            style={{
              padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)',
              background: '#FFFFFF', color: page <= 1 ? 'var(--fg-subtle)' : 'var(--fg)',
              fontSize: 12, cursor: page <= 1 ? 'default' : 'pointer',
            }}
          >
            ← Prev
          </button>
          {Array.from({ length: data.totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === data.totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '…')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} style={{ fontSize: 12, color: 'var(--fg-subtle)', padding: '0 4px' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => navigate({ page: p as number })}
                  style={{
                    padding: '6px 11px', borderRadius: 7,
                    border: p === page ? 'none' : '1px solid var(--border)',
                    background: p === page ? 'var(--accent)' : '#FFFFFF',
                    color: p === page ? '#fff' : 'var(--fg)',
                    fontSize: 12, fontWeight: p === page ? 600 : 400, cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              )
            )}
          <button
            disabled={page >= data.totalPages}
            onClick={() => navigate({ page: page + 1 })}
            style={{
              padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)',
              background: '#FFFFFF', color: page >= data.totalPages ? 'var(--fg-subtle)' : 'var(--fg)',
              fontSize: 12, cursor: page >= data.totalPages ? 'default' : 'pointer',
            }}
          >
            Next →
          </button>
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)', marginLeft: 6 }}>
            {data.total} records
          </span>
        </div>
      )}

    </div>
    </div>
    </>
  );
}

export default function RegistrationCardsPage() {
  return (
    <Suspense>
      <RegistrationCardsInner />
    </Suspense>
  );
}
