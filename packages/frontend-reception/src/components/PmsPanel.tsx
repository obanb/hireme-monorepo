'use client';

import { useState, useEffect } from 'react';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';

const PMS_QUERY = `
  query PmsReservation($reservationId: Int!) {
    pmsReservation(reservationId: $reservationId) {
      id originID
      owner { id name email gsm phone languageISO }
      currencyISO totalPrice advances dueBalance
      arrival departure created
      segment clientType source
      virtualCardExists chmExtraServiceInclusive chmExtraServiceExclusive
      expectedPaymentMethod specialsMask
      note passwordProtected hasAgreement
      rooms {
        id arrival departure eta state
        roomTypeCode roomCode pax note
        ages { idAge amount }
        guests {
          id firstName surname
          address { street city zip countryISO2 }
          isMale birthDate idCard visa nationalityISO2
          email gsm carLicensePlate
          gdpr { repetitiveStay marketing }
        }
      }
    }
  }
`;

const UPDATE_NOTE_MUTATION = `
  mutation PmsUpdateNote($reservationId: Int!, $note: String!) {
    pmsUpdateNote(reservationId: $reservationId, note: $note) {
      isSuccess errors
    }
  }
`;

const UPDATE_OWNER_MUTATION = `
  mutation PmsUpdateOwner($input: PmsUpdateOwnerInput!) {
    pmsUpdateOwner(input: $input) {
      isSuccess errors
    }
  }
`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PmsAddress    { street: string; city: string; zip: string; countryISO2: string; }
interface PmsGdpr       { repetitiveStay: boolean; marketing: boolean; }
interface PmsGuest      {
  id: number; firstName: string; surname: string;
  address: PmsAddress; isMale: number; birthDate: string | null;
  idCard: string; visa: string; nationalityISO2: string | null;
  email: string | null; gsm: string | null; carLicensePlate: string | null;
  gdpr: PmsGdpr;
}
interface PmsRoom       {
  id: number; arrival: string; departure: string; eta: string | null;
  state: number; roomTypeCode: string; roomCode: string | null; pax: number; note: string;
  ages: { idAge: number; amount: number }[];
  guests: PmsGuest[];
}
interface PmsOwner      { id: number; name: string; email: string | null; gsm: string | null; phone: string | null; languageISO: string; }
interface PmsReservation {
  id: number; originID: string | null; owner: PmsOwner;
  currencyISO: string; totalPrice: number; advances: number; dueBalance: number;
  arrival: string; departure: string; created: string;
  segment: string; clientType: string; source: string;
  virtualCardExists: boolean; chmExtraServiceInclusive: boolean; chmExtraServiceExclusive: boolean;
  expectedPaymentMethod: number; specialsMask: number;
  note: string; passwordProtected: boolean; hasAgreement: boolean;
  rooms: PmsRoom[];
}

interface OwnerDraft {
  name: string;
  email: string;
  gsm: string;
  phone: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res  = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  return json.data as T;
}

// ── Meta maps ─────────────────────────────────────────────────────────────────

const SOURCE_META: Record<string, { label: string; color: string }> = {
  'MYOREA':         { label: 'MyOrea',       color: '#4A7FCB' },
  'BOOKING_ENGINE': { label: 'Direct',        color: '#4A7FCB' },
  'DIRECT':         { label: 'Direct',        color: '#4A7FCB' },
  'BOOKING_COM':    { label: 'Booking.com',   color: '#0070C9' },
  'EXPEDIA':        { label: 'Expedia',       color: '#C88A20' },
  'HOTEL_TIME':     { label: 'HotelTime',     color: '#3A9E6F' },
  'AIRBNB':         { label: 'Airbnb',        color: '#E11D48' },
};

const PAYMENT_METHOD: Record<number, { label: string; color: string }> = {
  1: { label: 'Virtual Card',    color: '#4A7FCB' },
  2: { label: 'Cash / Transfer', color: '#3A9E6F' },
  3: { label: 'Company Invoice', color: '#7C3AED' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function nightsBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function fmtDate(iso: string) {
  return iso ? iso.slice(0, 10) : '—';
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
        minWidth: 82, flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: 'var(--fg)', flex: 1 }}>{children}</span>
    </div>
  );
}

function SectionHeader({
  title, onEdit, editing,
}: {
  title: string; onEdit?: () => void; editing?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--fg-subtle)',
      }}>
        {title}
      </span>
      {onEdit && (
        <button
          onClick={onEdit}
          title={editing ? 'Cancel edit' : 'Edit'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer',
            background: editing ? 'var(--status-yellow-bg)' : 'transparent',
            color: editing ? 'var(--status-yellow)' : 'var(--fg-subtle)',
          }}
        >
          {editing ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

function Section({ title, onEdit, editing, children }: {
  title: string; onEdit?: () => void; editing?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
      borderRadius: 10, padding: '12px 14px',
    }}>
      <SectionHeader title={title} onEdit={onEdit} editing={editing} />
      {children}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color, background: `${color}12`, border: `1px solid ${color}28`,
      padding: '1px 7px', borderRadius: 4,
    }}>
      {label}
    </span>
  );
}

function SaveRow({
  onSave, onCancel, saving, saved,
}: {
  onSave: () => void; onCancel: () => void; saving: boolean; saved: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 5,
          background: saving ? 'var(--fg-subtle)' : '#4A7FCB', color: '#fff',
          border: 'none', cursor: saving ? 'default' : 'pointer',
        }}
      >
        {saving ? 'Saving…' : 'Save to PMS'}
      </button>
      <button
        onClick={onCancel}
        disabled={saving}
        style={{
          fontSize: 11, fontWeight: 500, padding: '5px 10px', borderRadius: 5,
          background: 'transparent', color: 'var(--fg-muted)',
          border: '1px solid var(--border-strong)', cursor: 'pointer',
        }}
      >
        Cancel
      </button>
      {saved && (
        <span style={{ fontSize: 11, color: 'var(--status-green)', fontWeight: 600 }}>
          ✓ Sent
        </span>
      )}
    </div>
  );
}

function EditInput({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontSize: 12, padding: '5px 8px', borderRadius: 5,
          border: '1px solid var(--border-strong)', background: 'var(--bg)',
          color: 'var(--fg)', outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ── Guest card ────────────────────────────────────────────────────────────────

function GuestCard({ guest }: { guest: PmsGuest }) {
  return (
    <div style={{
      background: 'var(--bg)', borderRadius: 7, padding: '10px 12px',
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {guest.firstName} {guest.surname}
        </span>
        {guest.nationalityISO2 && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            color: 'var(--fg-subtle)', background: 'var(--bg-surface)',
            borderRadius: 3, padding: '1px 5px', border: '1px solid var(--border)',
          }}>
            {guest.nationalityISO2}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--fg-subtle)', marginLeft: 'auto' }}>
          {guest.isMale === 1 ? '♂' : '♀'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, color: 'var(--fg-muted)' }}>
        {guest.birthDate && (
          <div>DOB: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{guest.birthDate}</span></div>
        )}
        {guest.idCard && (
          <div>ID: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)', letterSpacing: '0.04em' }}>{guest.idCard}</span></div>
        )}
        {guest.visa && (
          <div>Visa: <span style={{ fontFamily: 'var(--font-mono)', color: '#7C3AED', letterSpacing: '0.04em' }}>{guest.visa}</span></div>
        )}
        {guest.carLicensePlate && (
          <div>Car: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)', letterSpacing: '0.04em' }}>{guest.carLicensePlate}</span></div>
        )}
        {guest.email && (
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guest.email}</div>
        )}

        <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
          {[
            { key: 'Repeat', ok: guest.gdpr.repetitiveStay },
            { key: 'Mkt',    ok: guest.gdpr.marketing },
          ].map(({ key, ok }) => (
            <span key={key} style={{
              fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
              background: ok ? 'var(--status-green-bg)' : 'var(--bg-elevated)',
              color:      ok ? 'var(--status-green)'    : 'var(--fg-subtle)',
              border: `1px solid ${ok ? 'var(--status-green-border)' : 'var(--border)'}`,
            }}>
              {key} {ok ? '✓' : '✗'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Note editor ───────────────────────────────────────────────────────────────

function NoteEditor({
  reservationId, initialNote, onDone,
}: {
  reservationId: number; initialNote: string; onDone: (note: string) => void;
}) {
  const [value,  setValue]  = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { reservationId, note: value };
      console.log('[PMS] pmsUpdateNote →', payload);
      await gql(UPDATE_NOTE_MUTATION, payload);
      setSaved(true);
      setTimeout(() => onDone(value), 800);
    } catch (e) {
      console.error('[PMS] pmsUpdateNote failed', e);
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <textarea
        value={value}
        onChange={e => { setValue(e.target.value); setSaved(false); }}
        rows={4}
        style={{
          fontSize: 12, padding: '7px 9px', borderRadius: 6,
          border: '1px solid var(--border-strong)', background: 'var(--bg)',
          color: 'var(--fg)', resize: 'vertical', width: '100%',
          boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit',
        }}
      />
      <SaveRow
        onSave={handleSave}
        onCancel={() => onDone(initialNote)}
        saving={saving}
        saved={saved}
      />
    </div>
  );
}

// ── Owner editor ──────────────────────────────────────────────────────────────

function OwnerEditor({
  reservationId, owner, onDone,
}: {
  reservationId: number; owner: PmsOwner; onDone: (draft: OwnerDraft) => void;
}) {
  const [draft,  setDraft]  = useState<OwnerDraft>({
    name:  owner.name,
    email: owner.email  ?? '',
    gsm:   owner.gsm    ?? '',
    phone: owner.phone  ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  function set(field: keyof OwnerDraft) {
    return (v: string) => { setDraft(d => ({ ...d, [field]: v })); setSaved(false); };
  }

  async function handleSave() {
    setSaving(true);
    try {
      const input = {
        reservationId,
        subject: {
          id: owner.id,
          citizen: null,
          company: {
            name:  draft.name,
            email: draft.email || null,
            gsm:   draft.gsm   || null,
            phone: draft.phone || null,
          },
        },
      };
      console.log('[PMS] pmsUpdateOwner →', input);
      await gql(UPDATE_OWNER_MUTATION, { input });
      setSaved(true);
      setTimeout(() => onDone(draft), 800);
    } catch (e) {
      console.error('[PMS] pmsUpdateOwner failed', e);
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <EditInput label="Name"  value={draft.name}  onChange={set('name')} />
      <EditInput label="Email" value={draft.email} onChange={set('email')} type="email" />
      <EditInput label="Phone (GSM)" value={draft.gsm} onChange={set('gsm')} />
      <EditInput label="Phone (landline)" value={draft.phone} onChange={set('phone')} />
      <SaveRow
        onSave={handleSave}
        onCancel={() => onDone({ name: owner.name, email: owner.email ?? '', gsm: owner.gsm ?? '', phone: owner.phone ?? '' })}
        saving={saving}
        saved={saved}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PmsPanel({
  reservationId,
  onClose,
}: {
  reservationId: number;
  onClose: () => void;
}) {
  const [data,       setData]       = useState<PmsReservation | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [editNote,   setEditNote]   = useState(false);
  const [editOwner,  setEditOwner]  = useState(false);

  useEffect(() => {
    setData(null); setLoading(true); setError(null);
    setEditNote(false); setEditOwner(false);
    (async () => {
      try {
        const json = await gql<{ pmsReservation: PmsReservation | null }>(
          PMS_QUERY, { reservationId },
        );
        setData(json.pmsReservation);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [reservationId]);

  const nights    = data ? nightsBetween(data.arrival, data.departure) : 0;
  const source    = data ? (SOURCE_META[data.source]                   ?? { label: data.source,                        color: '#6B7280' }) : null;
  const payMethod = data ? (PAYMENT_METHOD[data.expectedPaymentMethod] ?? { label: `Method ${data.expectedPaymentMethod}`, color: '#6B7280' }) : null;

  return (
    <div style={{
      width: 380, flexShrink: 0,
      borderLeft: '1px solid var(--border-strong)',
      background: 'var(--bg-surface)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden',
    }}>

      {/* ── Sticky header ── */}
      <div style={{
        padding: '14px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--border-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#4A7FCB', background: '#EEF3FC', border: '1px solid #C3D5F5',
              borderRadius: 4, padding: '1px 6px',
            }}>
              PMS Live
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)' }}>
              #{reservationId}
            </span>
          </div>
          {data && (
            <div style={{
              fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
              marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {data.owner.name}
            </div>
          )}
        </div>
        <button onClick={onClose} title="Close" style={{
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

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[60, 110, 120, 100, 80].map((h, i) => (
              <div key={i} className="skeleton" style={{ height: h, borderRadius: 8 }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px', background: 'var(--status-red-bg)', borderRadius: 8,
            color: 'var(--status-red)', fontSize: 12,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && !data && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 13 }}>
            No PMS data for reservation <span style={{ fontFamily: 'var(--font-mono)' }}>#{reservationId}</span>
          </div>
        )}

        {data && (
          <>
            {/* ── Financial summary ── */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                {([
                  { label: 'Total', val: data.totalPrice, color: 'var(--fg)' },
                  { label: 'Paid',  val: data.advances,   color: 'var(--status-green)' },
                  { label: 'Due',   val: data.dueBalance,  color: data.dueBalance > 0 ? 'var(--status-red)' : 'var(--fg-subtle)' },
                ] as const).map(({ label, val, color }, i) => (
                  <div key={label} style={{
                    padding: '10px 12px', textAlign: 'center',
                    borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color, lineHeight: 1.1 }}>
                      {(val as number).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3 }}>
                      {label} <span style={{ fontFamily: 'var(--font-mono)' }}>{data.currencyISO}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Reservation details ── */}
            <Section title="Reservation">
              <InfoRow label="Stay">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {fmtDate(data.arrival)} → {fmtDate(data.departure)}
                </span>
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--fg-subtle)' }}>
                  {nights} night{nights !== 1 ? 's' : ''}
                </span>
              </InfoRow>
              <InfoRow label="Source">
                {source && <Chip label={source.label} color={source.color} />}
              </InfoRow>
              <InfoRow label="Segment">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{data.segment}</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--fg-subtle)' }}>{data.clientType}</span>
              </InfoRow>
              <InfoRow label="Payment">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {payMethod && <Chip label={payMethod.label} color={payMethod.color} />}
                  {data.virtualCardExists && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#4A7FCB', background: '#EEF3FC', borderRadius: 3, padding: '1px 5px', border: '1px solid #C3D5F5' }}>
                      VCARD
                    </span>
                  )}
                </span>
              </InfoRow>
              {data.hasAgreement && (
                <InfoRow label="Agreement">
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--status-green)' }}>✓ Has agreement</span>
                </InfoRow>
              )}
              {data.originID && (
                <InfoRow label="Origin ID">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{data.originID}</span>
                </InfoRow>
              )}
            </Section>

            {/* ── Rooms ── */}
            {data.rooms.map(room => (
              <Section key={room.id} title={`Room ${room.roomCode ?? '(unassigned)'} · ${room.roomTypeCode}`}>
                <InfoRow label="Dates">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {fmtDate(room.arrival)} → {fmtDate(room.departure)}
                  </span>
                </InfoRow>
                {room.eta && (
                  <InfoRow label="ETA">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{room.eta}</span>
                  </InfoRow>
                )}
                <InfoRow label="Pax">
                  {room.pax} guest{room.pax !== 1 ? 's' : ''}
                </InfoRow>
                {room.note && (
                  <InfoRow label="Note">
                    <span style={{ fontStyle: 'italic', fontSize: 11 }}>{room.note}</span>
                  </InfoRow>
                )}

                {room.guests.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {room.guests.map(g => <GuestCard key={g.id} guest={g} />)}
                  </div>
                )}
              </Section>
            ))}

            {/* ── Reservation Note (editable) ── */}
            <Section
              title="Reservation Note"
              onEdit={() => setEditNote(e => !e)}
              editing={editNote}
            >
              {editNote ? (
                <NoteEditor
                  reservationId={data.id}
                  initialNote={data.note}
                  onDone={note => {
                    setData(d => d ? { ...d, note } : d);
                    setEditNote(false);
                  }}
                />
              ) : (
                <div style={{
                  fontSize: 12, color: data.note ? 'var(--fg)' : 'var(--fg-subtle)',
                  fontStyle: data.note ? 'italic' : 'normal', lineHeight: 1.6,
                  minHeight: 20,
                }}>
                  {data.note ? `\u201C${data.note}\u201D` : 'No note — click edit to add one.'}
                </div>
              )}
            </Section>

            {/* ── Booker (editable) ── */}
            <Section
              title="Booker"
              onEdit={() => setEditOwner(e => !e)}
              editing={editOwner}
            >
              {editOwner ? (
                <OwnerEditor
                  reservationId={data.id}
                  owner={data.owner}
                  onDone={draft => {
                    setData(d => d ? {
                      ...d,
                      owner: {
                        ...d.owner,
                        name:  draft.name,
                        email: draft.email || null,
                        gsm:   draft.gsm   || null,
                        phone: draft.phone || null,
                      },
                    } : d);
                    setEditOwner(false);
                  }}
                />
              ) : (
                <>
                  <InfoRow label="Name">{data.owner.name}</InfoRow>
                  {data.owner.email && <InfoRow label="Email"><span style={{ fontSize: 11 }}>{data.owner.email}</span></InfoRow>}
                  {data.owner.gsm   && <InfoRow label="Phone"><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{data.owner.gsm}</span></InfoRow>}
                  {data.owner.phone && <InfoRow label="Landline"><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{data.owner.phone}</span></InfoRow>}
                  <InfoRow label="Language">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{data.owner.languageISO.trim()}</span>
                  </InfoRow>
                </>
              )}
            </Section>

            {/* ── Flags ── */}
            {(data.chmExtraServiceInclusive || data.chmExtraServiceExclusive || data.passwordProtected) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {data.chmExtraServiceInclusive && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#EEF3FC', color: '#4A7FCB', border: '1px solid #C3D5F5' }}>
                    CHM Inclusive
                  </span>
                )}
                {data.chmExtraServiceExclusive && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#F0FDF4', color: 'var(--status-green)', border: '1px solid #A7F3D0' }}>
                    CHM Exclusive
                  </span>
                )}
                {data.passwordProtected && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'var(--status-yellow-bg)', color: 'var(--status-yellow)', border: '1px solid var(--status-yellow-border)' }}>
                    Password Protected
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
