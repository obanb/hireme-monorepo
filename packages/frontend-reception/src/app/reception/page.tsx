'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type { CheckReservationBooking, CheckReservationStatus } from '@/types/reservation-check';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';

const QUERY = `
  query {
    checkReservations {
      originId provider checkin checkout owner status paymentsStatus
    }
  }
`;

const statusOrder = { RED: 0, YELLOW: 1, PENDING: 2, GREEN: 3, NONE: 4 } as const;

function StatCard({ label, value, accent, sub }: { label: string; value: number; accent?: string; sub?: string }) {
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

export default function DashboardPage() {
  const [all, setAll] = useState<CheckReservationBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: QUERY }),
        });
        const json = await res.json();
        setAll(json.data?.checkReservations ?? []);
      } catch {
        // dashboard degrades gracefully — stats show 0
      } finally {
        setLoading(false);
      }
    })();
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

  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg)', margin: 0 }}>
          Good morning
        </h1>
        <div style={{ color: 'var(--fg-muted)', marginTop: 5, fontSize: 13 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 36 }}>
        <StatCard label="Total Reservations" value={loading ? 0 : all.length} sub="under review" />
        <StatCard label="Issues" value={loading ? 0 : red} accent="var(--status-red)" sub="need action" />
        <StatCard label="Warnings" value={loading ? 0 : yellow} accent="var(--status-yellow)" sub="review recommended" />
        <StatCard label="Ready" value={loading ? 0 : green} accent="var(--status-green)" sub="all checks passed" />
      </div>

      {/* Urgent */}
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

      {/* Today strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, overflow: 'hidden' }}>
        {[
          { label: 'Check-ins today',  value: loading ? '—' : all.filter(r => r.checkin === today).length },
          { label: 'Check-outs today', value: loading ? '—' : all.filter(r => r.checkout === today).length },
          { label: 'Pending review',   value: loading ? '—' : pending },
          { label: 'Not configured',   value: loading ? '—' : all.filter(r => r.status === 'NONE').length },
        ].map(({ label, value }, i, arr) => (
          <div key={label} style={{ padding: '16px 20px', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
