'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PmsPanel } from '@/components/PmsPanel';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BenefitItem {
  id: number;
  benefitRef: number;
  name: string;
  roomArrival: string;
  hotelName: string;
  deliveredBy: string;
  created: string;
}

interface BenefitGuest {
  bookingId: number;
  firstname: string;
  surname: string;
  tier: number;
  minArrival: string;
  phone: string | null;
  email: string | null;
  reservationCount: number;
  totalSpent: number;
  benefits: BenefitItem[];
  deepLink: string;
}

interface BenefitsPage {
  items: BenefitGuest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type BenefitsPeriod = 'today' | 'tomorrow' | 'days7';

// ── GQL ────────────────────────────────────────────────────────────────────────

const LIST_QUERY = `
  query Benefits($filter: BenefitsFilter, $page: Int, $limit: Int) {
    benefits(filter: $filter, page: $page, limit: $limit) {
      total page limit totalPages
      items {
        bookingId firstname surname tier minArrival
        phone email reservationCount totalSpent deepLink
        benefits {
          id benefitRef name roomArrival hotelName deliveredBy created
        }
      }
    }
  }
`;

// ── Mock benefit catalog ────────────────────────────────────────────────────────

interface CatalogBenefit { id: number; name: string; category: string; }

const BENEFIT_CATALOG: CatalogBenefit[] = [
  { id: 101, name: 'Welcome drink',        category: 'Welcome'   },
  { id: 102, name: 'Flowers & champagne',  category: 'Welcome'   },
  { id: 103, name: 'Birthday cake',        category: 'Welcome'   },
  { id: 104, name: 'Free breakfast',       category: 'Food'      },
  { id: 105, name: 'Dinner package',       category: 'Food'      },
  { id: 106, name: 'Mini bar',             category: 'Food'      },
  { id: 107, name: 'Room upgrade',         category: 'Room'      },
  { id: 108, name: 'Pillow menu',          category: 'Room'      },
  { id: 109, name: 'Turndown service',     category: 'Room'      },
  { id: 110, name: 'Free Wi-Fi upgrade',   category: 'Room'      },
  { id: 111, name: 'Early check-in',       category: 'Timing'    },
  { id: 112, name: 'Late checkout',        category: 'Timing'    },
  { id: 113, name: 'Spa access',           category: 'Wellness'  },
  { id: 114, name: 'Pool access',          category: 'Wellness'  },
  { id: 115, name: 'Gym access',           category: 'Wellness'  },
  { id: 116, name: 'Free parking',         category: 'Transport' },
  { id: 117, name: 'Airport transfer',     category: 'Transport' },
  { id: 118, name: 'Bike rental',          category: 'Transport' },
];

const CATEGORY_COLOR: Record<string, { bg: string; text: string }> = {
  Welcome:   { bg: '#FDF4FF', text: '#A21CAF' },
  Food:      { bg: '#FFF7ED', text: '#C2410C' },
  Room:      { bg: '#EFF6FF', text: '#1D4ED8' },
  Timing:    { bg: '#F0FDF4', text: '#15803D' },
  Wellness:  { bg: '#ECFDF5', text: '#059669' },
  Transport: { bg: '#F8FAFC', text: '#475569' },
};

// ── Constants ──────────────────────────────────────────────────────────────────

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

const PERIOD_LABELS: Record<BenefitsPeriod, string> = {
  today:    'Today',
  tomorrow: 'Tomorrow',
  days7:    'Next 7 Days',
};

const TIER_META: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: '#F1F5F9', text: '#64748B', label: 'Newcomer' },
  2: { bg: '#EFF6FF', text: '#3B82F6', label: 'Silver'   },
  3: { bg: '#FFFBEB', text: '#D97706', label: 'Gold'     },
  4: { bg: 'var(--accent-light)', text: 'var(--accent)', label: 'Platinum' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

function fmtMoney(n: number): string {
  return n.toLocaleString('cs-CZ') + ' Kč';
}

function fmtCreated(iso: string): string {
  return iso.slice(0, 10);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: number }) {
  const meta = TIER_META[tier] ?? TIER_META[1];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: meta.bg, color: meta.text,
      borderRadius: 4, padding: '1px 7px',
      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      {tier === 4 && <span style={{ fontSize: 9 }}>★</span>}
      {meta.label}
    </span>
  );
}

function BenefitCountBadge({ count }: { count: number }) {
  if (count === 0) return <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>—</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 20, height: 20,
      background: 'var(--accent-light)', color: 'var(--accent)',
      border: '1px solid var(--accent-light)',
      borderRadius: 10,
      fontSize: 11, fontWeight: 700,
      padding: '0 6px',
    }}>
      {count}
    </span>
  );
}

// ── Benefit strip ──────────────────────────────────────────────────────────────

function BenefitStrip({
  benefits, bookingId, isAdding, onToggleAdd, onRemove, onAdd, compact,
}: {
  benefits: BenefitItem[];
  bookingId: number;
  isAdding: boolean;
  onToggleAdd: () => void;
  onRemove: (id: number) => void;
  onAdd: (cat: CatalogBenefit) => void;
  compact?: boolean;
}) {
  const [catSearch, setCatSearch] = useState('');

  const assignedNames = new Set(benefits.map(b => b.name));
  const filtered = BENEFIT_CATALOG.filter(c =>
    !assignedNames.has(c.name) &&
    (!catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()) ||
                   c.category.toLowerCase().includes(catSearch.toLowerCase()))
  );

  return (
    <div
      style={compact ? {} : { padding: '0 16px 10px 52px' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Pill row */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
        {benefits.map(b => {
          const col = CATEGORY_COLOR[b.name] ?? { bg: 'var(--accent-light)', text: 'var(--accent)' };
          // find by catalog to get category
          const cat = BENEFIT_CATALOG.find(c => c.name === b.name);
          const colors = cat ? (CATEGORY_COLOR[cat.category] ?? col) : col;
          return (
            <span
              key={b.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 500,
                background: colors.bg, color: colors.text,
                border: `1px solid ${colors.text}20`,
                borderRadius: 12, padding: '2px 8px 2px 8px',
              }}
            >
              {b.name}
              <button
                onClick={() => {
                  console.log('[Benefits] remove benefit', b.id, b.name, 'from booking', bookingId);
                  onRemove(b.id);
                }}
                title="Remove"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, lineHeight: 1, color: colors.text,
                  opacity: 0.6, fontSize: 12, display: 'flex',
                }}
              >
                ×
              </button>
            </span>
          );
        })}

        {/* Add button */}
        <button
          onClick={onToggleAdd}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, padding: '2px 9px',
            borderRadius: 12, cursor: 'pointer',
            background: isAdding ? 'var(--accent)' : 'transparent',
            color: isAdding ? '#fff' : 'var(--accent)',
            border: '1px dashed var(--accent-light)',
            transition: 'all 0.12s',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add benefit
        </button>
      </div>

      {/* Catalog picker (inline expand) */}
      {isAdding && (
        <div style={{
          marginTop: 8, padding: '10px 12px',
          background: 'var(--bg-surface)', border: '1px solid var(--accent-light)',
          borderRadius: 8,
        }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              autoFocus
              placeholder="Search benefits…"
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '5px 8px 5px 26px', borderRadius: 6,
                border: '1px solid var(--accent-light)', background: 'var(--bg)',
                color: 'var(--fg)', fontSize: 12, fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>

          {/* Available benefits */}
          {filtered.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--fg-subtle)', padding: '6px 0' }}>
              {catSearch ? 'No matches' : 'All benefits already assigned'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {filtered.map(cat => {
                const colors = CATEGORY_COLOR[cat.category] ?? { bg: 'var(--accent-light)', text: 'var(--accent)' };
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      console.log('[Benefits] add benefit', cat.name, 'to booking', bookingId);
                      onAdd(cat);
                      setCatSearch('');
                    }}
                    title={cat.category}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 500, padding: '3px 9px',
                      borderRadius: 12, cursor: 'pointer',
                      background: colors.bg, color: colors.text,
                      border: `1px solid ${colors.text}25`,
                      transition: 'opacity 0.1s',
                    }}
                  >
                    + {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Quick-view panel ───────────────────────────────────────────────────────────

function BenefitGuestPanel({
  guest,
  onClose,
  onOpenPms,
}: {
  guest: BenefitGuest;
  onClose: () => void;
  onOpenPms: () => void;
}) {
  const tier = TIER_META[guest.tier] ?? TIER_META[1];

  return (
    <div style={{
      width: 380, flexShrink: 0,
      borderLeft: '1px solid var(--border-strong)',
      background: 'var(--bg-surface)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '14px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--border-strong)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid var(--accent-light)',
              borderRadius: 4, padding: '1px 6px',
            }}>
              Guest Detail
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)',
            }}>
              #{guest.bookingId}
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {guest.firstname} {guest.surname}
          </div>
          <div style={{ marginTop: 4 }}>
            <TierBadge tier={guest.tier} />
          </div>
        </div>
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
          color: 'var(--fg-muted)', cursor: 'pointer',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          {([
            { label: 'Arrival',   val: fmtDate(guest.minArrival) },
            { label: 'Stays',     val: String(guest.reservationCount) },
            { label: 'Total Spent', val: fmtMoney(guest.totalSpent) },
          ] as const).map(({ label, val }, i) => (
            <div key={label} style={{
              padding: '10px 10px', textAlign: 'center',
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontSize: i === 2 ? 12 : 14, fontWeight: 700,
                color: 'var(--fg)', lineHeight: 1.1,
                fontFamily: i > 0 ? 'var(--font-mono)' : undefined,
              }}>
                {val}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
          borderRadius: 10, padding: '12px 14px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 8 }}>
            Contact
          </div>
          {guest.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <a href={`mailto:${guest.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                {guest.email}
              </a>
            </div>
          )}
          {guest.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', fontSize: 12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.0 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{guest.phone}</span>
            </div>
          )}
          {!guest.email && !guest.phone && (
            <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>No contact info</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onOpenPms}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: 'var(--bg)', color: 'var(--fg-muted)',
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            PMS Live
          </button>
          <a
            href={guest.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: 'var(--bg)', color: 'var(--fg-muted)',
              textDecoration: 'none', fontSize: 12, fontWeight: 500,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
            HotelTime
          </a>
        </div>

        {/* Benefits */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
          borderRadius: 10, padding: '12px 14px',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--fg-subtle)', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Benefits</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11,
              color: guest.benefits.length > 0 ? 'var(--accent)' : 'var(--fg-subtle)',
              background: guest.benefits.length > 0 ? 'var(--accent-light)' : 'transparent',
              borderRadius: 8, padding: '0 6px',
            }}>
              {guest.benefits.length}
            </span>
          </div>

          {guest.benefits.length === 0 ? (
            <div style={{
              padding: '20px 0', textAlign: 'center',
              color: 'var(--fg-subtle)', fontSize: 12,
            }}>
              No benefits assigned
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {guest.benefits.map((b) => (
                <div key={b.id} style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  borderLeft: '3px solid var(--accent)',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5, color: 'var(--fg)' }}>
                    {b.name}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: 'var(--fg-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      </svg>
                      {b.hotelName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Room arrival: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{b.roomArrival}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
                      </svg>
                      {b.deliveredBy}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--fg-subtle)',
                      }}>
                        ref #{b.benefitRef}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>
                        {fmtCreated(b.created)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function BenefitsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [period,    setPeriod]    = useState<BenefitsPeriod>((searchParams.get('period') as BenefitsPeriod) ?? 'today');
  const [hotelName, setHotelName] = useState(searchParams.get('hotel') ?? '');
  const [search,    setSearch]    = useState(searchParams.get('q') ?? '');
  const [page,      setPage]      = useState(1);

  const [data,    setData]    = useState<BenefitsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [quickView,      setQuickView]      = useState<BenefitGuest | null>(null);
  const [pmsId,          setPmsId]          = useState<number | null>(null);
  const [localBenefits,  setLocalBenefits]  = useState<Record<number, BenefitItem[]>>({});
  const [addingFor,      setAddingFor]      = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: Record<string, unknown> = { period };
      if (hotelName) filter.hotelName = hotelName;
      if (search.trim()) filter.search = search.trim();

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: LIST_QUERY, variables: { filter, page, limit: 20 } }),
      });
      const json = await res.json();
      if (json.errors?.length) throw new Error(json.errors[0].message);
      setData(json.data.benefits);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period, hotelName, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [period, hotelName, search]);

  // Initialise local benefit lists from freshly loaded data
  useEffect(() => {
    if (!data) return;
    setLocalBenefits(prev => {
      const next = { ...prev };
      data.items.forEach(g => {
        if (!(g.bookingId in next)) next[g.bookingId] = g.benefits;
      });
      return next;
    });
  }, [data]);

  // Persist to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('period', period);
    if (hotelName) params.set('hotel', hotelName);
    if (search) params.set('q', search);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [period, hotelName, search, router]);

  // Escape closes panels
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setQuickView(null); setPmsId(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const hasFilters = hotelName || search;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ── Page header ── */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center', gap: 14,
        height: 52, flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          Benefits
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
          {loading ? 'Loading…' : `${data?.total ?? 0} guests · ${PERIOD_LABELS[period].toLowerCase()}`}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0, padding: '20px 24px 60px', maxWidth: 1400 }}>

        {/* ── Filters ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          marginBottom: 20,
          background: '#FFFFFF', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 14px',
          boxShadow: 'var(--shadow-card)',
        }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2"
              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              placeholder="Name, email, phone, booking ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px 7px 30px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 7, color: 'var(--fg)', fontSize: 12,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Period tabs */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
            borderRadius: 8, padding: 3, gap: 2,
          }}>
            {(['today', 'tomorrow', 'days7'] as BenefitsPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: period === p ? 600 : 400,
                  background: period === p ? 'var(--accent)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--fg-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Hotel */}
          <div style={{ position: 'relative' }}>
            <select
              value={hotelName}
              onChange={e => setHotelName(e.target.value)}
              style={{
                appearance: 'none',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 7, padding: '7px 30px 7px 10px',
                fontSize: 12, color: hotelName ? 'var(--fg)' : 'var(--fg-subtle)',
                cursor: 'pointer', minWidth: 160, fontFamily: 'var(--font-body)',
              }}
            >
              <option value="">All Hotels</option>
              {HOTEL_NAMES.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2.5"
              style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={() => { setHotelName(''); setSearch(''); }}
              style={{
                padding: '6px 12px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--fg-muted)', fontSize: 12, cursor: 'pointer',
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: 'var(--status-red-bg)', border: '1px solid var(--status-red-border)',
            borderRadius: 8, padding: '12px 16px',
            color: 'var(--status-red)', fontSize: 13, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* ── Table ── */}
        <div style={{
          background: '#FFFFFF', borderRadius: 10,
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '28px 110px 180px 80px 100px 1fr 1fr 80px 120px minmax(150px, 2fr) 36px 36px',
            gap: '0 12px', padding: '9px 16px',
            background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
            fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
            letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>
            <div />
            <div>Booking ID</div>
            <div>Name</div>
            <div>Tier</div>
            <div>Arrival</div>
            <div>Email</div>
            <div>Phone</div>
            <div>Stays</div>
            <div>Total Spent</div>
            <div>Benefits</div>
            <div />
            <div />
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: '4px 0' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 46, borderRadius: 0, marginBottom: 1 }} />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 13 }}>
              {search || hotelName ? 'No guests match the current filters.' : 'No guests for this period.'}
            </div>
          ) : (
            data.items.map((guest, idx) => {
              const isSelected = quickView?.bookingId === guest.bookingId;
              const benefits   = localBenefits[guest.bookingId] ?? guest.benefits;
              const hasBenefits = benefits.length > 0;
              const isAdding   = addingFor === guest.bookingId;
              const rowBg      = isSelected
                ? 'var(--accent-light)'
                : hasBenefits ? 'var(--bg-elevated)' : 'var(--bg-surface)';

              const handleAdd = (cat: CatalogBenefit) => {
                const newItem: BenefitItem = {
                  id: Date.now(),
                  benefitRef: cat.id,
                  name: cat.name,
                  roomArrival: '',
                  hotelName: '',
                  deliveredBy: '',
                  created: new Date().toISOString(),
                };
                setLocalBenefits(prev => ({
                  ...prev,
                  [guest.bookingId]: [...(prev[guest.bookingId] ?? guest.benefits), newItem],
                }));
                setAddingFor(null);
              };

              const handleRemove = (id: number) => {
                setLocalBenefits(prev => ({
                  ...prev,
                  [guest.bookingId]: (prev[guest.bookingId] ?? guest.benefits).filter(b => b.id !== id),
                }));
              };

              return (
                <div
                  key={guest.bookingId}
                  onClick={() => setQuickView(prev => prev?.bookingId === guest.bookingId ? null : guest)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 110px 180px 80px 100px 1fr 1fr 80px 120px minmax(150px, 2fr) 36px 36px',
                    gap: '0 12px', padding: '11px 16px',
                    borderBottom: idx < data.items.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center', cursor: 'pointer',
                    background: rowBg,
                    boxShadow: isSelected
                      ? 'inset 3px 0 0 0 var(--accent)'
                      : hasBenefits ? 'inset 3px 0 0 0 var(--accent-light)' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = rowBg;
                  }}
                >
                  {/* HotelTime link */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <a
                      href={guest.deepLink}
                      target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      title="Open in HotelTime PMS"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: 5,
                        background: '#F0FDF4', border: '1px solid #A7F3D0',
                        color: '#059669', textDecoration: 'none', flexShrink: 0,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                      </svg>
                    </a>
                  </div>

                  {/* Booking ID */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                    #{guest.bookingId}
                  </div>

                  {/* Name */}
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {guest.firstname} {guest.surname}
                  </div>

                  {/* Tier */}
                  <div><TierBadge tier={guest.tier} /></div>

                  {/* Arrival */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                    {fmtDate(guest.minArrival)}
                  </div>

                  {/* Email */}
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {guest.email ?? <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
                  </div>

                  {/* Phone */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                    {guest.phone ?? <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
                  </div>

                  {/* Stays */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>
                    {guest.reservationCount}
                  </div>

                  {/* Total spent */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg)' }}>
                    {guest.totalSpent.toLocaleString('cs-CZ')}
                  </div>

                  {/* Benefits — inline pills + add */}
                  <BenefitStrip
                    benefits={benefits}
                    bookingId={guest.bookingId}
                    isAdding={isAdding}
                    onToggleAdd={() => setAddingFor(prev => prev === guest.bookingId ? null : guest.bookingId)}
                    onRemove={handleRemove}
                    onAdd={handleAdd}
                    compact
                  />

                  {/* Row arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke={isSelected ? 'var(--accent)' : 'var(--fg-subtle)'}
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>

                  {/* PMS button */}
                  <div
                    onClick={e => { e.stopPropagation(); setPmsId(prev => prev === guest.bookingId ? null : guest.bookingId); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <div title="PMS Live" style={{
                      width: 26, height: 26, borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: pmsId === guest.bookingId ? 'var(--accent)' : 'transparent',
                      border: `1px solid ${pmsId === guest.bookingId ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke={pmsId === guest.bookingId ? '#fff' : 'var(--fg-subtle)'}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Pagination ── */}
        {data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '6px 12px', borderRadius: 7,
                border: '1px solid var(--border)', background: '#FFFFFF',
                color: page <= 1 ? 'var(--fg-subtle)' : 'var(--fg)',
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
                    onClick={() => setPage(p as number)}
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
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '6px 12px', borderRadius: 7,
                border: '1px solid var(--border)', background: '#FFFFFF',
                color: page >= data.totalPages ? 'var(--fg-subtle)' : 'var(--fg)',
                fontSize: 12, cursor: page >= data.totalPages ? 'default' : 'pointer',
              }}
            >
              Next →
            </button>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)', marginLeft: 6 }}>
              {data.total} guests
            </span>
          </div>
        )}

      </div>

      {/* ── Quick view panel ── */}
      {quickView && (
        <BenefitGuestPanel
          key={quickView.bookingId}
          guest={quickView}
          onClose={() => { setQuickView(null); setPmsId(null); }}
          onOpenPms={() => setPmsId(prev => prev === quickView.bookingId ? null : quickView.bookingId)}
        />
      )}

      {/* ── PMS panel ── */}
      {pmsId != null && (
        <PmsPanel
          key={pmsId}
          reservationId={pmsId}
          onClose={() => setPmsId(null)}
        />
      )}

      </div>
    </div>
  );
}

export default function BenefitsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: 'var(--fg-subtle)' }}>Loading…</div>}>
      <BenefitsInner />
    </Suspense>
  );
}
