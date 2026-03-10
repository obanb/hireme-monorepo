'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type { CheckReservationBooking, CheckReservationStatus } from '@/types/reservation-check';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';

const CHECKS_QUERY = `
  query {
    checkReservations {
      originId provider checkin checkout owner status paymentsStatus
    }
  }
`;

const ARRIVALS_QUERY = `
  query TodayArrivals {
    arrivingGuests(filter: { period: today }, page: 1, limit: 100) {
      total totalGuests
      items {
        bookingId tier tierLabel firstname surname hotelName arrival departure roomCode roomState
      }
    }
  }
`;

const statusOrder = { RED: 0, YELLOW: 1, PENDING: 2, GREEN: 3, NONE: 4 } as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface ArrivingGuestBrief {
  bookingId: number;
  tier: number;
  tierLabel: string;
  firstname: string;
  surname: string;
  hotelName: string;
  arrival: string;
  departure: string;
  roomCode: string | null;
  roomState: string;
}

// ── Stat card with colored top accent ──────────────────────────────────────────

function StatRailCard({ label, value, color, sub }: {
  label: string;
  value: number | string;
  color?: string;
  sub?: string;
}) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 10,
      boxShadow: 'var(--shadow-card)',
      padding: '16px 18px',
      borderTop: `3px solid ${color ?? 'var(--border-strong)'}`,
    }}>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        letterSpacing: '-0.03em',
        lineHeight: 1,
        color: color ?? 'var(--fg)',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [all, setAll] = useState<CheckReservationBooking[]>([]);
  const [arrivals, setArrivals] = useState<ArrivingGuestBrief[]>([]);
  const [arrivalsTotal, setArrivalsTotal] = useState(0);
  const [arrivalsGuests, setArrivalsGuests] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: CHECKS_QUERY }),
      }).then(r => r.json()),
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ARRIVALS_QUERY }),
      }).then(r => r.json()),
    ])
      .then(([checksJson, arrivalsJson]) => {
        setAll(checksJson.data?.checkReservations ?? []);
        const ag = arrivalsJson.data?.arrivingGuests;
        setArrivals(ag?.items ?? []);
        setArrivalsTotal(ag?.total ?? 0);
        setArrivalsGuests(ag?.totalGuests ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const red     = all.filter(r => r.status === 'RED').length;
  const yellow  = all.filter(r => r.status === 'YELLOW').length;
  const green   = all.filter(r => r.status === 'GREEN').length;
  const pending = all.filter(r => r.status === 'PENDING').length;
  const today   = new Date().toISOString().slice(0, 10);

  const urgent = [...all]
    .filter(r => r.status === 'RED' || r.status === 'YELLOW')
    .sort((a, b) => statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder])
    .slice(0, 5);

  const vipArrivals = arrivals.filter(g => g.tier === 4);
  const noRoomToday = arrivals.filter(g => !g.roomCode).length;
  const checkinToday = all.filter(r => r.checkin === today).length;

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 1080 }}>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 14,
        background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
        padding: '24px 28px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', right: -40, top: -40,
          width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 60, bottom: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              marginBottom: 4,
            }}>
              {greeting()}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', letterSpacing: '0.01em' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* Pill badges */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!loading && arrivalsTotal > 0 && (
              <Link href="/reception/arriving-guests" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(4px)',
                color: '#FFFFFF',
                borderRadius: 20, padding: '5px 12px',
                textDecoration: 'none', fontSize: 12, fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.25)',
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
                {arrivalsTotal} arriving
              </Link>
            )}
            {!loading && red > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(239,68,68,0.85)',
                color: '#FFFFFF',
                borderRadius: 20, padding: '5px 12px',
                fontSize: 12, fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                {red} urgent
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat rail ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatRailCard label="Total Reservations" value={loading ? '—' : all.length} color="var(--border-strong)" />
        <StatRailCard label="Issues" value={loading ? '—' : red} color="var(--status-red)" sub="need action" />
        <StatRailCard label="Warnings" value={loading ? '—' : yellow} color="var(--status-yellow)" sub="review needed" />
        <StatRailCard label="Pending" value={loading ? '—' : pending} color="var(--status-pending)" />
        <StatRailCard label="Ready" value={loading ? '—' : green} color="var(--status-green)" sub="checks passed" />
      </div>

      {/* ── VIP arrivals ─────────────────────────────────────────────────────── */}
      {!loading && vipArrivals.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontWeight: 700, color: '#7C3AED',
            letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#7C3AED" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Platinum arrivals today
          </div>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 10,
            boxShadow: 'var(--shadow-card)',
            border: '1px solid rgba(124,58,237,0.15)',
            overflow: 'hidden',
          }}>
            {vipArrivals.map((g, i) => (
              <Link key={g.bookingId} href="/reception/arriving-guests" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', textDecoration: 'none', color: 'var(--fg)',
                borderBottom: i < vipArrivals.length - 1 ? '1px solid rgba(124,58,237,0.08)' : 'none',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    background: 'rgba(124,58,237,0.10)', color: '#7C3AED',
                    borderRadius: 4, padding: '1px 6px',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                  }}>
                    ★ PLATINUM
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{g.firstname} {g.surname}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>
                      {g.hotelName.replace('OREA ', '')} · #{g.bookingId}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {g.roomCode ? (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                      color: '#7C3AED', background: 'rgba(124,58,237,0.08)',
                      borderRadius: 4, padding: '2px 7px',
                    }}>
                      {g.roomCode}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: 'var(--status-yellow)',
                      background: 'var(--status-yellow-bg)',
                      borderRadius: 4, padding: '2px 7px',
                    }}>
                      No room
                    </span>
                  )}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.8">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Needs attention ──────────────────────────────────────────────────── */}
      {!loading && urgent.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
            letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            Needs attention
          </div>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 10,
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}>
            {urgent.map((r, i) => (
              <Link key={r.originId} href={`/reception/reservation-checks/${r.originId}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 16px', textDecoration: 'none', color: 'var(--fg)',
                borderBottom: i < urgent.length - 1 ? '1px solid var(--border)' : 'none',
                borderLeft: `3px solid ${r.status === 'RED' ? 'var(--status-red)' : 'var(--status-yellow)'}`,
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusBadge status={r.status as CheckReservationStatus} size="sm" />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{r.owner}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>
                      {r.originId} · {r.provider} · {r.checkin} → {r.checkout}
                    </div>
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <Link href="/reception/reservation-checks" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              View all reservation checks →
            </Link>
          </div>
        </div>
      )}

      {/* ── Today strip ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {[
          { label: 'Arrivals today',   value: loading ? '—' : arrivalsTotal,  color: 'var(--accent)' },
          { label: 'Guests today',     value: loading ? '—' : arrivalsGuests, color: 'var(--fg)' },
          { label: 'No room assigned', value: loading ? '—' : noRoomToday,    color: noRoomToday > 0 ? 'var(--status-yellow)' : 'var(--fg)' },
          { label: 'Pending review',   value: loading ? '—' : pending,        color: 'var(--fg)' },
          { label: 'Check-ins today',  value: loading ? '—' : checkinToday,   color: 'var(--fg)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#FFFFFF',
            borderRadius: 10,
            boxShadow: 'var(--shadow-card)',
            padding: '14px 16px',
          }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.03em',
              color,
            }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
