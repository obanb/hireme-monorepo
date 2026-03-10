'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type {
  CheckReservationBooking, CheckReservationStatus, ReservationCheckDetail,
  BEPaymentSegment, BEVoucherSegment, BENoteSegment, BEHSKNoteSegment,
  BERoomFeatureSegment, BEInventorySegment, BEPromoCodeSegment, BECompanySegment,
} from '@/types/reservation-check';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';
const FLAGGED_KEY = 'reception_flagged_reservations';
const PAGE_SIZE = 10;

const LIST_QUERY = `
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

const DETAIL_QUERY = `
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

// ── Constants ─────────────────────────────────────────────────────────────────

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
  RED: '#DC2626', YELLOW: '#CA8A04', GREEN: '#16A34A', PENDING: '#4F46E5', NONE: '#E5E7EB',
};

const providerMeta: Record<string, { label: string; color: string }> = {
  'BOOKING_ENGINE': { label: 'Direct',      color: '#1D3557' },
  'BOOKING_COM':    { label: 'Booking.com', color: '#003B95' },
  'EXPEDIA':        { label: 'Expedia',     color: '#00355F' },
  'HOTEL_TIME':     { label: 'HotelTime',   color: '#7C3AED' },
  'AIRBNB':         { label: 'Airbnb',      color: '#E61E4D' },
};

const segmentMeta = [
  { key: 'payments',     label: 'Payments',    color: '#2563EB' },
  { key: 'vouchers',     label: 'Vouchers',    color: '#7C3AED' },
  { key: 'notes',        label: 'Notes',       color: '#D97706' },
  { key: 'hskNotes',     label: 'HSK Notes',   color: '#EA580C' },
  { key: 'roomFeatures', label: 'Features',    color: '#059669' },
  { key: 'inventories',  label: 'Inventories', color: '#0891B2' },
  { key: 'promoCodes',   label: 'Promo',       color: '#DB2777' },
  { key: 'companies',    label: 'Companies',   color: '#4F46E5' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function nightsBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ── Small reusable components ─────────────────────────────────────────────────

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
  GREEN: '#16A34A', YELLOW: '#CA8A04', RED: '#DC2626', PENDING: '#4F46E5', NONE: '#D1D5DB',
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
          <div key={key}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative', cursor: 'default' }}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
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
                <span style={{ color }}>{status}</span>
                <span style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
                  borderTop: '4px solid #1C1917',
                }} />
              </div>
            )}
            <div style={{
              width: 9, height: 9, borderRadius: '50%', background: color,
              boxShadow: isHov ? `0 0 0 2px ${color}40` : 'none',
              transition: 'box-shadow 0.12s', flexShrink: 0,
            }} />
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-mono)',
              color: isHov ? color : 'var(--fg-subtle)',
              fontWeight: isHov ? 600 : 400, lineHeight: 1, transition: 'color 0.12s',
            }}>
              {abbr}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const PREVIEW_MAX = 42;
function NotePreview({ note }: { note: string | null }) {
  const [visible, setVisible] = useState(false);
  if (!note) return null;
  const truncated = note.length > PREVIEW_MAX ? note.slice(0, PREVIEW_MAX).trimEnd() + '…' : note;
  return (
    <div style={{ position: 'relative', display: 'inline-block', marginTop: 4, maxWidth: 220 }}
      onMouseEnter={() => note.length > PREVIEW_MAX && setVisible(true)}
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

// ── Preview Panel ─────────────────────────────────────────────────────────────

function ErrorDot({ errors }: { errors: string[] }) {
  const [open, setOpen] = useState(false);
  if (!errors.length) return null;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }} style={{
        width: 16, height: 16, borderRadius: '50%', background: '#FEE2E2',
        border: '1px solid #FCA5A5', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, zIndex: 20,
          background: '#1C1917', color: '#FCA5A5', fontSize: 10, lineHeight: 1.6,
          padding: '8px 10px', borderRadius: 6, width: 260,
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
        }}>
          {errors.map((e, i) => <div key={i}>{e}</div>)}
          <div style={{ position: 'absolute', top: -4, right: 8, width: 8, height: 8, background: '#1C1917', transform: 'rotate(45deg)' }} />
        </div>
      )}
    </div>
  );
}

function PanelSegmentRow({ color, ok, errors, children }: { color: string; ok: boolean; errors: string[]; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      padding: '7px 10px', borderRadius: 6,
      background: ok ? '#fff' : '#FFF9F9',
      border: `1px solid ${ok ? 'var(--border)' : '#FEE2E2'}`,
      borderLeft: `3px solid ${ok ? color : '#EF4444'}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {!ok && <ErrorDot errors={errors} />}
    </div>
  );
}

function PanelSegments({ d }: { d: ReservationCheckDetail }) {
  const totalErrors = [...d.payments, ...d.vouchers, ...d.notes, ...d.hskNotes,
    ...d.roomFeatures, ...d.inventories, ...d.promoCodes, ...d.companies]
    .filter(s => s.error).length;

  const total = d.payments.length + d.vouchers.length + d.notes.length + d.hskNotes.length +
    d.roomFeatures.length + d.inventories.length + d.promoCodes.length + d.companies.length;

  return (
    <div>
      {/* Segment summary bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {segmentMeta.map(({ key, label, color }) => {
          const count = (d[key] as unknown[]).length;
          if (!count) return null;
          return (
            <span key={key} style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
              background: color + '14', color, border: `1px solid ${color}30`,
            }}>
              {label} {count}
            </span>
          );
        })}
        {totalErrors > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
            {totalErrors} error{totalErrors !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Payments */}
        {d.payments.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563EB', marginBottom: 6 }}>Payments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {d.payments.map((s: BEPaymentSegment) => (
                <PanelSegmentRow key={s.id} color="#2563EB" ok={!s.error} errors={s.errors}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                      {s.data.paidAmount.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--fg-muted)' }}>{s.data.currency}</span>
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{s.data.paymentType.replace(/_/g, ' ')}</span>
                  </div>
                </PanelSegmentRow>
              ))}
            </div>
          </div>
        )}

        {/* Vouchers */}
        {d.vouchers.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 6 }}>Vouchers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {d.vouchers.map((s: BEVoucherSegment) => (
                <PanelSegmentRow key={s.id} color="#7C3AED" ok={!s.error} errors={s.errors}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.06em' }}>
                      {s.data.voucherNumber}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>
                        {s.data.amount.amount.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--fg-muted)' }}>{s.data.amount.currency}</span>
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                        background: s.data.status === 'SUCCESSFUL' ? '#F0FDF4' : s.data.status === 'FAILED' ? '#FEF2F2' : '#EEF2FF',
                        color: s.data.status === 'SUCCESSFUL' ? '#16A34A' : s.data.status === 'FAILED' ? '#DC2626' : '#4338CA',
                      }}>
                        {s.data.status}
                      </span>
                    </div>
                  </div>
                </PanelSegmentRow>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {d.notes.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#D97706', marginBottom: 6 }}>Notes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {d.notes.map((s: BENoteSegment) => (
                <PanelSegmentRow key={s.id} color="#D97706" ok={!s.error} errors={s.errors}>
                  <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--fg)', lineHeight: 1.4 }}>
                    "{s.data.length > 60 ? s.data.slice(0, 60) + '…' : s.data}"
                  </span>
                </PanelSegmentRow>
              ))}
            </div>
          </div>
        )}

        {/* HSK Notes */}
        {d.hskNotes.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#EA580C', marginBottom: 6 }}>HSK Notes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {d.hskNotes.map((s: BEHSKNoteSegment) => (
                <PanelSegmentRow key={s.id} color="#EA580C" ok={!s.error} errors={s.errors}>
                  <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--fg)', lineHeight: 1.4 }}>
                    "{s.data.length > 60 ? s.data.slice(0, 60) + '…' : s.data}"
                  </span>
                </PanelSegmentRow>
              ))}
            </div>
          </div>
        )}

        {/* Room Features */}
        {d.roomFeatures.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#059669', marginBottom: 6 }}>Room Features</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {d.roomFeatures.map((s: BERoomFeatureSegment) => (
                <PanelSegmentRow key={s.id} color="#059669" ok={!s.error} errors={s.errors}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', background: 'var(--bg-surface)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border)' }}>
                      {s.data.roomType}
                    </span>
                    {s.data.codes.map(c => (
                      <span key={c} style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#05996914', color: '#059669', border: '1px solid #05996930' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </PanelSegmentRow>
              ))}
            </div>
          </div>
        )}

        {/* Inventories */}
        {d.inventories.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0891B2', marginBottom: 6 }}>Inventories</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {d.inventories.map((s: BEInventorySegment) => (
                <PanelSegmentRow key={s.id} color="#0891B2" ok={!s.error} errors={s.errors}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {s.data.inventories.map(item => (
                      <span key={item.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#0891B214', color: '#0891B2', border: '1px solid #0891B230', fontWeight: 600 }}>
                        ×{item.amount} {item.name}
                      </span>
                    ))}
                  </div>
                </PanelSegmentRow>
              ))}
            </div>
          </div>
        )}

        {/* Promo Codes */}
        {d.promoCodes.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#DB2777', marginBottom: 6 }}>Promo Codes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {d.promoCodes.map((s: BEPromoCodeSegment) => (
                <PanelSegmentRow key={s.id} color="#DB2777" ok={!s.error} errors={s.errors}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800, color: '#DB2777', letterSpacing: '0.1em' }}>
                    {s.data}
                  </span>
                </PanelSegmentRow>
              ))}
            </div>
          </div>
        )}

        {/* Companies */}
        {d.companies.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4F46E5', marginBottom: 6 }}>Companies</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {d.companies.map((s: BECompanySegment) => (
                <PanelSegmentRow key={s.id} color="#4F46E5" ok={!s.error} errors={s.errors}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{s.data.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{s.data.contact.email}</div>
                  </div>
                </PanelSegmentRow>
              ))}
            </div>
          </div>
        )}

        {total === 0 && (
          <div style={{ fontSize: 12, color: 'var(--fg-subtle)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
            No booking engine segments found.
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewPanel({
  originId, onClose,
}: {
  originId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ReservationCheckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: DETAIL_QUERY, variables: { originId } }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
        setData(json.data?.checkReservationDetail ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [originId]);

  const nights = data ? nightsBetween(data.checkin, data.checkout) : 0;

  return (
    <div style={{
      width: 400, flexShrink: 0,
      borderLeft: '1px solid var(--border-strong)',
      background: '#FAFAF9',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Sticky header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-strong)',
        background: '#fff',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)' }}>{originId}</span>
            {data && <StatusBadge status={data.status} size="sm" />}
          </div>
          {data && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.owner}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Link href={`/reception/reservation-checks/${encodeURIComponent(originId)}`}
            title="Open full detail"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid var(--border-strong)', background: '#fff',
              color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </Link>
          <button onClick={onClose} title="Close" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid var(--border-strong)', background: '#fff',
            color: 'var(--fg-muted)', cursor: 'pointer',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: i === 0 ? 60 : 44, borderRadius: 8 }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '12px', background: '#FEF2F2', borderRadius: 8, color: '#DC2626', fontSize: 12 }}>{error}</div>
        )}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Quick info */}
            <div style={{ background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                {[
                  { label: 'Provider', value: <ProviderTag provider={data.provider} /> },
                  { label: 'Guests', value: `${data.adultCount}A${data.childCount > 0 ? ` · ${data.childCount}C` : ''}` },
                  { label: 'Check-in', value: <strong style={{ fontSize: 12 }}>{data.checkin}</strong> },
                  { label: 'Check-out', value: <strong style={{ fontSize: 12 }}>{data.checkout}</strong> },
                  { label: 'Duration', value: `${nights} night${nights !== 1 ? 's' : ''}` },
                  ...(data.hotelTimeId ? [{ label: 'HT ID', value: `#${data.hotelTimeId}` }] : []),
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 12 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest note */}
            {data.customerNote && (
              <div style={{ background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 8 }}>
                  Guest Note
                </div>
                <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--fg)', lineHeight: 1.6 }}>
                  "{data.customerNote}"
                </div>
              </div>
            )}

            {/* Segments */}
            <div style={{ background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 12 }}>
                Booking Engine Segments
              </div>
              <PanelSegments d={data} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

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

// ── Table style ───────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  textAlign: 'left', fontSize: 11, fontWeight: 600,
  letterSpacing: '0.07em', textTransform: 'uppercase',
  color: 'var(--fg-subtle)', padding: '10px 14px', whiteSpace: 'nowrap',
};

interface PageMeta { total: number; page: number; limit: number; totalPages: number; }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReservationChecksPage() {
  const router = useRouter();
  const [items, setItems] = useState<CheckReservationBooking[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState<string | null>(null);
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

  const openPreview = useCallback((originId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewId(prev => prev === originId ? null : originId);
  }, []);

  // ── Keyboard navigation (↑/↓ rows, Escape closes panel) ──
  const filteredForKb = useMemo(() =>
    [...items]
      .filter(r => filter === 'ALL' || r.status === filter)
      .filter(r => !showFlagged || flagged.has(r.originId))
      .filter(r => !search || [r.originId, r.owner, r.provider].some(v =>
        v.toLowerCase().includes(search.toLowerCase())
      ))
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]),
    [items, filter, showFlagged, flagged, search]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPreviewId(null); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      setPreviewId(current => {
        if (!current) {
          return e.key === 'ArrowDown' ? (filteredForKb[0]?.originId ?? null) : null;
        }
        const idx = filteredForKb.findIndex(r => r.originId === current);
        if (e.key === 'ArrowDown' && idx < filteredForKb.length - 1) return filteredForKb[idx + 1].originId;
        if (e.key === 'ArrowUp'   && idx > 0)                         return filteredForKb[idx - 1].originId;
        return current;
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filteredForKb]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: LIST_QUERY, variables: { page, limit: PAGE_SIZE } }),
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
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'flex-start' }}>

      {/* ── List side ── */}
      <div style={{ flex: 1, minWidth: 0, padding: '36px 32px 60px', transition: 'padding 0.25s' }}>

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
            onClick={() => location.reload()}
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

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: '#DC2626' }}>
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
                padding: '7px 12px 7px 30px', width: 220,
                background: '#fff', border: '1px solid var(--border-strong)',
                borderRadius: 7, color: 'var(--fg)', fontSize: 13,
              }}
            />
          </div>

          <div style={{ width: 1, height: 22, background: 'var(--border-strong)', flexShrink: 0 }} />

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
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
                  <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: active ? 'rgba(255,255,255,0.7)' : cfg.dot }} />
                  {s === 'ALL' ? 'All' : s}
                  <span style={{ fontSize: 10, fontWeight: 700, background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface)', color: active ? '#fff' : 'var(--fg-subtle)', padding: '1px 5px', borderRadius: 8, lineHeight: '14px', minWidth: 18, textAlign: 'center' }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ width: 1, height: 22, background: 'var(--border-strong)', flexShrink: 0 }} />

          <button
            onClick={() => setShowFlagged(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
              border: `1px solid ${showFlagged ? '#D97706' : 'var(--border-strong)'}`,
              background: showFlagged ? '#FEF3C7' : '#fff',
              color: showFlagged ? '#92400E' : 'var(--fg-muted)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={showFlagged ? '#F59E0B' : 'none'}
              stroke={showFlagged ? '#D97706' : 'var(--fg-subtle)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.7-1.5 5.1-3.8 6.4L15 17H9l-.2-1.6A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/>
            </svg>
            Review later
            {flagged.size > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: showFlagged ? '#D97706' : 'var(--bg-surface)', color: showFlagged ? '#fff' : 'var(--fg-subtle)', padding: '1px 5px', borderRadius: 8, lineHeight: '14px', minWidth: 18, textAlign: 'center' }}>
                {flagged.size}
              </span>
            )}
          </button>

          {previewId && (
            <span style={{
              marginLeft: 'auto', fontSize: 11, color: 'var(--fg-subtle)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 3, padding: '1px 5px' }}>↑</kbd>
              <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 3, padding: '1px 5px' }}>↓</kbd>
              navigate
              <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 3, padding: '1px 5px' }}>Esc</kbd>
              close
            </span>
          )}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-strong)' }}>
                <th style={{ ...TH, paddingLeft: 18 }}>Reservation</th>
                <th style={TH}>Guest</th>
                {!previewId && <th style={TH}>Provider</th>}
                <th style={TH}>Stay</th>
                {!previewId && <th style={TH}>Guests</th>}
                <th style={TH}>Checks</th>
                <th style={TH}>Status</th>
                <th style={{ ...TH, width: 36 }} />
                <th style={{ ...TH, width: 32 }} />
                <th style={{ ...TH, width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 14 }}>
                    {meta.total === 0 ? 'No reservations found.' : 'No reservations match your filter.'}
                  </td>
                </tr>
              ) : filtered.map((r, i) => {
                const nights = nightsBetween(r.checkin, r.checkout);
                const isSelected = previewId === r.originId;
                return (
                  <tr key={r.originId}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', transition: 'background 0.1s',
                      background: isSelected ? `${rowAccent[r.status]}08` : 'transparent',
                      boxShadow: isSelected
                        ? `inset 3px 0 0 0 ${rowAccent[r.status]}, inset -3px 0 0 0 ${rowAccent[r.status]}18`
                        : `inset 3px 0 0 0 ${rowAccent[r.status]}`,
                    }}
                    onClick={() => router.push(`/reception/reservation-checks/${encodeURIComponent(r.originId)}`)}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? `${rowAccent[r.status]}08` : 'transparent'; }}
                  >
                    <td style={{ padding: '12px 14px 12px 18px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: isSelected ? rowAccent[r.status] : 'var(--accent)', fontWeight: 500 }}>
                        {r.originId}
                      </div>
                      {r.hotelTimeId && (
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>HT #{r.hotelTimeId}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{r.owner}</div>
                      {!previewId && <NotePreview note={r.customerNote} />}
                    </td>
                    {!previewId && (
                      <td style={{ padding: '12px 14px' }}><ProviderTag provider={r.provider} /></td>
                    )}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13 }}>{r.checkin} → {r.checkout}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{nights}n</div>
                    </td>
                    {!previewId && (
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>{r.adultCount}A</span>
                          {r.childCount > 0 && <span>· {r.childCount}C</span>}
                        </div>
                      </td>
                    )}
                    <td style={{ padding: '10px 14px' }}><CheckDots r={r} /></td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={r.status} size="sm" /></td>

                    {/* Quick overview button */}
                    <td style={{ padding: '8px 4px' }}>
                      <button
                        onClick={e => openPreview(r.originId, e)}
                        title="Quick overview"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: 6,
                          border: `1px solid ${isSelected ? rowAccent[r.status] : 'var(--border-strong)'}`,
                          background: isSelected ? rowAccent[r.status] : '#fff',
                          color: isSelected ? '#fff' : 'var(--fg-muted)',
                          cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: isSelected ? `0 1px 4px ${rowAccent[r.status]}40` : 'none',
                        }}
                        onMouseEnter={e => { if (!isSelected) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--fg)'; } }}
                        onMouseLeave={e => { if (!isSelected) { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'; } }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </td>

                    {/* Flag */}
                    <td style={{ padding: '8px 4px' }}>
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
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.7-1.5 5.1-3.8 6.4L15 17H9l-.2-1.6A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/>
                        </svg>
                      </button>
                    </td>

                    {/* Full detail arrow */}
                    <td style={{ padding: '12px 10px 12px 4px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
              Showing <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{from}–{to}</strong> of{' '}
              <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{meta.total}</strong> reservations
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: page === 1 ? 'not-allowed' : 'pointer', border: '1px solid var(--border-strong)', background: '#fff', color: page === 1 ? 'var(--fg-subtle)' : 'var(--fg)', opacity: page === 1 ? 0.45 : 1 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
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
                  .map((p, idx) => p === '…'
                    ? <span key={`e${idx}`} style={{ padding: '5px 3px', fontSize: 12, color: 'var(--fg-subtle)', lineHeight: '28px' }}>…</span>
                    : <button key={p} onClick={() => setPage(p as number)} style={{ width: 30, height: 28, borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${page === p ? 'var(--accent)' : 'var(--border-strong)'}`, background: page === p ? 'var(--accent)' : '#fff', color: page === p ? '#fff' : 'var(--fg)' }}>{p}</button>
                  )}
              </div>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: page === meta.totalPages ? 'not-allowed' : 'pointer', border: '1px solid var(--border-strong)', background: '#fff', color: page === meta.totalPages ? 'var(--fg-subtle)' : 'var(--fg)', opacity: page === meta.totalPages ? 0.45 : 1 }}>
                Next
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Preview panel ── */}
      {previewId && (
        <PreviewPanel
          key={previewId}
          originId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}
