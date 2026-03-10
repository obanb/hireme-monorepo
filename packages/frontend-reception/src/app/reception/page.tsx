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

// ── Helpers ────────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, accent, sub }: { label: string; value: number | string; accent?: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '18px 22px' }}>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500, marginBottom: 10, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 600, fontFamily: 'var(--font-display)', color: accent ?? 'var(--fg)', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

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

  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg)', margin: 0 }}>
          {greeting()}
        </h1>
        <div style={{ color: 'var(--fg-muted)', marginTop: 5, fontSize: 13, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          {!loading && arrivalsTotal > 0 && (
            <Link href="/reception/arriving-guests" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, fontSize: 12,
              background: 'var(--accent-light)', borderRadius: 6, padding: '2px 9px',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              {arrivalsTotal} arriving today →
            </Link>
          )}
        </div>
      </div>

      {/* ── VIP arrivals ── */}
      {!loading && vipArrivals.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, fontWeight: 600, color: '#6D28D9',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#7C3AED" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Platinum arrivals today
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column',
            border: '1px solid #DDD6FE',
            borderRadius: 10, overflow: 'hidden',
            background: '#FAFAFE',
          }}>
            {vipArrivals.map((g, i) => (
              <Link key={g.bookingId} href="/reception/arriving-guests" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 16px', textDecoration: 'none', color: 'var(--fg)',
                borderBottom: i < vipArrivals.length - 1 ? '1px solid #EDE9FE' : 'none',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#EDE9FE')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    background: '#EDE9FE', color: '#6D28D9',
                    borderRadius: 4, padding: '1px 6px',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                  }}>
                    ★ Platinum
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{g.firstname} {g.surname}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>
                      {g.hotelName.replace('OREA ', '')} · #{g.bookingId}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {g.roomCode ? (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                      color: '#6D28D9', background: '#EDE9FE',
                      borderRadius: 4, padding: '2px 7px',
                    }}>
                      Room {g.roomCode}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: '#B45309',
                      background: '#FEF3C7', borderRadius: 4, padding: '2px 7px',
                      border: '1px dashed #F59E0B',
                    }}>
                      ⚠ No room assigned
                    </span>
                  )}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.7">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Reservation check stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 36 }}>
        <StatCard label="Total Reservations" value={loading ? '—' : all.length} sub="under review" />
        <StatCard label="Issues" value={loading ? '—' : red} accent="var(--status-red)" sub="need action" />
        <StatCard label="Warnings" value={loading ? '—' : yellow} accent="var(--status-yellow)" sub="review recommended" />
        <StatCard label="Ready" value={loading ? '—' : green} accent="var(--status-green)" sub="all checks passed" />
      </div>

      {/* ── Urgent ── */}
      {!loading && urgent.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Needs attention
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border-strong)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            {urgent.map((r, i) => (
              <Link key={r.originId} href={`/reception/reservation-checks/${r.originId}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 18px', textDecoration: 'none', color: 'var(--fg)',
                borderBottom: i < urgent.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <StatusBadge status={r.status as CheckReservationStatus} size="sm" />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{r.owner}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 1 }}>
                      {r.originId} · {r.provider} · {r.checkin} → {r.checkout}
                    </div>
                  </div>
                </div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <Link href="/reception/reservation-checks" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              View all reservation checks →
            </Link>
          </div>
        </div>
      )}

      {/* ── Today strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, overflow: 'hidden' }}>
        {[
          { label: 'Arrivals today',    value: loading ? '—' : arrivalsTotal,                                  accent: undefined },
          { label: 'Guests today',      value: loading ? '—' : arrivalsGuests,                                 accent: undefined },
          { label: 'No room assigned',  value: loading ? '—' : noRoomToday,  accent: noRoomToday > 0 ? '#B45309' : undefined },
          { label: 'Pending review',    value: loading ? '—' : pending,                                        accent: undefined },
          { label: 'Check-ins today',   value: loading ? '—' : all.filter(r => r.checkin === today).length,    accent: undefined },
        ].map(({ label, value, accent }, i, arr) => (
          <div key={label} style={{ padding: '16px 20px', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', color: accent ?? 'var(--fg)' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
