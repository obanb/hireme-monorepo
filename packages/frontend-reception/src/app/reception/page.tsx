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

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }: {
  label: string;
  value: number | string;
  color?: string;
  sub?: string;
}) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 9,
      border: '1px solid var(--border)',
      padding: '14px 16px',
      borderTop: `3px solid ${color ?? 'var(--border-strong)'}`,
    }}>
      <div style={{
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        color: color ?? 'var(--fg)',
        fontFamily: 'var(--font-mono)',
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
    <div style={{ padding: '0' }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 52,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginLeft: 4 }}>
          {greeting()} — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>

        {/* Quick pill badges */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {!loading && arrivalsTotal > 0 && (
            <Link href="/reception/arriving-guests" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--accent-light)', color: 'var(--accent)',
              borderRadius: 20, padding: '4px 11px',
              textDecoration: 'none', fontSize: 11.5, fontWeight: 600,
              border: '1px solid var(--accent-border)',
            }}>
              {arrivalsTotal} arriving today
            </Link>
          )}
          {!loading && red > 0 && (
            <Link href="/reception/reservation-checks" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--status-red-bg)', color: 'var(--status-red)',
              borderRadius: 20, padding: '4px 11px',
              textDecoration: 'none', fontSize: 11.5, fontWeight: 600,
              border: '1px solid var(--status-red-border)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--status-red)', display: 'inline-block' }} />
              {red} urgent
            </Link>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 24px 60px', maxWidth: 1080 }}>

        {/* ── Stat rail ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
          <StatCard label="Total Reservations" value={loading ? '—' : all.length} />
          <StatCard label="Issues" value={loading ? '—' : red} color="var(--status-red)" sub="need action" />
          <StatCard label="Warnings" value={loading ? '—' : yellow} color="var(--status-yellow)" sub="review needed" />
          <StatCard label="Pending" value={loading ? '—' : pending} color="var(--status-pending)" />
          <StatCard label="Passed" value={loading ? '—' : green} color="var(--status-green)" sub="checks ok" />
        </div>

        {/* ── VIP arrivals ──────────────────────────────────────────────────── */}
        {!loading && vipArrivals.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
              letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 7,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#7C3AED', display: 'inline-block',
              }} />
              Platinum arrivals today
            </div>
            <div style={{
              background: '#FFFFFF', borderRadius: 9,
              border: '1px solid var(--border)', overflow: 'hidden',
            }}>
              {vipArrivals.map((g, i) => (
                <Link key={g.bookingId} href="/reception/arriving-guests" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', textDecoration: 'none', color: 'var(--fg)',
                  borderBottom: i < vipArrivals.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background .1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      background: 'rgba(124,58,237,0.10)', color: '#7C3AED',
                      borderRadius: 4, padding: '1px 6px',
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                    }}>
                      PLATINUM
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
                        color: 'var(--status-green)', background: 'var(--status-green-bg)',
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

        {/* ── Needs attention ───────────────────────────────────────────────── */}
        {!loading && urgent.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
              letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 7,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--status-red)', display: 'inline-block',
              }} />
              Needs attention
            </div>
            <div style={{
              background: '#FFFFFF', borderRadius: 9,
              border: '1px solid var(--border)', overflow: 'hidden',
            }}>
              {urgent.map((r, i) => (
                <Link key={r.originId} href={`/reception/reservation-checks/${r.originId}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', textDecoration: 'none', color: 'var(--fg)',
                  borderBottom: i < urgent.length - 1 ? '1px solid var(--border)' : 'none',
                  borderLeft: `3px solid ${r.status === 'RED' ? 'var(--status-red)' : 'var(--status-yellow)'}`,
                  transition: 'background .1s',
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

        {/* ── Today strip ───────────────────────────────────────────────────── */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
          letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 7,
        }}>
          Today at a glance
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {[
            { label: 'Arrivals',        value: loading ? '—' : arrivalsTotal,  color: 'var(--accent)' },
            { label: 'Guests',          value: loading ? '—' : arrivalsGuests, color: 'var(--fg)' },
            { label: 'No room',         value: loading ? '—' : noRoomToday,    color: noRoomToday > 0 ? 'var(--status-yellow)' : 'var(--fg)' },
            { label: 'Pending review',  value: loading ? '—' : pending,        color: 'var(--fg)' },
            { label: 'Check-ins',       value: loading ? '—' : checkinToday,   color: 'var(--fg)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#FFFFFF', borderRadius: 9,
              border: '1px solid var(--border)',
              padding: '13px 16px',
            }}>
              <div style={{
                fontSize: 22, fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.03em', color,
              }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
