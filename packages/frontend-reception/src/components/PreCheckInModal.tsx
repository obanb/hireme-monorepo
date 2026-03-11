'use client';

import { useState, useEffect } from 'react';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';

// ── GQL ───────────────────────────────────────────────────────────────────────

const PMS_QUERY = `
  query PmsReservation($reservationId: Int!) {
    pmsReservation(reservationId: $reservationId) {
      id originID note
      arrival departure currencyISO totalPrice dueBalance
      owner { id name email gsm }
      rooms {
        id idStay roomTypeCode roomCode pax note
        guests {
          id idGuestAccount firstName surname isMale birthDate
          idCard visa nationalityISO2 email gsm carLicensePlate
          address { street city zip countryISO2 }
          gdpr { repetitiveStay marketing }
        }
      }
    }
  }
`;

const UPDATE_GUEST_MUTATION = `
  mutation PmsUpdateGuest($input: PmsUpdateGuestInput!) {
    pmsUpdateGuest(input: $input) { isSuccess errors }
  }
`;

const CHECKIN_MUTATION = `
  mutation PmsCheckIn($input: PmsCheckInInput!) {
    pmsCheckIn(input: $input) { isSuccess errors }
  }
`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PmsAddress { street: string; city: string; zip: string; countryISO2: string; }
interface PmsGdpr    { repetitiveStay: boolean; marketing: boolean; }
interface PmsGuest   {
  id: number; idGuestAccount: number;
  firstName: string; surname: string; isMale: number;
  birthDate: string | null; idCard: string; visa: string;
  nationalityISO2: string | null; email: string | null;
  gsm: string | null; carLicensePlate: string | null;
  address: PmsAddress; gdpr: PmsGdpr;
}
interface PmsRoom {
  id: number; idStay: number; roomTypeCode: string; roomCode: string | null;
  pax: number; note: string; guests: PmsGuest[];
}
interface PmsOwner   { id: number; name: string; email: string | null; gsm: string | null; }
interface PmsRes     {
  id: number; originID: string | null; note: string;
  arrival: string; departure: string; currencyISO: string;
  totalPrice: number; dueBalance: number;
  owner: PmsOwner; rooms: PmsRoom[];
}

interface GuestDraft {
  guestId:        number;
  firstName:      string;
  surname:        string;
  isMale:         boolean;
  birthDate:      string;
  idCard:         string;
  visa:           string;
  nationalityISO2:string;
  email:          string;
  gsm:            string;
  carLicensePlate:string;
  street:         string;
  city:           string;
  zip:            string;
  countryISO2:    string;
  repetitiveStay: boolean;
  marketing:      boolean;
}

interface RoomState {
  room:       PmsRoom;
  guests:     GuestDraft[];
  savedGuests:Set<number>; // guestIds that have been saved
  checkedIn:  boolean;
}

type Step = 'loading' | 'error' | 'guests' | 'actions' | 'done';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function fmtDate(iso: string) { return iso ? iso.slice(0, 10) : '—'; }

function draftFromGuest(g: PmsGuest): GuestDraft {
  return {
    guestId:         g.id,
    firstName:       g.firstName,
    surname:         g.surname,
    isMale:          g.isMale === 1,
    birthDate:       g.birthDate ?? '',
    idCard:          g.idCard,
    visa:            g.visa,
    nationalityISO2: g.nationalityISO2 ?? '',
    email:           g.email ?? '',
    gsm:             g.gsm ?? '',
    carLicensePlate: g.carLicensePlate ?? '',
    street:          g.address.street,
    city:            g.address.city,
    zip:             g.address.zip,
    countryISO2:     g.address.countryISO2,
    repetitiveStay:  g.gdpr.repetitiveStay,
    marketing:       g.gdpr.marketing,
  };
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', half }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; half?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: half ? '0 0 calc(50% - 4px)' : '1 1 auto' }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontSize: 12.5, padding: '6px 9px', borderRadius: 6,
          border: '1px solid var(--border-strong)',
          background: 'var(--bg)', color: 'var(--fg)',
          width: '100%', boxSizing: 'border-box', outline: 'none',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void; }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12.5 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 14, height: 14, cursor: 'pointer' }}
      />
      <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--fg-subtle)', padding: '0 0 6px',
      borderBottom: '1px solid var(--border)', marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

// ── Guest edit form ───────────────────────────────────────────────────────────

function GuestForm({
  draft, reservationId, resRoomId, saved,
  onChange, onSave,
}: {
  draft: GuestDraft;
  reservationId: number;
  resRoomId: number;
  saved: boolean;
  onChange: (patch: Partial<GuestDraft>) => void;
  onSave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [localSaved, setLocalSaved] = useState(saved);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => { setLocalSaved(saved); }, [saved]);

  async function handleSave() {
    setSaving(true); setSaveError(null);
    const input = {
      reservationId,
      resRoomId,
      citizenId: draft.guestId,
      citizen: {
        firstName:       draft.firstName,
        surname:         draft.surname,
        isMale:          draft.isMale,
        birthDate:       draft.birthDate || null,
        idCard:          draft.idCard,
        visa:            draft.visa,
        nationalityISO2: draft.nationalityISO2 || null,
        email:           draft.email || null,
        gsm:             draft.gsm || null,
        carLicensePlate: draft.carLicensePlate || null,
        address: { street: draft.street, city: draft.city, zip: draft.zip, countryISO2: draft.countryISO2 },
        gdpr: { repetitiveStay: draft.repetitiveStay, marketing: draft.marketing },
      },
    };
    console.log('[PMS] pmsUpdateGuest →', input);
    try {
      await gql(UPDATE_GUEST_MUTATION, { input });
      setLocalSaved(true);
      onSave();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', border: `1px solid ${localSaved ? 'var(--status-green-border)' : 'var(--border-strong)'}`,
      borderRadius: 10, padding: '14px 16px',
      transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--accent-light)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
          </svg>
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{draft.firstName} {draft.surname}</span>
        {localSaved && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 600,
            color: 'var(--status-green)', background: 'var(--status-green-bg)',
            border: '1px solid var(--status-green-border)',
            borderRadius: 4, padding: '1px 7px',
          }}>
            ✓ Saved
          </span>
        )}
      </div>

      {/* Personal info */}
      <SectionTitle>Personal information</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Field label="First name"   value={draft.firstName}       onChange={v => onChange({ firstName: v })}       half />
        <Field label="Surname"      value={draft.surname}         onChange={v => onChange({ surname: v })}         half />
        <Field label="Date of birth" value={draft.birthDate}      onChange={v => onChange({ birthDate: v })}       half type="date" />
        <Field label="Nationality (ISO2)" value={draft.nationalityISO2} onChange={v => onChange({ nationalityISO2: v })} half />
      </div>

      {/* Gender */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {([{ val: true, label: '♂ Male' }, { val: false, label: '♀ Female' }] as const).map(({ val, label }) => (
          <label key={String(val)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5 }}>
            <input
              type="radio"
              name={`gender-${draft.guestId}`}
              checked={draft.isMale === val}
              onChange={() => onChange({ isMale: val })}
            />
            <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
          </label>
        ))}
      </div>

      {/* Documents */}
      <SectionTitle>Travel documents</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Field label="ID / Passport no." value={draft.idCard}          onChange={v => onChange({ idCard: v })}          half />
        <Field label="Visa number"        value={draft.visa}            onChange={v => onChange({ visa: v })}            half />
        <Field label="Car licence plate"  value={draft.carLicensePlate} onChange={v => onChange({ carLicensePlate: v })} half />
      </div>

      {/* Contact */}
      <SectionTitle>Contact</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Field label="Email" value={draft.email} onChange={v => onChange({ email: v })} type="email" half />
        <Field label="Phone (GSM)" value={draft.gsm} onChange={v => onChange({ gsm: v })} half />
      </div>

      {/* Address */}
      <SectionTitle>Address</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Field label="Street"  value={draft.street}      onChange={v => onChange({ street: v })}      half />
        <Field label="City"    value={draft.city}        onChange={v => onChange({ city: v })}        half />
        <Field label="ZIP"     value={draft.zip}         onChange={v => onChange({ zip: v })}         half />
        <Field label="Country (ISO2)" value={draft.countryISO2} onChange={v => onChange({ countryISO2: v })} half />
      </div>

      {/* GDPR */}
      <SectionTitle>GDPR</SectionTitle>
      <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
        <Checkbox label="Accepts repetitive stay marketing" checked={draft.repetitiveStay} onChange={v => onChange({ repetitiveStay: v })} />
        <Checkbox label="Accepts marketing communication"   checked={draft.marketing}      onChange={v => onChange({ marketing: v })} />
      </div>

      {saveError && (
        <div style={{ fontSize: 11, color: 'var(--status-red)', marginBottom: 8 }}>{saveError}</div>
      )}

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 7,
            background: localSaved ? 'var(--status-green-bg)' : 'var(--accent)',
            color: localSaved ? 'var(--status-green)' : '#fff',
            border: localSaved ? '1px solid var(--status-green-border)' : 'none',
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : localSaved ? '✓ Saved to PMS' : 'Save guest data'}
        </button>
      </div>
    </div>
  );
}

// ── Actions step ──────────────────────────────────────────────────────────────

function ActionsStep({
  pmsRes, roomStates, onDone,
}: {
  pmsRes: PmsRes; roomStates: RoomState[]; onDone: () => void;
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'preCheckedIn' | 'checkedIn'>('idle');
  const [error,  setError]  = useState<string | null>(null);

  const nights = Math.round(
    (new Date(pmsRes.departure).getTime() - new Date(pmsRes.arrival).getTime()) / 86_400_000,
  );

  async function handlePreCheckIn() {
    setStatus('saving'); setError(null);
    const payload = roomStates.map(rs => ({
      reservationId: pmsRes.id,
      resRoomId:     rs.room.id,
    }));
    console.log('[PMS] Pre-Check-In (no API call yet) →', payload);
    await new Promise(r => setTimeout(r, 600));
    setStatus('preCheckedIn');
  }

  async function handleCheckIn() {
    setStatus('saving'); setError(null);
    try {
      for (const rs of roomStates) {
        const input = { reservationId: pmsRes.id, resRoomId: rs.room.id };
        console.log('[PMS] pmsCheckIn →', input);
        await gql(CHECKIN_MUTATION, { input });
      }
      setStatus('checkedIn');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed');
      setStatus('idle');
    }
  }

  const isSaving = status === 'saving';
  const isDone   = status === 'preCheckedIn' || status === 'checkedIn';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Reservation summary */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
        borderRadius: 10, padding: '14px 16px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 10 }}>
          Reservation summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 12 }}>
          {[
            ['Reservation ID', `#${pmsRes.id}`],
            ['Guest', pmsRes.owner.name],
            ['Stay', `${fmtDate(pmsRes.arrival)} → ${fmtDate(pmsRes.departure)} (${nights} night${nights !== 1 ? 's' : ''})`],
            ['Due balance', `${pmsRes.dueBalance.toLocaleString()} ${pmsRes.currencyISO}`],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ fontFamily: label === 'Reservation ID' ? 'var(--font-mono)' : 'inherit', fontWeight: 500, color: 'var(--fg)' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Rooms */}
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {roomStates.map(rs => {
            const allSaved = rs.guests.every((_, gi) => rs.savedGuests.has(rs.room.guests[gi]?.id));
            return (
              <div key={rs.room.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 7,
                background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    Room {rs.room.roomCode ?? '?'} · {rs.room.roomTypeCode}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                    {rs.room.guests.map(g => `${g.firstName} ${g.surname}`).join(', ')}
                  </span>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                  background: allSaved ? 'var(--status-green-bg)' : 'var(--status-yellow-bg)',
                  color:      allSaved ? 'var(--status-green)'    : 'var(--status-yellow)',
                  border: `1px solid ${allSaved ? 'var(--status-green-border)' : 'var(--status-yellow-border)'}`,
                }}>
                  {allSaved ? '✓ Guest data saved' : '⚠ Guest data not saved'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Done state */}
      {isDone && (
        <div style={{
          padding: '20px', textAlign: 'center', borderRadius: 10,
          background: status === 'checkedIn' ? 'var(--status-green-bg)' : '#EFF6FF',
          border: `1px solid ${status === 'checkedIn' ? 'var(--status-green-border)' : '#BFDBFE'}`,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {status === 'checkedIn' ? '✓' : '🔔'}
          </div>
          <div style={{
            fontSize: 15, fontWeight: 700,
            color: status === 'checkedIn' ? 'var(--status-green)' : '#3B82F6',
          }}>
            {status === 'checkedIn' ? 'Checked in successfully!' : 'Pre-check-in completed!'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
            {status === 'checkedIn'
              ? 'Guest has been checked in to all rooms.'
              : 'Guest data saved. Room will be ready for check-in on arrival.'}
          </div>
          <button
            onClick={onDone}
            style={{
              marginTop: 16, fontSize: 12, fontWeight: 600, padding: '8px 20px',
              borderRadius: 7, border: 'none', cursor: 'pointer',
              background: status === 'checkedIn' ? 'var(--status-green)' : '#3B82F6',
              color: '#fff',
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Action buttons */}
      {!isDone && (
        <>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--status-red)', padding: '8px 12px', background: 'var(--status-red-bg)', borderRadius: 7 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Pre-check-in */}
            <button
              onClick={handlePreCheckIn}
              disabled={isSaving}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '20px 16px', borderRadius: 10, cursor: isSaving ? 'default' : 'pointer',
                border: '2px solid #BFDBFE', background: '#EFF6FF',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#3B82F6',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3B82F6' }}>Pre-Check-In</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, textAlign: 'center', lineHeight: 1.4 }}>
                  Verify guest data &amp; prepare room for arrival
                </div>
              </div>
            </button>

            {/* Check-in now */}
            <button
              onClick={handleCheckIn}
              disabled={isSaving}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '20px 16px', borderRadius: 10, cursor: isSaving ? 'default' : 'pointer',
                border: '2px solid var(--status-green-border)', background: 'var(--status-green-bg)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--status-green)',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--status-green)' }}>Check In Now</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, textAlign: 'center', lineHeight: 1.4 }}>
                  Immediately check guest into the room
                </div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function PreCheckInModal({
  bookingId,
  guestName,
  onClose,
}: {
  bookingId: number;
  guestName: string;
  onClose: () => void;
}) {
  const [step,       setStep]       = useState<Step>('loading');
  const [pmsRes,     setPmsRes]     = useState<PmsRes | null>(null);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [roomStates, setRoomStates] = useState<RoomState[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const json = await gql<{ pmsReservation: PmsRes | null }>(PMS_QUERY, { reservationId: bookingId });
        const res = json.pmsReservation;
        if (!res) {
          setLoadError(`No PMS data found for reservation #${bookingId}`);
          setStep('error');
          return;
        }
        setPmsRes(res);
        setRoomStates(res.rooms.map(room => ({
          room,
          guests:      room.guests.map(draftFromGuest),
          savedGuests: new Set<number>(),
          checkedIn:   false,
        })));
        setStep('guests');
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load PMS data');
        setStep('error');
      }
    })();
  }, [bookingId]);

  function updateGuestDraft(roomIdx: number, guestIdx: number, patch: Partial<GuestDraft>) {
    setRoomStates(prev => prev.map((rs, ri) => ri !== roomIdx ? rs : {
      ...rs,
      guests: rs.guests.map((g, gi) => gi !== guestIdx ? g : { ...g, ...patch }),
    }));
  }

  function markGuestSaved(roomIdx: number, guestId: number) {
    setRoomStates(prev => prev.map((rs, ri) => ri !== roomIdx ? rs : {
      ...rs,
      savedGuests: new Set([...rs.savedGuests, guestId]),
    }));
  }

  // Stepper
  const stepItems = [
    { key: 'guests',  label: 'Guest Details' },
    { key: 'actions', label: 'Check-In'      },
  ] as const;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', zIndex: 1001,
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(780px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 48px)',
        background: 'var(--bg)', borderRadius: 14,
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px', flexShrink: 0,
          borderBottom: '1px solid var(--border-strong)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'var(--accent-light)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Pre-Check-In</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {guestName} · <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>#{bookingId}</span>
            </div>
          </div>

          {/* Stepper */}
          {(step === 'guests' || step === 'actions') && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 0, marginRight: 12 }}>
              {stepItems.map((s, i) => {
                const active   = step === s.key;
                const done     = (step === 'actions') && s.key === 'guests';
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                        background: done ? 'var(--status-green)' : active ? 'var(--accent)' : 'var(--bg-surface)',
                        color:      done ? '#fff'                : active ? '#fff'          : 'var(--fg-subtle)',
                        border: done || active ? 'none' : '1.5px solid var(--border-strong)',
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: active ? 600 : 400, color: active ? 'var(--fg)' : 'var(--fg-muted)' }}>
                        {s.label}
                      </span>
                    </div>
                    {i < stepItems.length - 1 && (
                      <div style={{ width: 28, height: 1, background: 'var(--border-strong)', margin: '0 8px' }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 7, flexShrink: 0,
              border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
              color: 'var(--fg-muted)', cursor: 'pointer',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* Loading */}
          {step === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[120, 200, 150].map((h, i) => (
                <div key={i} className="skeleton" style={{ height: h, borderRadius: 10 }} />
              ))}
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div style={{
              padding: '24px', textAlign: 'center',
              color: 'var(--status-red)', background: 'var(--status-red-bg)',
              borderRadius: 10, fontSize: 13,
            }}>
              {loadError}
            </div>
          )}

          {/* Step 1: Guest details */}
          {step === 'guests' && pmsRes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {roomStates.map((rs, roomIdx) => (
                <div key={rs.room.id}>
                  {/* Room header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--accent)', background: 'var(--accent-light)',
                      borderRadius: 4, padding: '2px 8px',
                    }}>
                      Room {rs.room.roomCode ?? '—'} · {rs.room.roomTypeCode}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                      {rs.room.pax} guest{rs.room.pax !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Guest forms */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {rs.guests.map((draft, guestIdx) => (
                      <GuestForm
                        key={draft.guestId}
                        draft={draft}
                        reservationId={pmsRes.id}
                        resRoomId={rs.room.id}
                        saved={rs.savedGuests.has(draft.guestId)}
                        onChange={patch => updateGuestDraft(roomIdx, guestIdx, patch)}
                        onSave={() => markGuestSaved(roomIdx, draft.guestId)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Actions */}
          {step === 'actions' && pmsRes && (
            <ActionsStep
              pmsRes={pmsRes}
              roomStates={roomStates}
              onDone={onClose}
            />
          )}
        </div>

        {/* ── Footer ── */}
        {(step === 'guests' || step === 'actions') && (
          <div style={{
            padding: '14px 20px', flexShrink: 0,
            borderTop: '1px solid var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <button
              onClick={step === 'guests' ? onClose : () => setStep('guests')}
              style={{
                fontSize: 12.5, padding: '8px 16px', borderRadius: 7,
                border: '1px solid var(--border-strong)', background: 'transparent',
                color: 'var(--fg-muted)', cursor: 'pointer',
              }}
            >
              {step === 'guests' ? 'Cancel' : '← Back'}
            </button>

            {step === 'guests' && (
              <button
                onClick={() => setStep('actions')}
                style={{
                  fontSize: 12.5, fontWeight: 600, padding: '8px 20px', borderRadius: 7,
                  background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                Continue to Check-In
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
