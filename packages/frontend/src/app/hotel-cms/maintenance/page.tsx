'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

type MaintenanceStatus = 'DIRTY' | 'CLEAN' | 'MAINTENANCE' | 'CHECKED';

interface MaintenanceRecord {
  id: string;
  roomId: string;
  roomNumber: string;
  roomName: string;
  status: MaintenanceStatus;
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const RECORD_FIELDS = `id roomId roomNumber roomName status notes updatedBy updatedAt`;

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; bg: string; border: string; text: string; dot: string; icon: string }> = {
  DIRTY: {
    label: 'Dirty',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-700',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
    icon: '●',
  },
  CLEAN: {
    label: 'Clean',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    icon: '●',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    icon: '●',
  },
  CHECKED: {
    label: 'Checked',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-700',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    icon: '●',
  },
};

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Room Card ─────────────────────────────────────────────────────────────────

function RoomCard({
  record,
  selected,
  onSelect,
  onClick,
}: {
  record: MaintenanceRecord;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: (r: MaintenanceRecord) => void;
}) {
  const cfg = STATUS_CONFIG[record.status];
  return (
    <div
      className={`relative rounded-2xl border-2 transition-all cursor-pointer group ${cfg.border} ${cfg.bg} ${selected ? 'ring-2 ring-offset-2 ring-stone-900 dark:ring-stone-100' : 'hover:shadow-md'}`}
      onClick={() => onClick(record)}
    >
      {/* Select checkbox */}
      <button
        className="absolute top-2 right-2 z-10 w-5 h-5 rounded-md border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 flex items-center justify-center transition-colors hover:border-stone-900 dark:hover:border-stone-300"
        onClick={(e) => { e.stopPropagation(); onSelect(record.roomId); }}
        aria-label="Select room"
      >
        {selected && <span className="text-stone-900 dark:text-stone-100 text-xs font-bold">✓</span>}
      </button>

      <div className="p-4 pt-3">
        {/* Room number */}
        <div className="text-2xl font-black text-stone-900 dark:text-stone-100 mb-0.5">
          {record.roomNumber}
        </div>
        <div className="text-xs text-stone-500 dark:text-stone-400 mb-3 truncate">{record.roomName}</div>

        {/* Status */}
        <StatusBadge status={record.status} />

        {/* Updated by */}
        {record.updatedBy && (
          <div className="mt-2 text-xs text-stone-400 dark:text-stone-500 truncate">
            by {record.updatedBy}
          </div>
        )}

        {/* Time */}
        <div className="mt-1 text-xs text-stone-400 dark:text-stone-500">
          {new Date(record.updatedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

// ─── Update Modal ──────────────────────────────────────────────────────────────

function UpdateModal({
  record,
  onClose,
  onSave,
}: {
  record: MaintenanceRecord | null;
  onClose: () => void;
  onSave: (roomId: string, status: MaintenanceStatus, notes: string, updatedBy: string) => Promise<void>;
}) {
  const { t } = useLocale();
  const [status, setStatus] = useState<MaintenanceStatus>(record?.status ?? 'DIRTY');
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [updatedBy, setUpdatedBy] = useState(record?.updatedBy ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setStatus(record.status);
      setNotes(record.notes ?? '');
      setUpdatedBy(record.updatedBy ?? '');
    }
  }, [record]);

  if (!record) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(record.roomId, status, notes, updatedBy);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-stone-100 dark:border-stone-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {t('maintenance.updateStatus')}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                Room {record.roomNumber} — {record.roomName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Status selector */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              {t('common.status')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_CONFIG) as MaintenanceStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const isSelected = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      isSelected
                        ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                        : 'border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-500'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? cfg.dot : 'bg-stone-300 dark:bg-stone-600'}`} />
                    {t(`maintenance.status.${s.toLowerCase()}` as 'maintenance.status.dirty')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Updated by */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              {t('maintenance.updatedBy')}
            </label>
            <input
              type="text"
              value={updatedBy}
              onChange={(e) => setUpdatedBy(e.target.value)}
              placeholder="Staff name..."
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-300"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              {t('maintenance.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-300 resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-stone-100 dark:border-stone-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 text-sm font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Update Modal ─────────────────────────────────────────────────────────

function BulkUpdateModal({
  count,
  onClose,
  onSave,
}: {
  count: number;
  onClose: () => void;
  onSave: (status: MaintenanceStatus, notes: string, updatedBy: string) => Promise<void>;
}) {
  const { t } = useLocale();
  const [status, setStatus] = useState<MaintenanceStatus>('CLEAN');
  const [notes, setNotes] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(status, notes, updatedBy);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-stone-100 dark:border-stone-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {t('maintenance.bulkUpdate')}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                {t('maintenance.selectedRooms').replace('{count}', String(count))}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              {t('common.status')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_CONFIG) as MaintenanceStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const isSelected = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      isSelected
                        ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                        : 'border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-500'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? cfg.dot : 'bg-stone-300 dark:bg-stone-600'}`} />
                    {t(`maintenance.status.${s.toLowerCase()}` as 'maintenance.status.dirty')}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              {t('maintenance.updatedBy')}
            </label>
            <input
              type="text"
              value={updatedBy}
              onChange={(e) => setUpdatedBy(e.target.value)}
              placeholder="Staff name..."
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              {t('maintenance.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-300 resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-stone-100 dark:border-stone-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 text-sm font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const { t } = useLocale();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<MaintenanceStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editRecord, setEditRecord] = useState<MaintenanceRecord | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query { roomMaintenanceRecords { ${RECORD_FIELDS} } }`,
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setRecords(json.data.roomMaintenanceRecords);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSingleUpdate = async (
    roomId: string,
    status: MaintenanceStatus,
    notes: string,
    updatedBy: string,
  ) => {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `mutation UpdateMaintenance($roomId: ID!, $input: UpdateRoomMaintenanceInput!) {
          updateRoomMaintenance(roomId: $roomId, input: $input) { ${RECORD_FIELDS} }
        }`,
        variables: {
          roomId,
          input: { status, notes: notes || null, updatedBy: updatedBy || null },
        },
      }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    const updated: MaintenanceRecord = json.data.updateRoomMaintenance;
    setRecords((prev) => prev.map((r) => (r.roomId === updated.roomId ? updated : r)));
  };

  const handleBulkUpdate = async (
    status: MaintenanceStatus,
    notes: string,
    updatedBy: string,
  ) => {
    const roomIds = Array.from(selected);
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `mutation BulkUpdate($roomIds: [ID!]!, $input: UpdateRoomMaintenanceInput!) {
          bulkUpdateRoomMaintenance(roomIds: $roomIds, input: $input) { ${RECORD_FIELDS} }
        }`,
        variables: {
          roomIds,
          input: { status, notes: notes || null, updatedBy: updatedBy || null },
        },
      }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    const updated: MaintenanceRecord[] = json.data.bulkUpdateRoomMaintenance;
    const map = new Map(updated.map((r) => [r.roomId, r]));
    setRecords((prev) => prev.map((r) => map.get(r.roomId) ?? r));
    setSelected(new Set());
  };

  const toggleSelect = (roomId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const filteredRecords = records.filter((r) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.roomNumber.toLowerCase().includes(q) || r.roomName.toLowerCase().includes(q);
    }
    return true;
  });

  // Stats
  const stats = {
    dirty: records.filter((r) => r.status === 'DIRTY').length,
    clean: records.filter((r) => r.status === 'CLEAN').length,
    maintenance: records.filter((r) => r.status === 'MAINTENANCE').length,
    checked: records.filter((r) => r.status === 'CHECKED').length,
  };

  const allFilteredSelected = filteredRecords.length > 0 && filteredRecords.every((r) => selected.has(r.roomId));

  return (
    <div className="flex h-screen bg-stone-50 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100">
              {t('maintenance.title')}
            </h1>
            <p className="text-stone-500 dark:text-stone-400 mt-1">{t('maintenance.subtitle')}</p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {(
              [
                { key: 'dirty', status: 'DIRTY' },
                { key: 'clean', status: 'CLEAN' },
                { key: 'maintenance', status: 'MAINTENANCE' },
                { key: 'checked', status: 'CHECKED' },
              ] as const
            ).map(({ key, status }) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <button
                  key={key}
                  onClick={() => setFilterStatus(filterStatus === status ? 'ALL' : status)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    filterStatus === status
                      ? `${cfg.bg} ${cfg.border}`
                      : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                  }`}
                >
                  <div className={`text-3xl font-black ${filterStatus === status ? cfg.text : 'text-stone-900 dark:text-stone-100'}`}>
                    {stats[key]}
                  </div>
                  <div className={`text-sm font-medium mt-0.5 ${filterStatus === status ? cfg.text : 'text-stone-500 dark:text-stone-400'}`}>
                    {t(`maintenance.stats.${key}` as 'maintenance.stats.dirty')}
                  </div>
                  <div className={`mt-2 h-1.5 rounded-full ${cfg.dot} opacity-60`} style={{ width: `${records.length ? (stats[key] / records.length) * 100 : 0}%`, minWidth: '4px' }} />
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">⌕</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('common.search') + '...'}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-300"
              />
            </div>

            <button
              onClick={() => {
                if (allFilteredSelected) {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    filteredRecords.forEach((r) => next.delete(r.roomId));
                    return next;
                  });
                } else {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    filteredRecords.forEach((r) => next.add(r.roomId));
                    return next;
                  });
                }
              }}
              className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
            >
              {allFilteredSelected ? t('maintenance.deselectAll') : t('maintenance.selectAll')}
            </button>

            {selected.size > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
              >
                {t('maintenance.bulkUpdate')} ({selected.size})
              </button>
            )}

            <button
              onClick={fetchRecords}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              title={t('common.refresh')}
            >
              ↺
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-stone-900 dark:border-stone-100 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-24 text-stone-400 dark:text-stone-500">
              {records.length === 0 ? 'No rooms found. Make sure rooms are created first.' : t('common.noResults')}
            </div>
          ) : (
            /* Room grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredRecords.map((record) => (
                <RoomCard
                  key={record.roomId}
                  record={record}
                  selected={selected.has(record.roomId)}
                  onSelect={toggleSelect}
                  onClick={setEditRecord}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Single update modal */}
      {editRecord && (
        <UpdateModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSave={handleSingleUpdate}
        />
      )}

      {/* Bulk update modal */}
      {showBulkModal && (
        <BulkUpdateModal
          count={selected.size}
          onClose={() => setShowBulkModal(false)}
          onSave={handleBulkUpdate}
        />
      )}
    </div>
  );
}
