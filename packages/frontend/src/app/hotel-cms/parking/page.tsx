'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

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

const emptyForm = {
  ownerName: '',
  ownerEmail: '',
  licensePlate: '',
  from: '',
  to: '',
  notes: '',
};

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

// ─── Space Card ──────────────────────────────────────────────────────────────

function SpaceCard({
  space,
  highlight,
  onClick,
}: {
  space: ParkingSpace;
  highlight: boolean;
  onClick: (s: ParkingSpace) => void;
}) {
  const occ = space.currentOccupancy;
  const isVip = space.type === 'VIP';
  const isDisabled = space.type === 'DISABLED';

  let bg = occ
    ? 'bg-red-500 hover:bg-red-400 border-red-700'
    : isVip
    ? 'bg-amber-400 hover:bg-amber-300 border-amber-600'
    : isDisabled
    ? 'bg-blue-400 hover:bg-blue-300 border-blue-600'
    : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700';

  if (highlight) bg = 'bg-yellow-400 hover:bg-yellow-300 border-yellow-600 ring-4 ring-yellow-300';

  return (
    <div
      onClick={() => onClick(space)}
      className={`relative cursor-pointer rounded-t-xl border-2 border-b-4 transition-all hover:scale-105 hover:-translate-y-0.5 hover:shadow-xl select-none ${bg}`}
      style={{ width: 88, height: 110 }}
      title={occ ? `${occ.licensePlate} — ${occ.ownerName}` : `Space ${space.label} (free)`}
    >
      {/* Space label */}
      <div className="absolute top-1.5 left-2 text-[10px] font-black text-white/70 leading-none">
        {space.label}
      </div>

      {/* Type badge */}
      {(isVip || isDisabled) && !occ && (
        <div className="absolute top-1.5 right-1.5 text-[9px] font-black text-white/70">
          {isVip ? 'VIP' : '♿'}
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col items-center justify-center h-full pt-3 px-1 gap-0.5">
        {occ ? (
          <>
            <div className="text-xs font-black text-white text-center leading-tight break-all">
              {occ.licensePlate}
            </div>
            <div className="text-[10px] text-white/80 text-center leading-tight truncate w-full text-center px-1 mt-0.5">
              {occ.ownerName}
            </div>
            {occ.to && (
              <div className="text-[9px] text-white/60 text-center mt-0.5 leading-tight">
                until {new Date(occ.to).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-white/40 text-3xl font-black leading-none">P</div>
            <div className="text-[9px] text-white/50 mt-0.5">free</div>
          </>
        )}
      </div>

      {/* Bottom indicator strip */}
      <div className={`absolute bottom-0 left-0 right-0 h-1.5 rounded-b-lg ${occ ? 'bg-red-800' : isVip ? 'bg-amber-600' : isDisabled ? 'bg-blue-600' : 'bg-emerald-700'}`} />
    </div>
  );
}

// ─── Parking Layout ──────────────────────────────────────────────────────────
// 30 spaces: rows of 6 with lane dividers
// Row A (1–6), Row B (7–12), [LANE], Row C (13–18), Row D (19–24), [LANE], Row E (25–30)

const ROWS = [
  { label: 'A', spaces: [1, 2, 3, 4, 5, 6] },
  { label: 'B', spaces: [7, 8, 9, 10, 11, 12] },
  { lane: true },
  { label: 'C', spaces: [13, 14, 15, 16, 17, 18] },
  { label: 'D', spaces: [19, 20, 21, 22, 23, 24] },
  { lane: true },
  { label: 'E', spaces: [25, 26, 27, 28, 29, 30] },
] as const;

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ParkingPage() {
  const { t } = useLocale();
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [stats, setStats] = useState<ParkingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // modals
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `{
            parkingSpaces { ${SPACE_FIELDS} }
            parkingStats { total occupied available occupancyRate todayArrivals todayDepartures }
          }`,
        }),
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($input: AssignParkingInput!) {
            assignParking(input: $input) { id licensePlate ownerName }
          }`,
          variables: {
            input: {
              spaceId: selectedSpace.id,
              ownerName: form.ownerName,
              ownerEmail: form.ownerEmail || null,
              licensePlate: form.licensePlate,
              from: form.from,
              to: form.to || null,
              notes: form.notes || null,
            },
          },
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
    if (!confirm(`Release parking space ${space.label}?`)) return;
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($spaceId: ID!) { releaseParking(spaceId: $spaceId) }`,
          variables: { spaceId: space.id },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setSuccess(`Space ${space.label} released`);
      setShowDetailModal(false);
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release space');
    }
  };

  // highlight spaces matching search
  const matchingNumbers = new Set<number>();
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    spaces.forEach((s) => {
      if (s.currentOccupancy) {
        const occ = s.currentOccupancy;
        if (
          occ.licensePlate.toLowerCase().includes(q) ||
          occ.ownerName.toLowerCase().includes(q) ||
          (occ.ownerEmail ?? '').toLowerCase().includes(q)
        ) {
          matchingNumbers.add(s.number);
        }
      }
    });
  }

  const occupiedSpaces = spaces.filter((s) => s.currentOccupancy);

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-black text-stone-900 dark:text-stone-100 mb-2">{t('parking.title')}</h1>
              <p className="text-stone-500 dark:text-stone-400">{t('parking.subtitle')}</p>
            </div>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors flex items-center gap-2"
            >
              <span className={loading ? 'animate-spin' : ''}>↺</span>
              {t('common.refresh')}
            </button>
          </div>

          {/* Alerts */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center justify-between">
              <span>✓ {success}</span>
              <button onClick={() => setSuccess(null)}>&times;</button>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)}>&times;</button>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
              <div className="col-span-2 md:col-span-2 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-stone-500 dark:text-stone-400">Occupancy</div>
                  <div className="text-2xl font-black text-stone-900 dark:text-stone-100">{stats.occupancyRate}%</div>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      stats.occupancyRate >= 80 ? 'bg-red-500' :
                      stats.occupancyRate >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${stats.occupancyRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-stone-400 mt-1">
                  <span>{stats.occupied} occupied</span>
                  <span>{stats.available} free</span>
                </div>
              </div>
              {[
                { label: 'Total Spaces', value: stats.total, color: 'text-stone-700 dark:text-stone-200' },
                { label: 'Occupied', value: stats.occupied, color: 'text-red-600' },
                { label: 'Available', value: stats.available, color: 'text-emerald-600' },
                { label: "Today's In", value: stats.todayArrivals, color: 'text-blue-600' },
                { label: "Today's Out", value: stats.todayDepartures, color: 'text-purple-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4 shadow-sm flex flex-col justify-between">
                  <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">{label}</div>
                  <div className={`text-3xl font-black mt-1 ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Search + Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by plate, name or email..."
              className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm w-72 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:bg-stone-800 dark:text-stone-100"
            />
            <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Free</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Occupied</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> VIP</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> Disabled</span>
            </div>
          </div>

          {/* Parking Map */}
          <div className="bg-stone-700 dark:bg-stone-900 rounded-3xl p-6 shadow-xl border border-stone-600 dark:border-stone-800 mb-8">
            {/* Entrance */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-stone-500" />
              <div className="text-stone-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <span>↓</span> ENTRANCE / EXIT <span>↓</span>
              </div>
              <div className="h-px flex-1 bg-stone-500" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {ROWS.map((row, rowIdx) => {
                  if ('lane' in row && row.lane) {
                    return (
                      <div key={`lane-${rowIdx}`} className="flex items-center gap-2 py-2">
                        <div className="h-0.5 flex-1 border-t-2 border-dashed border-stone-500" />
                        <div className="text-stone-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-3">
                          <span>←</span> DRIVING LANE <span>→</span>
                        </div>
                        <div className="h-0.5 flex-1 border-t-2 border-dashed border-stone-500" />
                      </div>
                    );
                  }

                  const spaceRow = row as { label: string; spaces: readonly number[] };
                  return (
                    <div key={spaceRow.label} className="flex items-center gap-3">
                      <div className="text-stone-400 text-xs font-black w-4 text-center">{spaceRow.label}</div>
                      <div className="flex gap-2 flex-wrap">
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
            <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-700">
                <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">
                  Currently Parked <span className="text-stone-400 font-normal text-base">({occupiedSpaces.length})</span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 dark:bg-stone-900">
                    <tr>
                      {['Space', 'Plate (SPZ)', 'Owner', 'Email', 'Since', 'Until', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                    {occupiedSpaces.map((space) => {
                      const occ = space.currentOccupancy!;
                      return (
                        <tr key={space.id} className="hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-stone-900 dark:bg-stone-600 text-white rounded font-mono font-bold text-xs">
                              {space.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-stone-900 dark:text-stone-100">{occ.licensePlate}</td>
                          <td className="px-4 py-3 text-stone-700 dark:text-stone-300">{occ.ownerName}</td>
                          <td className="px-4 py-3 text-stone-500 dark:text-stone-400">{occ.ownerEmail ?? '—'}</td>
                          <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">{formatDateTime(occ.from)}</td>
                          <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">{formatDateTime(occ.to)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setSelectedSpace(space); setShowDetailModal(true); }}
                                className="px-2 py-1 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-600 rounded-lg transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleRelease(space)}
                                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-xl">
                  {selectedSpace.label}
                </div>
                <div>
                  <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">Assign Parking</h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">Space {selectedSpace.label} · {selectedSpace.type}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    value={form.ownerName}
                    onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    placeholder="Jan Novák"
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">License Plate (SPZ) *</label>
                  <input
                    type="text"
                    value={form.licensePlate}
                    onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })}
                    placeholder="1AB 2345"
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono uppercase dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  placeholder="guest@hotel.com"
                  className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">From *</label>
                  <input
                    type="datetime-local"
                    value={form.from}
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">Until</label>
                  <input
                    type="datetime-local"
                    value={form.to}
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. VIP guest, oversized vehicle..."
                  className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={saving || !form.ownerName || !form.licensePlate || !form.from}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-semibold transition-colors"
              >
                {saving ? 'Saving...' : 'Assign Space'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSpace?.currentOccupancy && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white font-black text-xl">
                  {selectedSpace.label}
                </div>
                <div>
                  <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">Space {selectedSpace.label}</h2>
                  <div className="text-sm font-mono font-bold text-red-600">{selectedSpace.currentOccupancy.licensePlate}</div>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Owner', value: selectedSpace.currentOccupancy.ownerName },
                { label: 'Email', value: selectedSpace.currentOccupancy.ownerEmail ?? '—' },
                { label: 'License Plate', value: selectedSpace.currentOccupancy.licensePlate, mono: true },
                { label: 'Parked Since', value: formatDateTime(selectedSpace.currentOccupancy.from) },
                { label: 'Expected Until', value: formatDateTime(selectedSpace.currentOccupancy.to) },
                { label: 'Registered', value: formatDateTime(selectedSpace.currentOccupancy.createdAt) },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between items-start">
                  <span className="text-sm text-stone-500 dark:text-stone-400">{label}</span>
                  <span className={`text-sm font-semibold text-stone-900 dark:text-stone-100 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
                </div>
              ))}
              {selectedSpace.currentOccupancy.notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-stone-700 dark:text-stone-300 border border-amber-200 dark:border-amber-800">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Notes: </span>
                  {selectedSpace.currentOccupancy.notes}
                </div>
              )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleRelease(selectedSpace)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-colors"
              >
                🚗 Release Space
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
