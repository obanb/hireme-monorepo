'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import type {
  CheckReservationStatus,
  ReservationCheckDetail,
  BEPaymentSegment,
  BEVoucherSegment,
  BENoteSegment,
  BEHSKNoteSegment,
  BERoomFeatureSegment,
  BEInventorySegment,
  BEPromoCodeSegment,
  BECompanySegment,
} from '@/types/reservation-check';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';

const QUERY = `
  query CheckReservationDetail($originId: String!) {
    checkReservationDetail(originId: $originId) {
      originId hotelTimeId provider date
      adultCount childCount checkin checkout
      owner customerNote
      notesStatus featuresStatus vouchersStatus paymentsStatus
      customerNoteStatus inventoriesStatus hskStatus status

      payments { id error errors reprocessed reprocessAvailable
        data { paidAmount paymentType currency } }

      vouchers { id error errors reprocessed reprocessAvailable
        data { transactionId voucherNumber status errorMessage
          amount { amount currency } } }

      notes { id data error errors reprocessed reprocessAvailable }

      hskNotes { id data error errors reprocessed reprocessAvailable }

      roomFeatures { id error errors reprocessed reprocessAvailable
        data { featureMask codes roomType } }

      inventories { id error errors reprocessed reprocessAvailable
        data { roomType inventories { id amount name code } } }

      promoCodes { id data error errors reprocessed reprocessAvailable }

      companies { id error errors reprocessed reprocessAvailable
        data { id name dic street city postalCode country comment
          contact { email phone } } }
    }
  }
`;

const CHECK_LABELS: { key: keyof ReservationCheckDetail; label: string; desc: string }[] = [
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
  RED: 'var(--status-red-bg)', YELLOW: 'var(--status-yellow-bg)', GREEN: 'var(--status-green-bg)', PENDING: 'var(--status-pending-bg)', NONE: 'var(--bg-surface)',
};
const checkCardBorder: Record<CheckReservationStatus, string> = {
  RED: 'var(--status-red-border)', YELLOW: 'var(--status-yellow-border)', GREEN: 'var(--status-green-border)', PENDING: 'var(--status-pending-border)', NONE: 'var(--border)',
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

// ── Segment shared pieces ─────────────────────────────────────────────────────

function SegmentErrorBadge({ errors }: { errors: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px', borderRadius: 4,
          background: 'var(--status-red-bg)', border: '1px solid var(--status-red-border)',
          color: 'var(--status-red)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Error
      </button>
      {open && errors.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 10,
          background: '#1E293B', color: '#FCA5A5', fontSize: 11, lineHeight: 1.6,
          padding: '10px 12px', borderRadius: 7, minWidth: 280, maxWidth: 360,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>
          {errors.map((e, i) => <div key={i}>{e}</div>)}
          <div style={{
            position: 'absolute', top: -4, right: 10,
            width: 8, height: 8, background: '#1E293B',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}
    </div>
  );
}

function ReprocessBadge({ available, reprocessed }: { available: boolean | null; reprocessed: boolean | null }) {
  if (reprocessed) return (
    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--status-pending-bg)', color: 'var(--status-pending)', fontWeight: 600, border: '1px solid var(--status-pending-border)' }}>
      Reprocessed
    </span>
  );
  if (available) return (
    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 600, border: '1px solid var(--status-green-border)' }}>
      Can reprocess
    </span>
  );
  return null;
}

function SegmentHeader({ color, icon, label, count }: { color: string; icon: React.ReactNode; label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
        background: color + '18', color,
      }}>{count}</span>
    </div>
  );
}

function EmptySegment({ label }: { label: string }) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>
      No {label} found for this reservation.
    </div>
  );
}

// ── Payment cards ─────────────────────────────────────────────────────────────

const PAYMENT_TYPE_ICON: Record<string, string> = {
  CREDIT_CARD: '💳', APPLE_PAY: '', GOOGLE_PAY: 'G',
};

function PaymentCard({ seg }: { seg: BEPaymentSegment }) {
  const color = '#2563EB';
  return (
    <div style={{
      borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
      borderLeft: `3px solid ${seg.error ? 'var(--status-red)' : color}`,
      padding: '14px 16px', display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: color + '18', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20,
      }}>
        {PAYMENT_TYPE_ICON[seg.data.paymentType] ?? '💳'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {seg.data.paidAmount.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)' }}>{seg.data.currency}</span>
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <ReprocessBadge available={seg.reprocessAvailable} reprocessed={seg.reprocessed} />
            {seg.error ? <SegmentErrorBadge errors={seg.errors} /> : (
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 600, border: '1px solid var(--status-green-border)' }}>OK</span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {seg.data.paymentType.replace(/_/g, ' ')}
        </div>
      </div>
    </div>
  );
}

// ── Voucher cards ─────────────────────────────────────────────────────────────

const VOUCHER_STATUS_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  SUCCESSFUL: { bg: 'var(--status-green-bg)',   fg: 'var(--status-green)',   border: 'var(--status-green-border)'   },
  FAILED:     { bg: 'var(--status-red-bg)',     fg: 'var(--status-red)',     border: 'var(--status-red-border)'     },
  CREATED:    { bg: 'var(--status-pending-bg)', fg: 'var(--status-pending)', border: 'var(--status-pending-border)' },
};

function VoucherCard({ seg }: { seg: BEVoucherSegment }) {
  const color = '#7C3AED';
  const sc = VOUCHER_STATUS_COLOR[seg.data.status] ?? VOUCHER_STATUS_COLOR.CREATED;
  return (
    <div style={{
      borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
      borderLeft: `3px solid ${seg.error ? 'var(--status-red)' : color}`,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color }}>
            {seg.data.voucherNumber}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            {seg.data.transactionId.slice(0, 18)}…
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <ReprocessBadge available={seg.reprocessAvailable} reprocessed={seg.reprocessed} />
          {seg.error ? <SegmentErrorBadge errors={seg.errors} /> : null}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
          {seg.data.amount.amount.toLocaleString()} <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400 }}>{seg.data.amount.currency}</span>
        </span>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}` }}>
          {seg.data.status}
        </span>
      </div>
      {seg.data.errorMessage && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--status-red)', fontStyle: 'italic' }}>
          {seg.data.errorMessage}
        </div>
      )}
    </div>
  );
}

// ── Note cards ────────────────────────────────────────────────────────────────

function NoteCard({ seg, color }: { seg: BENoteSegment | BEHSKNoteSegment; color: string }) {
  return (
    <div style={{
      borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
      borderLeft: `3px solid ${seg.error ? 'var(--status-red)' : color}`,
      padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.5, fontStyle: 'italic' }}>
          "{seg.data}"
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <ReprocessBadge available={seg.reprocessAvailable} reprocessed={seg.reprocessed} />
          {seg.error ? <SegmentErrorBadge errors={seg.errors} /> : (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 600, border: '1px solid var(--status-green-border)' }}>OK</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Room feature cards ────────────────────────────────────────────────────────

function RoomFeatureCard({ seg }: { seg: BERoomFeatureSegment }) {
  const color = '#059669';
  return (
    <div style={{
      borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
      borderLeft: `3px solid ${seg.error ? 'var(--status-red)' : color}`,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
            {seg.data.roomType}
          </span>
          <span style={{ marginLeft: 8, color: 'var(--fg-subtle)' }}>mask: {seg.data.featureMask}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <ReprocessBadge available={seg.reprocessAvailable} reprocessed={seg.reprocessed} />
          {seg.error ? <SegmentErrorBadge errors={seg.errors} /> : (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 600, border: '1px solid var(--status-green-border)' }}>OK</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {seg.data.codes.map(code => (
          <span key={code} style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
            background: color + '18', color, border: `1px solid ${color}40`,
            letterSpacing: '0.04em',
          }}>
            {code}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Inventory cards ───────────────────────────────────────────────────────────

function InventoryCard({ seg }: { seg: BEInventorySegment }) {
  const color = '#0891B2';
  return (
    <div style={{
      borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
      borderLeft: `3px solid ${seg.error ? 'var(--status-red)' : color}`,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
          {seg.data.roomType}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <ReprocessBadge available={seg.reprocessAvailable} reprocessed={seg.reprocessed} />
          {seg.error ? <SegmentErrorBadge errors={seg.errors} /> : (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 600, border: '1px solid var(--status-green-border)' }}>OK</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {seg.data.inventories.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--fg)' }}>{item.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: color, fontWeight: 600 }}>
              ×{item.amount} <span style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}>[{item.code}]</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Promo code cards ──────────────────────────────────────────────────────────

function PromoCodeCard({ seg }: { seg: BEPromoCodeSegment }) {
  const color = '#BE185D';
  return (
    <div style={{
      borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
      borderLeft: `3px solid ${seg.error ? 'var(--status-red)' : color}`,
      padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800,
        letterSpacing: '0.12em', color,
      }}>
        {seg.data}
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <ReprocessBadge available={seg.reprocessAvailable} reprocessed={seg.reprocessed} />
        {seg.error ? <SegmentErrorBadge errors={seg.errors} /> : (
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 600, border: '1px solid var(--status-green-border)' }}>OK</span>
        )}
      </div>
    </div>
  );
}

// ── Company cards ─────────────────────────────────────────────────────────────

function CompanyCard({ seg }: { seg: BECompanySegment }) {
  const color = '#4F46E5';
  const d = seg.data;
  const address = [d.street, d.city, d.postalCode, d.country].filter(Boolean).join(', ');
  return (
    <div style={{
      borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
      borderLeft: `3px solid ${seg.error ? 'var(--status-red)' : color}`,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
          {d.dic && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>DIČ: {d.dic}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <ReprocessBadge available={seg.reprocessAvailable} reprocessed={seg.reprocessed} />
          {seg.error ? <SegmentErrorBadge errors={seg.errors} /> : (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 600, border: '1px solid var(--status-green-border)' }}>OK</span>
          )}
        </div>
      </div>
      {address && <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8 }}>{address}</div>}
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--fg-muted)' }}>
        <span>✉ {d.contact.email}</span>
        <span>✆ {d.contact.phone}</span>
      </div>
      {d.comment && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>{d.comment}</div>}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonDetail() {
  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: 900 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 62, borderRadius: 9 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReservationCheckDetailPage({ params }: { params: Promise<{ originId: string }> }) {
  const { originId } = use(params);
  const decoded = decodeURIComponent(originId);

  const [r, setR] = useState<ReservationCheckDetail | null>(null);
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
        if (!json.data?.checkReservationDetail) { setMissing(true); return; }
        setR(json.data.checkReservationDetail);
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
      <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--status-red-bg)', border: '1px solid var(--status-red-border)', borderRadius: 8, color: 'var(--status-red)', fontSize: 13 }}>
        {error}
      </div>
    </div>
  );
  if (!r) return null;

  const issues = CHECK_LABELS.filter(c => r[c.key] === 'RED' || r[c.key] === 'YELLOW');
  const nights = nightsBetween(r.checkin, r.checkout);

  const totalSegments = r.payments.length + r.vouchers.length + r.notes.length +
    r.hskNotes.length + r.roomFeatures.length + r.inventories.length +
    r.promoCodes.length + r.companies.length;

  const erroredSegments = [...r.payments, ...r.vouchers, ...r.notes, ...r.hskNotes,
    ...r.roomFeatures, ...r.inventories, ...r.promoCodes, ...r.companies]
    .filter(s => s.error).length;

  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: 900 }}>

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
          background: r.status === 'RED' ? 'var(--status-red-bg)' : 'var(--status-yellow-bg)',
          border: `1px solid ${r.status === 'RED' ? 'var(--status-red-border)' : 'var(--status-yellow-border)'}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={r.status === 'RED' ? 'var(--status-red)' : 'var(--status-yellow)'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: 13, color: r.status === 'RED' ? 'var(--status-red)' : 'var(--status-yellow)' }}>
            {issues.length} check{issues.length > 1 ? 's' : ''} require attention:&nbsp;
          </span>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {issues.map(c => c.label).join(', ')}
          </span>
        </div>
      )}

      {/* Info + note */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '18px 20px' }}>
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

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 12 }}>
            Guest Note
          </div>
          {r.customerNote ? (
            <>
              <div style={{
                fontSize: 13, color: 'var(--fg)', lineHeight: 1.65, padding: '12px 14px',
                background: 'var(--bg-elevated)', borderRadius: 7, border: '1px solid var(--border)',
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
      <div style={{ marginBottom: 32 }}>
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

      {/* ── Booking Engine Segments ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28 }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 4 }}>
              Booking Engine
            </div>
            <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}>
              Segments
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
              {totalSegments} total
            </span>
            {erroredSegments > 0 && (
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'var(--status-red-bg)', border: '1px solid var(--status-red-border)', color: 'var(--status-red)', fontWeight: 600 }}>
                {erroredSegments} error{erroredSegments !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Payments */}
          <div>
            <SegmentHeader color="#2563EB" label="Payments" count={r.payments.length}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
            />
            {r.payments.length === 0 ? <EmptySegment label="payments" /> : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {r.payments.map(seg => <PaymentCard key={seg.id} seg={seg} />)}
              </div>
            )}
          </div>

          {/* Vouchers */}
          <div>
            <SegmentHeader color="#7C3AED" label="Vouchers" count={r.vouchers.length}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>}
            />
            {r.vouchers.length === 0 ? <EmptySegment label="vouchers" /> : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {r.vouchers.map(seg => <VoucherCard key={seg.id} seg={seg} />)}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <SegmentHeader color="#D97706" label="Notes" count={r.notes.length}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
            />
            {r.notes.length === 0 ? <EmptySegment label="notes" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {r.notes.map(seg => <NoteCard key={seg.id} seg={seg} color="#D97706" />)}
              </div>
            )}
          </div>

          {/* HSK Notes */}
          <div>
            <SegmentHeader color="#EA580C" label="Housekeeping Notes" count={r.hskNotes.length}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
            />
            {r.hskNotes.length === 0 ? <EmptySegment label="housekeeping notes" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {r.hskNotes.map(seg => <NoteCard key={seg.id} seg={seg} color="#EA580C" />)}
              </div>
            )}
          </div>

          {/* Room Features */}
          <div>
            <SegmentHeader color="#059669" label="Room Features" count={r.roomFeatures.length}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>}
            />
            {r.roomFeatures.length === 0 ? <EmptySegment label="room features" /> : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {r.roomFeatures.map(seg => <RoomFeatureCard key={seg.id} seg={seg} />)}
              </div>
            )}
          </div>

          {/* Inventories */}
          <div>
            <SegmentHeader color="#0891B2" label="Inventories" count={r.inventories.length}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>}
            />
            {r.inventories.length === 0 ? <EmptySegment label="inventories" /> : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {r.inventories.map(seg => <InventoryCard key={seg.id} seg={seg} />)}
              </div>
            )}
          </div>

          {/* Promo Codes */}
          <div>
            <SegmentHeader color="#BE185D" label="Promo Codes" count={r.promoCodes.length}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>}
            />
            {r.promoCodes.length === 0 ? <EmptySegment label="promo codes" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {r.promoCodes.map(seg => <PromoCodeCard key={seg.id} seg={seg} />)}
              </div>
            )}
          </div>

          {/* Companies */}
          <div>
            <SegmentHeader color="#4F46E5" label="Companies" count={r.companies.length}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><rect x="9" y="14" width="6" height="8"/></svg>}
            />
            {r.companies.length === 0 ? <EmptySegment label="companies" /> : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {r.companies.map(seg => <CompanyCard key={seg.id} seg={seg} />)}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
