'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

// ── Types ─────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  name: string;
  roomNumber: string;
  type: string;
  capacity: number;
  status: string;
  color: string;
}

interface Reservation {
  id: string;
  originId: string | null;
  guestName: string;
  guestEmail: string | null;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number | null;
  payedPrice?: number | null;
  currency: string;
  roomIds: string[];
}

interface GuestTierInfo {
  tier: { name: string; color: string } | null;
  reservationCount: number;
  totalSpend: number;
}

interface CheckInWizardProps {
  reservation: Reservation;
  rooms: Room[];
  tierInfo: GuestTierInfo | null;
  onComplete: () => void;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function nights(checkIn: string, checkOut: string) {
  return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: '#4ADE80',
  OCCUPIED:  '#FB7185',
  DIRTY:     '#FBBF24',
  MAINTENANCE: '#A78BFA',
};

const TYPE_COLORS: Record<string, string> = {
  SINGLE:    '#60B8D4',
  DOUBLE:    '#4ADE80',
  SUITE:     '#C9A96E',
  DELUXE:    '#A78BFA',
  PENTHOUSE: '#FB7185',
};

// ── Step indicator ─────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width:        i <= step ? 20 : 6,
            height:       6,
            borderRadius: 3,
            background:   i <= step ? 'var(--gold)' : 'var(--card-border)',
            transition:   'all 0.25s ease',
          }}
        />
      ))}
      <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>
        Step {step + 1} of {total}
      </span>
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────

export default function CheckInWizard({ reservation, rooms, tierInfo, onComplete, onClose }: CheckInWizardProps) {
  const toast = useToast();

  const [step, setStep]               = useState(0); // 0=Verify 1=Room 2=Complete
  const [idChecked, setIdChecked]     = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(reservation.roomIds[0] ?? '');
  const [roomIdx, setRoomIdx]         = useState(0);
  const [saving, setSaving]           = useState(false);
  const [done, setDone]               = useState(false);

  const continueRef = useRef<HTMLButtonElement>(null);
  const completeRef = useRef<HTMLButtonElement>(null);

  const stayNights = nights(reservation.checkInDate, reservation.checkOutDate);
  const initials   = reservation.guestName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  // Available rooms sorted: AVAILABLE first, then pre-selected room first within that
  const availableRooms = rooms
    .filter((r) => r.status === 'AVAILABLE' || reservation.roomIds.includes(r.id))
    .sort((a, b) => {
      if (reservation.roomIds.includes(a.id)) return -1;
      if (reservation.roomIds.includes(b.id)) return 1;
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    });

  // Sync roomIdx when selectedRoomId changes
  useEffect(() => {
    const idx = availableRooms.findIndex((r) => r.id === selectedRoomId);
    if (idx !== -1) setRoomIdx(idx);
  }, [selectedRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus continue button on step change
  useEffect(() => {
    if (step === 0) continueRef.current?.focus();
    if (step === 2) completeRef.current?.focus();
  }, [step]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }

      if (step === 1) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = Math.min(roomIdx + 1, availableRooms.length - 1);
          setRoomIdx(next);
          setSelectedRoomId(availableRooms[next]?.id ?? '');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = Math.max(roomIdx - 1, 0);
          setRoomIdx(prev);
          setSelectedRoomId(availableRooms[prev]?.id ?? '');
        } else if (e.key === 'Enter' && !saving) {
          e.preventDefault();
          handleAssignRoom();
        }
      }

      if (step === 0 && (e.key === 'Enter' || e.key === ' ') && e.target === continueRef.current) {
        // handled by button
      }

      if (step === 2 && e.key === 'Enter' && !saving && !done) {
        e.preventDefault();
        handleComplete();
      }

      if (e.key === 'p' || e.key === 'P') {
        if (step === 2) printCard();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, roomIdx, availableRooms, saving, done]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Assign room mutation ───────────────────────────────────────────────

  const handleAssignRoom = useCallback(async () => {
    if (!selectedRoomId) { setStep(2); return; } // skip if no room
    setSaving(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation AssignRooms($input: AssignRoomsInput!) { assignRooms(input: $input) { reservation { id roomIds } } }`,
          variables: { input: { reservationId: reservation.id, roomIds: [selectedRoomId] } },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign room');
    } finally {
      setSaving(false);
    }
  }, [selectedRoomId, reservation.id, toast]);

  // ── Complete check-in (confirm reservation) ───────────────────────────

  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($input:ConfirmReservationInput!){confirmReservation(input:$input){reservation{id status}}}`,
          variables: { input: { reservationId: reservation.id, confirmedBy: 'Reception' } },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setDone(true);
      toast.success(`${reservation.guestName} checked in!`);
      setTimeout(() => { onComplete(); onClose(); }, 900);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete check-in');
    } finally {
      setSaving(false);
    }
  }, [reservation.id, reservation.guestName, toast, onComplete, onClose]);

  // ── Print registration card ────────────────────────────────────────────

  const printCard = () => {
    const room = availableRooms.find((r) => r.id === selectedRoomId);
    const roomStr = room ? `Room ${room.roomNumber}` : '—';
    const html = `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"/><title>Registrační karta — ${reservation.guestName}</title>
<style>
  @media print{@page{size:A4;margin:14mm}body{margin:0}.no-print{display:none}}
  body{font-family:Arial,sans-serif;font-size:10px;color:#111;background:#fff;padding:20px;max-width:180mm;margin:auto}
  .header{background:#1a2340;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}
  .header-title{font-size:13px;font-weight:bold;letter-spacing:.05em}
  .row{display:flex;gap:0;margin-bottom:0}
  .cell{border:1px solid #aaa;padding:6px 8px;flex:1;background:#f4f6f9}
  .cell+.cell{border-left:none}
  .row+.row>.cell{border-top:none}
  .lbl{font-size:7px;color:#555;margin-bottom:3px;text-transform:uppercase;letter-spacing:.05em}
  .val{font-size:11px;font-weight:bold;min-height:14px}
  .white .cell{background:#fff}
  .sig{flex:1;border:1px solid #aaa;padding:6px 8px;min-height:32px}
  .sig+.sig{border-left:none}
  .btn{display:block;margin:16px auto;padding:10px 28px;background:#1a2340;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer}
</style></head><body>
<div class="header">
  <div style="font-size:8px;opacity:.7">Hotel CMS</div>
  <div class="header-title">REGISTRAČNÍ KARTA &nbsp;•&nbsp; REGISTRATION CARD</div>
  <div></div>
</div>
<div class="row">
  <div class="cell" style="flex:0 0 38%;background:#e8ecf4"><div class="lbl">Číslo pokoje / Room Number</div><div class="val">${roomStr}</div></div>
  <div class="cell" style="flex:0 0 30%"><div class="lbl">Příjezd / Arrival</div><div class="val">${new Date(reservation.checkInDate).toLocaleDateString('cs-CZ')}</div></div>
  <div class="cell" style="flex:0 0 32%;border-left:none"><div class="lbl">Odjezd / Departure</div><div class="val">${new Date(reservation.checkOutDate).toLocaleDateString('cs-CZ')}</div></div>
</div>
<div class="row white">
  <div class="cell" style="flex:0 0 60%"><div class="lbl">Jméno hosta / Guest Name</div><div class="val">${reservation.guestName}</div></div>
  <div class="cell" style="flex:0 0 40%"><div class="lbl">Státní příslušnost / Nationality</div><div class="val" style="min-height:14px"></div></div>
</div>
<div class="row white">
  <div class="cell"><div class="lbl">Adresa / Address</div><div class="val" style="min-height:14px"></div></div>
  <div class="cell"><div class="lbl">Datum narození / Date of Birth</div><div class="val" style="min-height:14px"></div></div>
</div>
<div class="row white">
  <div class="cell"><div class="lbl">Číslo dokladu / ID Number</div><div class="val" style="min-height:14px"></div></div>
  <div class="cell"><div class="lbl">Telefon / Phone</div><div class="val" style="min-height:14px"></div></div>
  <div class="cell"><div class="lbl">E-mail</div><div class="val">${reservation.guestEmail ?? ''}</div></div>
</div>
<div style="font-size:8px;font-weight:bold;background:#e8ecf4;padding:4px 8px;border:1px solid #aaa;border-bottom:none;text-transform:uppercase;letter-spacing:.08em;margin-top:6px">Platba / Payment</div>
<div class="row white">
  <div class="cell"><div class="lbl">Způsob platby / Payment Method</div><div class="val" style="min-height:14px"></div></div>
  <div class="cell"><div class="lbl">Celková cena / Total</div><div class="val">${reservation.totalPrice != null ? reservation.totalPrice + ' ' + reservation.currency : '—'}</div></div>
  <div class="cell"><div class="lbl">Zaplaceno / Paid</div><div class="val">${(reservation.payedPrice ?? 0) > 0 ? (reservation.payedPrice ?? 0) + ' ' + reservation.currency : '—'}</div></div>
</div>
<div style="display:flex;gap:0;margin-top:10px">
  <div class="sig"><div class="lbl">Podpis hosta / Guest Signature</div></div>
  <div class="sig"><div class="lbl">Podpis recepce / Reception</div></div>
</div>
<button class="btn no-print" onclick="window.print();window.close()">Tisk / Print</button>
</body></html>`;
    const win = window.open('', '_blank', 'width=820,height=700');
    if (win) { win.document.write(html); win.document.close(); }
    else toast.error('Pop-up blocked. Allow pop-ups for this site.');
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const selectedRoom = availableRooms.find((r) => r.id === selectedRoomId);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)', borderRadius: 16, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', animation: 'cmd-in 0.18s ease' }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Wizard header ── */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <StepDots step={step} total={3} />
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* ════════ STEP 0 — VERIFY ════════ */}
        {step === 0 && (
          <div style={{ padding: 24 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
              Verify Guest
            </p>

            {/* Guest card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '16px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--background)', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 700 }}>{reservation.guestName}</span>
                  {tierInfo?.tier && (
                    <span style={{ background: tierInfo.tier.color, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>
                      ★ {tierInfo.tier.name}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', color: 'var(--text-muted)', fontSize: 12 }}>
                  <span>#{reservation.originId ?? reservation.id.slice(0, 8)}</span>
                  <span style={{ color: 'var(--card-border)' }}>·</span>
                  <span>{fmt(reservation.checkInDate)} → {fmt(reservation.checkOutDate)}</span>
                  <span style={{ color: 'var(--card-border)' }}>·</span>
                  <span>{stayNights} night{stayNights !== 1 ? 's' : ''}</span>
                </div>
                {reservation.guestEmail && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{reservation.guestEmail}</p>
                )}
                <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                  {reservation.totalPrice != null && (
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Total</p>
                      <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>
                        {reservation.totalPrice.toLocaleString('en-US', { style: 'currency', currency: reservation.currency || 'EUR', maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                  {tierInfo && (
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Visits</p>
                      <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>{tierInfo.reservationCount}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ID check */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20, padding: '12px 14px', borderRadius: 9, border: `1px solid ${idChecked ? 'rgba(74,222,128,0.4)' : 'var(--card-border)'}`, background: idChecked ? 'rgba(74,222,128,0.05)' : 'transparent', transition: 'all 0.15s' }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${idChecked ? '#4ADE80' : 'var(--card-border)'}`, background: idChecked ? '#4ADE80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                {idChecked && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
              <input type="checkbox" checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Photo ID / passport verified</span>
            </label>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                ref={continueRef}
                onClick={() => setStep(1)}
                style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: 'var(--gold)', color: '#1a1a14', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                Assign Room
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* ════════ STEP 1 — ROOM ════════ */}
        {step === 1 && (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Select Room
              </p>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>↑↓ navigate · ↵ confirm</span>
            </div>

            {availableRooms.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No available rooms found.
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
                {availableRooms.map((room, i) => {
                  const isSelected = room.id === selectedRoomId;
                  const isHighlighted = i === roomIdx;
                  const color = room.color ?? TYPE_COLORS[room.type?.toUpperCase()] ?? '#A78BFA';
                  const preAssigned = reservation.roomIds.includes(room.id);
                  return (
                    <button
                      key={room.id}
                      onClick={() => { setSelectedRoomId(room.id); setRoomIdx(i); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 9, border: `1px solid ${isSelected ? color + '60' : isHighlighted ? 'var(--card-border)' : 'var(--card-border)'}`,
                        background: isSelected ? color + '12' : isHighlighted ? 'var(--surface-hover)' : 'var(--surface)',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s', width: '100%',
                        outline: isHighlighted && !isSelected ? `2px solid var(--gold)` : 'none',
                        outlineOffset: -1,
                      }}
                    >
                      {/* Radio dot */}
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${isSelected ? color : 'var(--card-border)'}`, background: isSelected ? color : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--background)' }} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
                            Room {room.roomNumber}
                          </span>
                          <span style={{ color, fontSize: 10, fontWeight: 600, background: color + '18', padding: '1px 6px', borderRadius: 4 }}>
                            {room.type}
                          </span>
                          {preAssigned && (
                            <span style={{ color: '#60B8D4', fontSize: 10, fontWeight: 600, background: 'rgba(96,184,212,0.12)', padding: '1px 6px', borderRadius: 4 }}>
                              Pre-assigned
                            </span>
                          )}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                          Capacity: {room.capacity}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[room.status] ?? 'var(--text-muted)' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{room.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button
                onClick={() => setStep(0)}
                style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                Back
              </button>
              <button
                onClick={handleAssignRoom}
                disabled={saving}
                style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: 'var(--gold)', color: '#1a1a14', fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Assigning…' : selectedRoomId ? 'Confirm Room' : 'Skip'}
                {!saving && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>}
              </button>
            </div>
          </div>
        )}

        {/* ════════ STEP 2 — COMPLETE ════════ */}
        {step === 2 && (
          <div style={{ padding: 24 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 18 }}>
              Complete Check-In
            </p>

            {/* Summary */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Guest', value: reservation.guestName },
                  { label: 'Room', value: selectedRoom ? `Room ${selectedRoom.roomNumber} · ${selectedRoom.type}` : '—' },
                  { label: 'Stay', value: `${fmt(reservation.checkInDate)} → ${fmt(reservation.checkOutDate)} (${stayNights}n)` },
                  { label: 'Total', value: reservation.totalPrice != null ? reservation.totalPrice.toLocaleString('en-US', { style: 'currency', currency: reservation.currency || 'EUR', maximumFractionDigits: 0 }) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Print card */}
            <button
              onClick={printCard}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 9, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 10, transition: 'background 0.15s' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print Registration Card
              <kbd style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--card-border)', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontFamily: 'monospace' }}>P</kbd>
            </button>

            {/* Complete */}
            <button
              ref={completeRef}
              onClick={handleComplete}
              disabled={saving || done}
              style={{ width: '100%', padding: '13px 0', borderRadius: 9, border: 'none', background: done ? '#4ADE80' : 'var(--gold)', color: done ? '#0a1a0a' : '#1a1a14', fontSize: 14, fontWeight: 700, cursor: saving || done ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', opacity: saving ? 0.7 : 1 }}
            >
              {done ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Checked In!
                </>
              ) : saving ? 'Processing…' : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Complete Check-In
                  <kbd style={{ background: 'rgba(0,0,0,0.15)', color: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontFamily: 'monospace' }}>↵</kbd>
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer hint */}
        <div style={{ padding: '8px 24px', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Esc to cancel</span>
          {step === 1 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>↑↓ navigate rooms · ↵ confirm</span>}
        </div>
      </div>
    </div>
  );
}
