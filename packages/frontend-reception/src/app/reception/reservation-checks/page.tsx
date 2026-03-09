'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import type { CheckReservationBooking, CheckReservationStatus } from '@/types/reservation-check';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';
const FLAGGED_KEY = 'reception_flagged_reservations';

const PAGE_SIZE = 10;

const QUERY = `
  query CheckReservations($page: Int, $limit: Int) {
    checkReservations(page: $page, limit: $limit) {
      total page limit totalPages
      items {
        originId hotelTimeId provider date
        adultCount childCount checkin checkout
        owner customerNote
        notesStatus featuresStatus vouchersStatus paymentsStatus
        customerNoteStatus inventoriesStatus hskStatus status
      }
    }
  }
`;

type StatusFilter = CheckReservationStatus | 'ALL';
const STATUS_FILTERS: StatusFilter[] = ['ALL', 'RED', 'YELLOW', 'GREEN', 'PENDING', 'NONE'];
const statusOrder: Record<CheckReservationStatus, number> = { RED: 0, YELLOW: 1, PENDING: 2, GREEN: 3, NONE: 4 };

const filterColors: Record<string, { solid: string; text: string; dot: string }> = {
  ALL:     { solid: '#1D3557', text: '#fff', dot: '#1D3557' },
  RED:     { solid: '#DC2626', text: '#fff', dot: '#DC2626' },
  YELLOW:  { solid: '#CA8A04', text: '#fff', dot: '#CA8A04' },
  GREEN:   { solid: '#16A34A', text: '#fff', dot: '#16A34A' },
  PENDING: { solid: '#4F46E5', text: '#fff', dot: '#4F46E5' },
  NONE:    { solid: '#6B7280', text: '#fff', dot: '#9CA3AF' },
};

const rowAccent: Record<CheckReservationStatus, string> = {
  RED:     '#DC2626',
  YELLOW:  '#CA8A04',
  GREEN:   '#16A34A',
  PENDING: '#4F46E5',
  NONE:    '#E5E7EB',
};

const providerMeta: Record<string, { label: string; color: string }> = {
  'BOOKING_ENGINE': { label: 'Direct',      color: '#1D3557' },
  'BOOKING_COM':    { label: 'Booking.com', color: '#003B95' },
  'EXPEDIA':        { label: 'Expedia',     color: '#00355F' },
  'HOTEL_TIME':     { label: 'HotelTime',   color: '#7C3AED' },
  'AIRBNB':         { label: 'Airbnb',      color: '#E61E4D' },
};

function ProviderTag({ provider }: { provider: string }) {
  const meta = providerMeta[provider] ?? { label: provider, color: '#6B7280' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: meta.color,
      background: meta.color + '12', border: `1px solid ${meta.color}25`,
      padding: '2px 7px', borderRadius: 4, letterSpacing: '0.01em', whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

// ── CheckDots ─────────────────────────────────────────────────────────────────

const DOT_CHECKS = [
  { key: 'notesStatus',        abbr: 'N', label: 'Notes'      },
  { key: 'featuresStatus',     abbr: 'F', label: 'Features'   },
  { key: 'vouchersStatus',     abbr: 'V', label: 'Vouchers'   },
  { key: 'paymentsStatus',     abbr: 'P', label: 'Payments'   },
  { key: 'customerNoteStatus', abbr: 'G', label: 'Guest Note' },
  { key: 'inventoriesStatus',  abbr: 'I', label: 'Inventory'  },
  { key: 'hskStatus',          abbr: 'H', label: 'HSK'        },
] as const;

const dotColor: Record<CheckReservationStatus, string> = {
  GREEN:   '#16A34A',
  YELLOW:  '#CA8A04',
  RED:     '#DC2626',
  PENDING: '#4F46E5',
  NONE:    '#D1D5DB',
};

const dotStatusLabel: Record<CheckReservationStatus, string> = {
  GREEN: 'OK', YELLOW: 'Warn', RED: 'Issue', PENDING: 'Pending', NONE: '—',
};

function CheckDots({ r }: { r: CheckReservationBooking }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
      {DOT_CHECKS.map(({ key, abbr, label }, idx) => {
        const status = r[key] as CheckReservationStatus;
        const color  = dotColor[status];
        const isHov  = hovered === idx;
        return (
          <div
            key={key}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative', cursor: 'default' }}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Tooltip */}
            {isHov && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 7px)',
                left: '50%', transform: 'translateX(-50%)',
                background: '#1C1917', color: '#F5F5F4',
                fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
                padding: '4px 8px', borderRadius: 5,
                pointerEvents: 'none', zIndex: 200,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}>
                {label}
                <span style={{ opacity: 0.6, margin: '0 4px' }}>·</span>
                <span style={{ color }}>{dotStatusLabel[status]}</span>
                {/* arrow */}
                <span style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
                  borderTop: '4px solid #1C1917',
                }} />
              </div>
            )}
            {/* Dot */}
            <div style={{
              width: 9, height: 9, borderRadius: '50%',
              background: color,
              boxShadow: isHov ? `0 0 0 2px ${color}40` : 'none',
              transition: 'box-shadow 0.12s',
              flexShrink: 0,
            }} />
            {/* Letter */}
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-mono)',
              color: isHov ? color : 'var(--fg-subtle)',
              fontWeight: isHov ? 600 : 400,
              lineHeight: 1, transition: 'color 0.12s',
            }}>
              {abbr}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── NotePreview ───────────────────────────────────────────────────────────────

const PREVIEW_MAX = 42;

function NotePreview({ note }: { note: string | null }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  if (!note) return null;
  const truncated = note.length > PREVIEW_MAX ? note.slice(0, PREVIEW_MAX).trimEnd() + '…' : note;
  const needsTooltip = note.length > PREVIEW_MAX;
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', marginTop: 4, maxWidth: 220 }}
      onMouseEnter={() => needsTooltip && setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--fg-subtle)" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
        </svg>
        <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic', lineHeight: 1.4 }}>{truncated}</span>
      </div>
      {visible && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 100,
          background: '#1C1917', color: '#F5F5F4', fontSize: 12, lineHeight: 1.55,
          fontStyle: 'italic', padding: '10px 13px', borderRadius: 8, width: 280,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)', pointerEvents: 'none',
        }}>
          "{note}"
          <span style={{
            position: 'absolute', top: '100%', left: 16,
            width: 0, height: 0,
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: '6px solid #1C1917',
          }} />
        </div>
      )}
    </div>
  );
}

function nightsBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

const TH: React.CSSProperties = {
  textAlign: 'left', fontSize: 11, fontWeight: 600,
  letterSpacing: '0.07em', textTransform: 'uppercase',
  color: 'var(--fg-subtle)', padding: '10px 14px', whiteSpace: 'nowrap',
};

function Skeleton() {
  return (
    <div style={{ padding: '36px 40px 60px' }}>
      <div style={{ marginBottom: 24, paddingBottom: 22, borderBottom: '1px solid var(--border)' }}>
        <div className="skeleton" style={{ width: 200, height: 26, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 280, height: 16 }} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 240, height: 34, borderRadius: 7 }} />
        <div style={{ display: 'flex', gap: 5 }}>
          {[80, 60, 80, 70, 80, 60].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: w, height: 34, borderRadius: 6 }} />
          ))}
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, overflow: 'hidden' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16 }}>
            <div className="skeleton" style={{ width: 100, height: 16 }} />
            <div className="skeleton" style={{ width: 140, height: 16 }} />
            <div className="skeleton" style={{ width: 80, height: 16 }} />
            <div className="skeleton" style={{ width: 160, height: 16 }} />
            <div className="skeleton" style={{ width: 50, height: 16 }} />
            <div className="skeleton" style={{ width: 60, height: 16, marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface PageMeta { total: number; page: number; limit: number; totalPages: number; }

export default function ReservationChecksPage() {
  const router = useRouter();
  const [items, setItems] = useState<CheckReservationBooking[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [flagged, setFlagged] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(FLAGGED_KEY) ?? '[]')); }
    catch { return new Set(); }
  });
  const [showFlagged, setShowFlagged] = useState(false);

  const toggleFlag = (originId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(originId) ? next.delete(originId) : next.add(originId);
      try { localStorage.setItem(FLAGGED_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: QUERY, variables: { page, limit: PAGE_SIZE } }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
        const result = json.data?.checkReservations;
        setItems(result?.items ?? []);
        setMeta({ total: result?.total ?? 0, page: result?.page ?? 1, limit: result?.limit ?? PAGE_SIZE, totalPages: result?.totalPages ?? 1 });
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  if (loading) return <Skeleton />;

  // Client-side filter + search applied on current page items
  const filtered = [...items]
    .filter(r => filter === 'ALL' || r.status === filter)
    .filter(r => !showFlagged || flagged.has(r.originId))
    .filter(r => !search || [r.originId, r.owner, r.provider].some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    ))
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const from = (meta.page - 1) * meta.limit + 1;
  const to   = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div style={{ padding: '36px 40px 60px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 24, paddingBottom: 22, borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
            Reservation Checks
          </h1>
          <p style={{ color: 'var(--fg-muted)', margin: '5px 0 0', fontSize: 13 }}>
            Showing {from}–{to} of {meta.total} reservation{meta.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); setError(null); /* re-trigger useEffect */ location.reload(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer',
            padding: '5px 10px', borderRadius: 6,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: '#FEF2F2', border: '1px solid #FECACA',
          fontSize: 13, color: '#DC2626',
        }}>
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="Search by ID, guest, provider…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '7px 12px 7px 30px', width: 240,
              background: '#fff', border: '1px solid var(--border-strong)',
              borderRadius: 7, color: 'var(--fg)', fontSize: 13,
            }}
          />
        </div>

        <div style={{ width: 1, height: 22, background: 'var(--border-strong)', flexShrink: 0 }} />

        <div style={{ display: 'flex', gap: 5 }}>
          {STATUS_FILTERS.map(s => {
            const active = filter === s;
            const cfg = filterColors[s];
            const count = s === 'ALL' ? meta.total : items.filter(r => r.status === s).length;
            return (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
                border: `1px solid ${active ? cfg.solid : 'var(--border-strong)'}`,
                background: active ? cfg.solid : '#fff',
                color: active ? cfg.text : 'var(--fg-muted)',
                boxShadow: active ? `0 1px 4px ${cfg.solid}33` : 'none',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: active ? 'rgba(255,255,255,0.7)' : cfg.dot,
                }} />
                {s === 'ALL' ? 'All' : s}
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface)',
                  color: active ? '#fff' : 'var(--fg-subtle)',
                  padding: '1px 5px', borderRadius: 8, lineHeight: '14px', minWidth: 18, textAlign: 'center',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 22, background: 'var(--border-strong)', flexShrink: 0 }} />

        {/* Flagged filter */}
        <button
          onClick={() => setShowFlagged(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s',
            border: `1px solid ${showFlagged ? '#D97706' : 'var(--border-strong)'}`,
            background: showFlagged ? '#FEF3C7' : '#fff',
            color: showFlagged ? '#92400E' : 'var(--fg-muted)',
            boxShadow: showFlagged ? '0 1px 4px #D9770633' : 'none',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill={showFlagged ? '#F59E0B' : 'none'}
            stroke={showFlagged ? '#D97706' : 'var(--fg-subtle)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.7-1.5 5.1-3.8 6.4L15 17H9l-.2-1.6A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/>
          </svg>
          Review later
          {flagged.size > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: showFlagged ? '#D97706' : 'var(--bg-surface)',
              color: showFlagged ? '#fff' : 'var(--fg-subtle)',
              padding: '1px 5px', borderRadius: 8, lineHeight: '14px', minWidth: 18, textAlign: 'center',
            }}>
              {flagged.size}
            </span>
          )}
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-strong)' }}>
              <th style={{ ...TH, paddingLeft: 18 }}>Reservation</th>
              <th style={TH}>Guest</th>
              <th style={TH}>Provider</th>
              <th style={TH}>Stay</th>
              <th style={TH}>Guests</th>
              <th style={TH}>Checks</th>
              <th style={TH}>Status</th>
              <th style={{ ...TH, width: 36 }} />
              <th style={{ ...TH, width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 14 }}>
                  {meta.total === 0 ? 'No reservations found.' : 'No reservations match your filter.'}
                </td>
              </tr>
            ) : filtered.map((r, i) => {
              const nights = nightsBetween(r.checkin, r.checkout);
              return (
                <tr key={r.originId}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.1s',
                    boxShadow: `inset 3px 0 0 0 ${rowAccent[r.status]}`,
                  }}
                  onClick={() => router.push(`/reception/reservation-checks/${encodeURIComponent(r.originId)}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 14px 12px 18px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                      {r.originId}
                    </div>
                    {r.hotelTimeId && (
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>HT #{r.hotelTimeId}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.owner}</div>
                    <NotePreview note={r.customerNote} />
                  </td>
                  <td style={{ padding: '12px 14px' }}><ProviderTag provider={r.provider} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13 }}>{r.checkin} → {r.checkout}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{nights} night{nights !== 1 ? 's' : ''}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {r.adultCount}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/>
                        </svg>
                      </span>
                      {r.childCount > 0 && (
                        <>
                          <span style={{ color: 'var(--border-strong)' }}>·</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            {r.childCount}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="6" r="3.5"/><path d="M4.5 21a8 8 0 0 1 15 0"/>
                              <path d="M9 13l-1.5 4h9L15 13"/>
                            </svg>
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}><CheckDots r={r} /></td>
                  <td style={{ padding: '12px 14px' }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: '8px 4px 8px 14px' }}>
                    <button
                      onClick={e => toggleFlag(r.originId, e)}
                      title={flagged.has(r.originId) ? 'Remove from review list' : 'Flag for review later'}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 6, border: 'none',
                        cursor: 'pointer', transition: 'all 0.15s',
                        background: flagged.has(r.originId) ? '#FEF3C7' : 'transparent',
                      }}
                      onMouseEnter={e => { if (!flagged.has(r.originId)) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = flagged.has(r.originId) ? '#FEF3C7' : 'transparent'; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24"
                        fill={flagged.has(r.originId) ? '#F59E0B' : 'none'}
                        stroke={flagged.has(r.originId) ? '#D97706' : 'var(--fg-subtle)'}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.7-1.5 5.1-3.8 6.4L15 17H9l-.2-1.6A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/>
                      </svg>
                    </button>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 16,
        }}>
          {/* Status text */}
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            Showing <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{from}–{to}</strong> of{' '}
            <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{meta.total}</strong> reservations
          </span>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                border: '1px solid var(--border-strong)', background: '#fff',
                color: page === 1 ? 'var(--fg-subtle)' : 'var(--fg)',
                opacity: page === 1 ? 0.45 : 1, transition: 'opacity 0.12s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Prev
            </button>

            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '…'
                    ? <span key={`e${idx}`} style={{ padding: '5px 3px', fontSize: 12, color: 'var(--fg-subtle)', lineHeight: '28px' }}>…</span>
                    : (
                      <button key={p} onClick={() => setPage(p as number)} style={{
                        width: 30, height: 28, borderRadius: 6, fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.12s',
                        border: `1px solid ${page === p ? 'var(--accent)' : 'var(--border-strong)'}`,
                        background: page === p ? 'var(--accent)' : '#fff',
                        color: page === p ? '#fff' : 'var(--fg)',
                      }}>
                        {p}
                      </button>
                    )
                )}
            </div>

            <button
              onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                cursor: page === meta.totalPages ? 'not-allowed' : 'pointer',
                border: '1px solid var(--border-strong)', background: '#fff',
                color: page === meta.totalPages ? 'var(--fg-subtle)' : 'var(--fg)',
                opacity: page === meta.totalPages ? 0.45 : 1, transition: 'opacity 0.12s',
              }}
            >
              Next
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
