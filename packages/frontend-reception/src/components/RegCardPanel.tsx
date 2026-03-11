'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const ENDPOINT     = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';
const PDF_ENDPOINT = (process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql').replace('/graphql', '');

const DETAIL_QUERY = `
  query RegistrationCard($id: Int!) {
    registrationCard(id: $id) {
      id idCard firstname surname dateOfBirth
      phone email
      street city zip countryOfResidence nationality
      documentNumber visaNumber carPlate
      arrival departure reservationId
      hotel { id name nameShort street city zip country }
      source room purposeOfStay idStay
      isDataConfirmed isGDPRRead isHouseRulesAccepted
    }
  }
`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegCardDetail {
  id: number;
  idCard: number;
  firstname: string;
  surname: string;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  countryOfResidence: string | null;
  nationality: string | null;
  documentNumber: string | null;
  visaNumber: string | null;
  carPlate: string | null;
  arrival: string;
  departure: string;
  reservationId: number;
  hotel: { id: number; name: string; nameShort: string; street: string | null; city: string | null; zip: string | null; country: string | null; };
  source: string | null;
  room: string | null;
  purposeOfStay: string | null;
  idStay: string | null;
  isDataConfirmed: boolean;
  isGDPRRead: boolean;
  isHouseRulesAccepted: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function nightsBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      padding: '5px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{
        fontSize: 10, fontWeight: 500, color: 'var(--fg-subtle)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        minWidth: 92, flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: 'var(--fg)', flex: 1 }}>{children}</span>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function AcceptBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 7,
      background: ok ? 'var(--status-green-bg)' : 'var(--status-red-bg)',
      border: `1px solid ${ok ? 'var(--status-green-border)' : 'var(--status-red-border)'}`,
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: ok ? 'var(--status-green)' : 'var(--status-red)',
      }}>
        {ok ? (
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 6l3 3 5-5"/>
          </svg>
        ) : (
          <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6"/>
          </svg>
        )}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: ok ? 'var(--status-green)' : 'var(--status-red)' }}>
        {label}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RegCardPanel({
  cardId,
  onClose,
  pmsOpen,
  onTogglePms,
}: {
  cardId: number;
  onClose: () => void;
  pmsOpen: boolean;
  onTogglePms: (reservationId: number) => void;
}) {
  const [card,    setCard]    = useState<RegCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setCard(null);
    setLoading(true);
    setError(null);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: DETAIL_QUERY, variables: { id: cardId } }),
    })
      .then(r => r.json())
      .then(json => {
        const c = json.data?.registrationCard;
        if (c) setCard(c); else setError('Card not found');
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [cardId]);

  const nights = card ? nightsBetween(card.arrival, card.departure) : 0;
  const allOk  = card ? card.isDataConfirmed && card.isGDPRRead && card.isHouseRulesAccepted : false;

  return (
    <div style={{
      width: 400, flexShrink: 0,
      borderLeft: '1px solid var(--border-strong)',
      background: 'var(--bg-surface)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden',
    }}>

      {/* ── Sticky header ── */}
      <div style={{
        padding: '12px 14px', flexShrink: 0,
        borderBottom: '1px solid var(--border-strong)',
        background: !loading && card && !allOk ? 'var(--status-red-bg)' : 'var(--bg-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {loading ? (
            <div className="skeleton" style={{ height: 16, width: 140, borderRadius: 4 }} />
          ) : card ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {card.firstname} {card.surname}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>
                  #{card.idCard}
                </span>
                <span style={{ color: 'var(--border-strong)', fontSize: 12 }}>·</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>
                  res #{card.reservationId}
                </span>
                <span style={{ color: 'var(--border-strong)', fontSize: 12 }}>·</span>
                <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{card.hotel.nameShort}</span>
              </div>
            </>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {/* PMS lookup toggle */}
          {card && (
            <button
              onClick={() => onTogglePms(card.reservationId)}
              title="Toggle PMS online detail"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                height: 28, borderRadius: 6, padding: '0 8px',
                border: `1px solid ${pmsOpen ? '#4A7FCB' : 'var(--border-strong)'}`,
                background: pmsOpen ? '#4A7FCB' : 'var(--bg-surface)',
                color: pmsOpen ? '#fff' : 'var(--fg-muted)',
                cursor: 'pointer', transition: 'all 0.15s',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              PMS
            </button>
          )}

          {/* Open full detail page */}
          {card && (
            <Link
              href={`/reception/registration-cards/${card.id}`}
              title="Open full detail"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
                color: 'var(--fg-muted)', textDecoration: 'none',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </Link>
          )}

          {/* Close */}
          <button onClick={onClose} title="Close" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
            color: 'var(--fg-muted)', cursor: 'pointer',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[50, 120, 100, 90, 80].map((h, i) => (
              <div key={i} className="skeleton" style={{ height: h, borderRadius: 8 }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '12px', background: 'var(--status-red-bg)', borderRadius: 8, color: 'var(--status-red)', fontSize: 12 }}>
            {error}
          </div>
        )}

        {card && (
          <>
            {/* ── Stay summary ── */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                {[
                  { label: 'Check-in',  val: fmtDate(card.arrival) },
                  { label: 'Check-out', val: fmtDate(card.departure) },
                  { label: 'Nights',    val: String(nights) },
                ].map(({ label, val }, i) => (
                  <div key={label} style={{
                    padding: '10px 12px', textAlign: 'center',
                    borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.1 }}>
                      {val}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
              {card.room && (
                <div style={{
                  padding: '7px 14px', borderTop: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontWeight: 500 }}>Room</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                    color: 'var(--status-green)', background: 'var(--status-green-bg)',
                    borderRadius: 4, padding: '1px 8px',
                  }}>
                    {card.room}
                  </span>
                </div>
              )}
            </div>

            {/* ── Acceptance ── */}
            <SectionBlock title="Acceptance">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <AcceptBadge ok={card.isDataConfirmed}      label="Data confirmed" />
                <AcceptBadge ok={card.isGDPRRead}           label="GDPR read" />
                <AcceptBadge ok={card.isHouseRulesAccepted} label="House rules accepted" />
              </div>
            </SectionBlock>

            {/* ── Guest info ── */}
            <SectionBlock title="Guest">
              <InfoRow label="Name">
                <span style={{ fontWeight: 600 }}>{card.firstname} {card.surname}</span>
              </InfoRow>
              <InfoRow label="Birth date">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtDate(card.dateOfBirth)}</span>
              </InfoRow>
              <InfoRow label="Nationality">{card.nationality ?? '—'}</InfoRow>
              <InfoRow label="Country">{card.countryOfResidence ?? '—'}</InfoRow>
              <InfoRow label="Document">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em' }}>{card.documentNumber ?? '—'}</span>
              </InfoRow>
              {card.visaNumber && (
                <InfoRow label="Visa">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7C3AED', letterSpacing: '0.04em' }}>{card.visaNumber}</span>
                </InfoRow>
              )}
              {card.carPlate && (
                <InfoRow label="Car plate">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em' }}>{card.carPlate}</span>
                </InfoRow>
              )}
            </SectionBlock>

            {/* ── Contact ── */}
            {(card.phone || card.email || card.street) && (
              <SectionBlock title="Contact">
                {card.phone  && <InfoRow label="Phone"><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{card.phone}</span></InfoRow>}
                {card.email  && <InfoRow label="Email"><span style={{ fontSize: 11 }}>{card.email}</span></InfoRow>}
                {card.street && (
                  <InfoRow label="Address">
                    <span style={{ fontSize: 11 }}>
                      {[card.street, card.city, card.zip, card.countryOfResidence].filter(Boolean).join(', ')}
                    </span>
                  </InfoRow>
                )}
              </SectionBlock>
            )}

            {/* ── Hotel & Stay ── */}
            <SectionBlock title="Hotel & Stay">
              <InfoRow label="Hotel">{card.hotel.name}</InfoRow>
              {card.source      && <InfoRow label="Source">{card.source}</InfoRow>}
              {card.purposeOfStay && <InfoRow label="Purpose"><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{card.purposeOfStay}</span></InfoRow>}
              {card.idStay      && <InfoRow label="Stay ID"><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{card.idStay}</span></InfoRow>}
              {card.hotel.city  && (
                <InfoRow label="Location">
                  <span style={{ fontSize: 11 }}>{[card.hotel.street, card.hotel.city].filter(Boolean).join(', ')}</span>
                </InfoRow>
              )}
            </SectionBlock>

            {/* ── PDF actions ── */}
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`${PDF_ENDPOINT}/api/pdf/registration-card/${card.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 0', borderRadius: 7,
                  border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
                  color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 12, fontWeight: 500,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
                </svg>
                View PDF
              </a>
              <a
                href={`${PDF_ENDPOINT}/api/pdf/registration-card/${card.id}?download=true`}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 0', borderRadius: 7,
                  border: 'none', background: 'var(--accent)',
                  color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 500,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
