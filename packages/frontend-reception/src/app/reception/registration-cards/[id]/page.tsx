'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const ENDPOINT     = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';
const PDF_ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API?.replace('/graphql', '') ?? 'http://localhost:4002';

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

// ── Types ──────────────────────────────────────────────────────────────────────

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
  hotel: {
    id: number;
    name: string;
    nameShort: string;
    street: string | null;
    city: string | null;
    zip: string | null;
    country: string | null;
  };
  source: string | null;
  room: string | null;
  purposeOfStay: string | null;
  idStay: string | null;
  isDataConfirmed: boolean;
  isGDPRRead: boolean;
  isHouseRulesAccepted: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function nights(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10,
      border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)',
      overflow: 'hidden', marginBottom: 14,
    }}>
      <div style={{
        padding: '10px 18px', borderBottom: '1px solid var(--border)',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--fg-subtle)',
        background: 'var(--bg-elevated)',
      }}>
        {title}
      </div>
      <div style={{ padding: '16px 18px' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontSize: 13, color: value ? 'var(--fg)' : 'var(--fg-subtle)',
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        fontWeight: mono ? 600 : undefined,
      }}>
        {value || '—'}
      </div>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px 24px' }}>
      {children}
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 8,
      background: ok ? 'var(--status-green-bg)' : 'var(--status-red-bg)',
      border: `1px solid ${ok ? 'var(--status-green-border)' : 'var(--status-red-border)'}`,
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: ok ? 'var(--status-green)' : 'var(--status-red)',
      }}>
        {ok ? (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M2 6l3 3 5-5"/>
          </svg>
        ) : (
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6"/>
          </svg>
        )}
      </span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: ok ? 'var(--status-green)' : 'var(--status-red)' }}>
          {ok ? 'Accepted' : 'Not accepted'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RegistrationCardDetailPage() {
  const params = useParams<{ id: string }>();
  const [card, setCard]     = useState<RegCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = Number(params.id);
    if (!id) { setNotFound(true); setLoading(false); return; }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: DETAIL_QUERY, variables: { id } }),
    })
      .then(r => r.json())
      .then(json => {
        const c = json.data?.registrationCard;
        if (c) setCard(c); else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ padding: '28px 32px' }}>
        <div className="skeleton" style={{ height: 24, width: 260, borderRadius: 6, marginBottom: 24 }} />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 10, marginBottom: 14 }} />
        ))}
      </div>
    );
  }

  if (notFound || !card) {
    return (
      <div style={{ padding: '28px 32px' }}>
        <Link href="/reception/registration-cards" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
          ← Registration Cards
        </Link>
        <div style={{ marginTop: 40, textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 14 }}>
          Registration card not found.
        </div>
      </div>
    );
  }

  const n = nights(card.arrival, card.departure);
  const allOk = card.isDataConfirmed && card.isGDPRRead && card.isHouseRulesAccepted;

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 960 }}>

      {/* ── Breadcrumb ── */}
      <Link href="/reception/registration-cards" style={{
        fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 18,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Registration Cards
      </Link>

      {/* ── Title ── */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
            color: 'var(--fg)', letterSpacing: '-0.02em', margin: 0,
          }}>
            {card.firstname} {card.surname}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 5, display: 'flex', gap: 14, alignItems: 'center' }}>
            <span>Card <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{card.idCard}</span></span>
            <span>·</span>
            <span>Res <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{card.reservationId}</span></span>
            <span>·</span>
            <span>{card.hotel.nameShort}</span>
            {card.source && <><span>·</span><span>{card.source}</span></>}
          </div>
        </div>

        {/* Right side: stay pill + PDF actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, alignItems: 'flex-end' }}>

          {/* Stay pill */}
          <div style={{
            background: '#FFFFFF', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 16px', boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
              {fmtDate(card.arrival)} → {fmtDate(card.departure)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3 }}>
              {n} night{n !== 1 ? 's' : ''}
              {card.room && (
                <span style={{
                  marginLeft: 8, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  color: 'var(--status-green)', background: 'var(--status-green-bg)',
                  borderRadius: 4, padding: '1px 6px',
                }}>
                  Room {card.room}
                </span>
              )}
            </div>
          </div>

          {/* PDF actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={`${PDF_ENDPOINT}/api/pdf/registration-card/${card.id}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 13px', borderRadius: 7,
                border: '1px solid var(--border)', background: '#FFFFFF',
                color: 'var(--fg)', textDecoration: 'none',
                fontSize: 12, fontWeight: 500, boxShadow: 'var(--shadow-card)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
                <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/>
              </svg>
              View PDF
            </a>
            <a
              href={`${PDF_ENDPOINT}/api/pdf/registration-card/${card.id}?download=true`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 13px', borderRadius: 7,
                border: 'none', background: 'var(--accent)',
                color: '#fff', textDecoration: 'none',
                fontSize: 12, fontWeight: 500, boxShadow: 'var(--shadow-card)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PDF
            </a>
          </div>

        </div>
      </div>

      {/* ── Guest info ── */}
      <Section title="Guest Information">
        <FieldGrid>
          <Field label="First name" value={card.firstname} />
          <Field label="Surname" value={card.surname} />
          <Field label="Date of birth" value={fmtDate(card.dateOfBirth)} mono />
          <Field label="Nationality" value={card.nationality} />
          <Field label="Country of residence" value={card.countryOfResidence} />
          <Field label="Document number" value={card.documentNumber} mono />
          <Field label="Visa number" value={card.visaNumber || null} mono />
          <Field label="Car plate" value={card.carPlate || null} mono />
        </FieldGrid>
      </Section>

      {/* ── Contact ── */}
      <Section title="Contact & Address">
        <FieldGrid>
          <Field label="Phone" value={card.phone || null} />
          <Field label="Email" value={card.email || null} />
          <div />
          <Field label="Street" value={card.street || null} />
          <Field label="City" value={card.city || null} />
          <Field label="ZIP" value={card.zip || null} mono />
        </FieldGrid>
      </Section>

      {/* ── Hotel & Stay ── */}
      <Section title="Hotel & Stay">
        <FieldGrid>
          <Field label="Hotel" value={card.hotel.name} />
          <Field label="Room" value={card.room || null} mono />
          <Field label="Stay ID" value={card.idStay || null} mono />
          <Field label="Source" value={card.source || null} />
          <Field label="Purpose of stay" value={card.purposeOfStay || null} mono />
          <div />
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Hotel address
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg)' }}>
              {[card.hotel.street, card.hotel.city, card.hotel.zip, card.hotel.country].filter(Boolean).join(', ')}
            </div>
          </div>
        </FieldGrid>
      </Section>

      {/* ── Acceptance status ── */}
      <Section title="Acceptance Status">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: !allOk ? 12 : 0,
        }}>
          <StatusBadge ok={card.isDataConfirmed}      label="Data confirmed" />
          <StatusBadge ok={card.isGDPRRead}           label="GDPR read" />
          <StatusBadge ok={card.isHouseRulesAccepted} label="House rules accepted" />
        </div>
        {!allOk && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8,
            background: 'var(--status-yellow-bg)', border: '1px solid var(--status-yellow-border)',
            fontSize: 12, color: 'var(--status-yellow)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
            </svg>
            Guest has not completed all acceptance steps.
          </div>
        )}
      </Section>

    </div>
  );
}
