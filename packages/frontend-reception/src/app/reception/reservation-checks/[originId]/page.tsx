'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import type { CheckReservationBooking, CheckReservationStatus } from '@/types/reservation-check';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';

const QUERY = `
  query CheckReservation($originId: String!) {
    checkReservation(originId: $originId) {
      originId hotelTimeId provider date
      adultCount childCount checkin checkout
      owner customerNote
      notesStatus featuresStatus vouchersStatus paymentsStatus
      customerNoteStatus inventoriesStatus hskStatus status
    }
  }
`;

const CHECK_LABELS: { key: keyof CheckReservationBooking; label: string; desc: string }[] = [
  { key: 'status',             label: 'Overall',      desc: 'Aggregate reservation quality status' },
  { key: 'notesStatus',        label: 'Notes',        desc: 'Internal staff notes reviewed and actioned' },
  { key: 'featuresStatus',     label: 'Features',     desc: 'Room features and amenities confirmed' },
  { key: 'vouchersStatus',     label: 'Vouchers',     desc: 'Vouchers and discount codes validated' },
  { key: 'paymentsStatus',     label: 'Payments',     desc: 'Payment cleared and confirmed' },
  { key: 'customerNoteStatus', label: 'Guest Note',   desc: 'Customer request reviewed and actioned' },
  { key: 'inventoriesStatus',  label: 'Inventory',    desc: 'Room inventory and extras checked' },
  { key: 'hskStatus',          label: 'Housekeeping', desc: 'Room prepared by housekeeping' },
];

const checkCardBg: Record<CheckReservationStatus, string> = {
  RED: '#FEF2F2', YELLOW: '#FEFCE8', GREEN: '#F0FDF4', PENDING: '#EEF2FF', NONE: 'var(--bg-surface)',
};
const checkCardBorder: Record<CheckReservationStatus, string> = {
  RED: '#FECACA', YELLOW: '#FDE68A', GREEN: '#BBF7D0', PENDING: '#C7D2FE', NONE: 'var(--border)',
};

function nightsBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 13 }}>{value}</div>
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: 860 }}>
      <div className="skeleton" style={{ width: 140, height: 14, marginBottom: 28 }} />
      <div style={{ marginBottom: 24, paddingBottom: 22, borderBottom: '1px solid var(--border)' }}>
        <div className="skeleton" style={{ width: 100, height: 12, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: 240, height: 26, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 320, height: 14 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="skeleton" style={{ height: 240, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 10 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 62, borderRadius: 9 }} />
        ))}
      </div>
    </div>
  );
}

export default function ReservationCheckDetailPage({ params }: { params: Promise<{ originId: string }> }) {
  const { originId } = use(params);
  const decoded = decodeURIComponent(originId);

  const [r, setR] = useState<CheckReservationBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: QUERY, variables: { originId: decoded } }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
        if (!json.data?.checkReservation) { setMissing(true); return; }
        setR(json.data.checkReservation);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [decoded]);

  if (loading) return <SkeletonDetail />;
  if (missing) notFound();
  if (error) return (
    <div style={{ padding: '36px 40px' }}>
      <Link href="/reception/reservation-checks" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>
        ← Reservation Checks
      </Link>
      <div style={{ marginTop: 24, padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13 }}>
        {error}
      </div>
    </div>
  );
  if (!r) return null;

  const issues = CHECK_LABELS.filter(c => r[c.key] === 'RED' || r[c.key] === 'YELLOW');
  const nights = nightsBetween(r.checkin, r.checkout);

  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: 860 }}>

      {/* Back */}
      <Link href="/reception/reservation-checks" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none', marginBottom: 28,
        transition: 'color 0.12s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Reservation Checks
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 22, borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 6 }}>{r.originId}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
            {r.owner}
          </h1>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 13, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
            <span>{r.provider}</span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <span>{r.checkin} → {r.checkout}</span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <span>{nights} night{nights !== 1 ? 's' : ''}</span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <span>{r.adultCount} adult{r.adultCount !== 1 ? 's' : ''}{r.childCount > 0 ? `, ${r.childCount} child${r.childCount !== 1 ? 'ren' : ''}` : ''}</span>
          </div>
        </div>
        <StatusBadge status={r.status} />
      </div>

      {/* Alert banner */}
      {issues.length > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 22,
          background: r.status === 'RED' ? '#FEF2F2' : '#FEFCE8',
          border: `1px solid ${r.status === 'RED' ? '#FECACA' : '#FDE68A'}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={r.status === 'RED' ? '#DC2626' : '#CA8A04'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: 13, color: r.status === 'RED' ? '#DC2626' : '#CA8A04' }}>
            {issues.length} check{issues.length > 1 ? 's' : ''} require attention:&nbsp;
          </span>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {issues.map(c => c.label).join(', ')}
          </span>
        </div>
      )}

      {/* Info + note */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 8 }}>
            Reservation
          </div>
          <InfoItem label="Origin ID" value={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{r.originId}</span>} />
          {r.hotelTimeId && <InfoItem label="HotelTime ID" value={`#${r.hotelTimeId}`} />}
          <InfoItem label="Provider" value={r.provider} />
          <InfoItem label="Created" value={new Date(r.date).toLocaleString()} />
          <InfoItem label="Check-in" value={<strong>{r.checkin}</strong>} />
          <InfoItem label="Check-out" value={<strong>{r.checkout}</strong>} />
          <InfoItem label="Duration" value={`${nights} night${nights !== 1 ? 's' : ''}`} />
          <InfoItem label="Guests" value={`${r.adultCount} adult${r.adultCount !== 1 ? 's' : ''}${r.childCount > 0 ? `, ${r.childCount} child${r.childCount !== 1 ? 'ren' : ''}` : ''}`} />
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 12 }}>
            Guest Note
          </div>
          {r.customerNote ? (
            <>
              <div style={{
                fontSize: 13, color: 'var(--fg)', lineHeight: 1.65, padding: '12px 14px',
                background: 'var(--bg-surface)', borderRadius: 7, border: '1px solid var(--border)',
                flex: 1, fontStyle: 'italic', whiteSpace: 'pre-wrap',
              }}>
                "{r.customerNote}"
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Note status</span>
                <StatusBadge status={r.customerNoteStatus} size="sm" />
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No guest note provided.</div>
          )}
        </div>
      </div>

      {/* Quality checks grid */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 10 }}>
          Quality Checks
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {CHECK_LABELS.map(({ key, label, desc }) => {
            const status = r[key] as CheckReservationStatus;
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                background: checkCardBg[status],
                border: `1px solid ${checkCardBorder[status]}`,
                borderRadius: 9,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{desc}</div>
                </div>
                <StatusBadge status={status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
