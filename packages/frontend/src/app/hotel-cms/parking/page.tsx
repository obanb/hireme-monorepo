'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

interface ParkingOccupancy {
  id: string;
  spaceId: string;
  ownerName: string;
  ownerEmail: string | null;
  licensePlate: string;
  from: string;
  to: string | null;
  notes: string | null;
  createdAt: string;
  isActive: boolean;
}

interface ParkingSpace {
  id: string;
  number: number;
  label: string;
  type: 'STANDARD' | 'DISABLED' | 'VIP';
  isActive: boolean;
  currentOccupancy: ParkingOccupancy | null;
}

interface ParkingStats {
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number;
  todayArrivals: number;
  todayDepartures: number;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const SPACE_FIELDS = `id number label type isActive currentOccupancy {
  id spaceId ownerName ownerEmail licensePlate from to notes createdAt isActive
}`;

const emptyForm = { ownerName: '', ownerEmail: '', licensePlate: '', from: '', to: '', notes: '' };

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('cs-CZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function nowLocalDatetime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

// Space type colors (for the parking map — kept vivid for visual clarity)
const SPACE_COLORS = {
  free:     { bg: '#22c55e', border: '#16a34a', strip: '#15803d' },
  vip:      { bg: '#f59e0b', border: '#d97706', strip: '#b45309' },
  disabled: { bg: '#3b82f6', border: '#2563eb', strip: '#1d4ed8' },
  occupied: { bg: '#ef4444', border: '#dc2626', strip: '#b91c1c' },
  highlight:{ bg: '#eab308', border: '#ca8a04', strip: '#a16207' },
};

function SpaceCard({ space, highlight, onClick }: { space: ParkingSpace; highlight: boolean; onClick: (s: ParkingSpace) => void }) {
  const [hov, setHov] = useState(false);
  const occ = space.currentOccupancy;
  const isVip = space.type === 'VIP';
  const isDisabled = space.type === 'DISABLED';

  const colors = highlight ? SPACE_COLORS.highlight
    : occ ? SPACE_COLORS.occupied
    : isVip ? SPACE_COLORS.vip
    : isDisabled ? SPACE_COLORS.disabled
    : SPACE_COLORS.free;

  return (
    <div
      onClick={() => onClick(space)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={occ ? `${occ.licensePlate} — ${occ.ownerName}` : `Space ${space.label} (free)`}
      style={{
        position: 'relative', cursor: 'pointer', width: 88, height: 110,
        borderRadius: '10px 10px 4px 4px',
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderBottom: `4px solid ${colors.border}`,
        transform: hov ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
        boxShadow: hov ? '0 8px 20px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.15)',
        transition: 'all 0.15s ease',
        userSelect: 'none',
        outline: highlight ? '3px solid rgba(234,179,8,0.6)' : 'none',
        outlineOffset: 2,
      }}
    >
      <div style={{ position: 'absolute', top: 5, left: 7, fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.65)', lineHeight: 1 }}>
        {space.label}
      </div>
      {(isVip || isDisabled) && !occ && (
        <div style={{ position: 'absolute', top: 5, right: 6, fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.65)' }}>
          {isVip ? 'VIP' : '♿'}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: 12, gap: 3 }}>
        {occ ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-all', padding: '0 4px' }}>
              {occ.licensePlate}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.2, padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
              {occ.ownerName}
            </div>
            {occ.to && (
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                until {new Date(occ.to).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>P</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>free</div>
          </>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, borderRadius: '0 0 3px 3px', background: colors.strip }} />
    </div>
  );
}

const ROWS = [
  { label: 'A', spaces: [1, 2, 3, 4, 5, 6] },
  { label: 'B', spaces: [7, 8, 9, 10, 11, 12] },
  { lane: true },
  { label: 'C', spaces: [13, 14, 15, 16, 17, 18] },
  { label: 'D', spaces: [19, 20, 21, 22, 23, 24] },
  { lane: true },
  { label: 'E', spaces: [25, 26, 27, 28, 29, 30] },
] as const;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
  background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)',
};

export default function ParkingPage() {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [stats, setStats] = useState<ParkingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ query: `{ parkingSpaces { ${SPACE_FIELDS} } parkingStats { total occupied available occupancyRate todayArrivals todayDepartures } }` }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setSpaces(json.data.parkingSpaces ?? []);
      setStats(json.data.parkingStats ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load parking data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const spaceMap = new Map(spaces.map((s) => [s.number, s]));

  const handleSpaceClick = (space: ParkingSpace) => {
    setSelectedSpace(space);
    if (space.currentOccupancy) {
      setShowDetailModal(true);
    } else {
      setForm({ ...emptyForm, from: nowLocalDatetime() });
      setShowAssignModal(true);
    }
  };

  const handleAssign = async () => {
    if (!selectedSpace) return;
    setSaving(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          query: `mutation($input: AssignParkingInput!) { assignParking(input: $input) { id licensePlate ownerName } }`,
          variables: { input: { spaceId: selectedSpace.id, ownerName: form.ownerName, ownerEmail: form.ownerEmail || null, licensePlate: form.licensePlate, from: form.from, to: form.to || null, notes: form.notes || null } },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setSuccess(`Car ${form.licensePlate} parked in space ${selectedSpace.label}`);
      setShowAssignModal(false);
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign parking');
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async (space: ParkingSpace) => {
    if (!(await confirm({ message: `Release parking space ${space.label}?`, confirmLabel: 'Release', danger: true }))) return;
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ query: `mutation($spaceId: ID!) { releaseParking(spaceId: $spaceId) }`, variables: { spaceId: space.id } }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      toast.success(`Space ${space.label} released.`);
      setShowDetailModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to release space');
    }
  };

  const matchingNumbers = new Set<number>();
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    spaces.forEach((s) => {
      if (s.currentOccupancy) {
        const occ = s.currentOccupancy;
        if (occ.licensePlate.toLowerCase().includes(q) || occ.ownerName.toLowerCase().includes(q) || (occ.ownerEmail ?? '').toLowerCase().includes(q)) {
          matchingNumbers.add(s.number);
        }
      }
    });
  }

  const occupiedSpaces = spaces.filter((s) => s.currentOccupancy);

  const thStyle: React.CSSProperties = {
    color: 'var(--text-muted)', fontSize: '9px', fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 16px', textAlign: 'left',
  };
  const tdStyle: React.CSSProperties = {
    padding: '12px 16px', borderTop: '1px solid var(--card-border)',
    color: 'var(--text-secondary)', fontSize: '13px',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <HotelSidebar />
      <main style={{ flex: 1, marginLeft: 'var(--sidebar-width, 280px)', padding: '32px', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {t('parking.title')}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('parking.subtitle')}</p>
            </div>
            <button
              onClick={fetchAll}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {t('common.refresh')}
            </button>
          </div>

          {success && (
            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ADE80', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>✓ {success}</span>
              <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', color: '#4ADE80', cursor: 'pointer' }}>×</button>
            </div>
          )}
          {error && (
            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.3)', color: '#FB7185', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>{error}</span>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#FB7185', cursor: 'pointer' }}>×</button>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Occupancy</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{stats.occupancyRate}%</span>
                </div>
                <div style={{ width: '100%', background: 'var(--background)', borderRadius: 6, height: 8 }}>
                  <div style={{
                    height: 8, borderRadius: 6, transition: 'width 0.3s',
                    background: stats.occupancyRate >= 80 ? '#ef4444' : stats.occupancyRate >= 50 ? '#f59e0b' : '#22c55e',
                    width: `${stats.occupancyRate}%`,
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>
                  <span>{stats.occupied} occupied</span>
                  <span>{stats.available} free</span>
                </div>
              </div>
              {[
                { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
                { label: 'Occupied', value: stats.occupied, color: '#FB7185' },
                { label: 'Available', value: stats.available, color: '#4ADE80' },
                { label: "Today In", value: stats.todayArrivals, color: '#60B8D4' },
                { label: "Today Out", value: stats.todayDepartures, color: '#A78BFA' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color, marginTop: 6 }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Search + Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by plate, name or email..."
                style={{ padding: '9px 12px 9px 36px', border: '1px solid var(--card-border)', borderRadius: 10, fontSize: 13, background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', width: 260 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
              {[
                { label: 'Free', color: '#22c55e' },
                { label: 'Occupied', color: '#ef4444' },
                { label: 'VIP', color: '#f59e0b' },
                { label: 'Disabled', color: '#3b82f6' },
              ].map(({ label, color }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Parking Map */}
          <div style={{ background: '#1e1e1a', borderRadius: 20, padding: 24, border: '1px solid #3a3a2e', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: '#3a3a2e' }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6b6b5a', display: 'flex', alignItems: 'center', gap: 6 }}>
                ↓ ENTRANCE / EXIT ↓
              </span>
              <div style={{ flex: 1, height: 1, background: '#3a3a2e' }} />
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTop: '3px solid #C9A96E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ROWS.map((row, rowIdx) => {
                  if ('lane' in row && row.lane) {
                    return (
                      <div key={`lane-${rowIdx}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                        <div style={{ flex: 1, borderTop: '2px dashed #3a3a2e' }} />
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4a4a3a', display: 'flex', alignItems: 'center', gap: 6 }}>
                          ← DRIVING LANE →
                        </span>
                        <div style={{ flex: 1, borderTop: '2px dashed #3a3a2e' }} />
                      </div>
                    );
                  }
                  const spaceRow = row as { label: string; spaces: readonly number[] };
                  return (
                    <div key={spaceRow.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#4a4a3a', width: 14, textAlign: 'center' }}>{spaceRow.label}</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {spaceRow.spaces.map((num) => {
                          const space = spaceMap.get(num);
                          if (!space) return null;
                          return (
                            <SpaceCard
                              key={space.id}
                              space={space}
                              highlight={matchingNumbers.has(space.number)}
                              onClick={handleSpaceClick}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Currently Parked List */}
          {occupiedSpaces.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--card-border)' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Currently Parked <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14 }}>({occupiedSpaces.length})</span>
                </h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Space', 'Plate', 'Owner', 'Email', 'Since', 'Until', 'Actions'].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {occupiedSpaces.map((space) => {
                      const occ = space.currentOccupancy!;
                      const isHov = hoveredRow === space.id;
                      return (
                        <tr
                          key={space.id}
                          onMouseEnter={() => setHoveredRow(space.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{ background: isHov ? 'var(--surface-hover)' : 'transparent', transition: 'background 0.15s' }}
                        >
                          <td style={tdStyle}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 5, background: 'var(--background)', border: '1px solid var(--card-border)', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>
                              {space.label}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{occ.licensePlate}</td>
                          <td style={tdStyle}>{occ.ownerName}</td>
                          <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{occ.ownerEmail ?? '—'}</td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDateTime(occ.from)}</td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDateTime(occ.to)}</td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => { setSelectedSpace(space); setShowDetailModal(true); }}
                                style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 7, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleRelease(space)}
                                style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 7, border: 'none', background: 'rgba(251,113,133,0.08)', color: '#FB7185', cursor: 'pointer' }}
                              >
                                Release
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Assign Modal */}
      {showAssignModal && selectedSpace && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: 'var(--sidebar-bg)', borderRadius: 16, width: '100%', maxWidth: 440, border: '1px solid var(--card-border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
                {selectedSpace.label}
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Assign Parking</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Space {selectedSpace.label} · {selectedSpace.type}</p>
              </div>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Owner Name *</label>
                  <input type="text" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="Jan Novák" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>License Plate *</label>
                  <input type="text" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })} placeholder="1AB 2345" style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Email</label>
                <input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} placeholder="guest@hotel.com" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>From *</label>
                  <input type="datetime-local" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Until</label>
                  <input type="datetime-local" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>Notes</label>
                <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. VIP guest, oversized vehicle..." style={inputStyle} />
              </div>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAssignModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={saving || !form.ownerName || !form.licensePlate || !form.from}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (saving || !form.ownerName || !form.licensePlate || !form.from) ? 0.5 : 1 }}
              >
                {saving ? 'Saving...' : 'Assign Space'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSpace?.currentOccupancy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: 'var(--sidebar-bg)', borderRadius: 16, width: '100%', maxWidth: 420, border: '1px solid var(--card-border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
                {selectedSpace.label}
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Space {selectedSpace.label}</h2>
                <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#FB7185', marginTop: 2 }}>{selectedSpace.currentOccupancy.licensePlate}</div>
              </div>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Owner', value: selectedSpace.currentOccupancy.ownerName },
                { label: 'Email', value: selectedSpace.currentOccupancy.ownerEmail ?? '—' },
                { label: 'License Plate', value: selectedSpace.currentOccupancy.licensePlate, mono: true },
                { label: 'Parked Since', value: formatDateTime(selectedSpace.currentOccupancy.from) },
                { label: 'Expected Until', value: formatDateTime(selectedSpace.currentOccupancy.to) },
                { label: 'Registered', value: formatDateTime(selectedSpace.currentOccupancy.createdAt) },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
                </div>
              ))}
              {selectedSpace.currentOccupancy.notes && (
                <div style={{ padding: 12, borderRadius: 9, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <span style={{ fontWeight: 600, color: '#FBBF24', fontSize: 12 }}>Notes: </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedSpace.currentOccupancy.notes}</span>
                </div>
              )}
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDetailModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Close
              </button>
              <button onClick={() => handleRelease(selectedSpace)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Release Space
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
