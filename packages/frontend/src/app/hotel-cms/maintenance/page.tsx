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

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; color: string; bg: string }> = {
  DIRTY:       { label: 'Dirty',       color: '#FB7185', bg: 'rgba(251,113,133,0.1)' },
  CLEAN:       { label: 'Clean',       color: '#4ADE80', bg: 'rgba(74,222,128,0.1)' },
  MAINTENANCE: { label: 'Maintenance', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
  CHECKED:     { label: 'Checked',     color: '#60B8D4', bg: 'rgba(96,184,212,0.1)' },
};

const inputStyle = { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' };
const mainStyle = { marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' };

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{ color: cfg.color, background: cfg.bg }} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.1em]">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function RoomCard({ record, selected, onSelect, onClick }: {
  record: MaintenanceRecord; selected: boolean; onSelect: (id: string) => void; onClick: (r: MaintenanceRecord) => void;
}) {
  const cfg = STATUS_CONFIG[record.status];
  return (
    <div onClick={() => onClick(record)} style={{ background: 'var(--surface)', border: `1px solid ${selected ? 'var(--gold)' : 'var(--card-border)'}`, outline: selected ? '2px solid var(--gold)' : 'none', outlineOffset: '2px' }}
      className="relative rounded-xl p-4 cursor-pointer transition-all hover:opacity-90">
      <button onClick={e => { e.stopPropagation(); onSelect(record.roomId); }}
        style={{ background: selected ? 'var(--gold)' : 'var(--surface)', border: `1px solid ${selected ? 'var(--gold)' : 'var(--card-border)'}` }}
        className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center">
        {selected && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </button>
      <div style={{ color: 'var(--text-primary)' }} className="text-[1.5rem] font-bold mb-0.5">{record.roomNumber}</div>
      <div style={{ color: 'var(--text-muted)' }} className="text-[10px] mb-3 truncate">{record.roomName}</div>
      <StatusBadge status={record.status} />
      {record.updatedBy && <div style={{ color: 'var(--text-muted)' }} className="mt-2 text-[10px] truncate">by {record.updatedBy}</div>}
      <div style={{ color: 'var(--text-muted)' }} className="mt-1 text-[10px]">
        {new Date(record.updatedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
      </div>
      {/* Color accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl" style={{ background: cfg.color }} />
    </div>
  );
}

function StatusModal({ record, count, onClose, onSave }: {
  record: MaintenanceRecord | null; count?: number;
  onClose: () => void;
  onSave: (roomId: string | null, status: MaintenanceStatus, notes: string, updatedBy: string) => Promise<void>;
}) {
  const { t } = useLocale();
  const [status, setStatus] = useState<MaintenanceStatus>(record?.status ?? 'CLEAN');
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [updatedBy, setUpdatedBy] = useState(record?.updatedBy ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) { setStatus(record.status); setNotes(record.notes ?? ''); setUpdatedBy(record.updatedBy ?? ''); }
  }, [record]);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(record?.roomId ?? null, status, notes, updatedBy); onClose(); }
    finally { setSaving(false); }
  };

  const title = record ? t('maintenance.updateStatus') : t('maintenance.bulkUpdate');
  const subtitle = record ? `Room ${record.roomNumber} — ${record.roomName}` : t('maintenance.selectedRooms').replace('{count}', String(count ?? 0));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold">{title}</h2>
            <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} className="hover:opacity-80 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p style={{ color: 'var(--text-secondary)' }} className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-2">{t('common.status')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_CONFIG) as MaintenanceStatus[]).map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button key={s} onClick={() => setStatus(s)}
                    style={status === s ? { color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}` } : { color: 'var(--text-secondary)', background: 'var(--background)', border: '1px solid var(--card-border)' }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-md text-[12px] font-semibold transition-all">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: status === s ? cfg.color : 'var(--card-border)' }} />
                    {t(`maintenance.status.${s.toLowerCase()}` as 'maintenance.status.dirty')}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{t('maintenance.updatedBy')}</label>
            <input type="text" value={updatedBy} onChange={e => setUpdatedBy(e.target.value)} placeholder="Staff name..."
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{t('maintenance.notes')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={3}
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E] resize-none" style={inputStyle} />
          </div>
        </div>

        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: '1px solid var(--card-border)' }}>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
            className="px-4 py-2 rounded-md text-[12.5px] font-medium hover:opacity-80">{t('common.cancel')}</button>
          <button onClick={handleSave} disabled={saving}
            style={{ background: 'var(--gold)', color: 'var(--background)' }}
            className="px-5 py-2 rounded-md text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50">
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ query: `{ roomMaintenanceRecords { ${RECORD_FIELDS} } }` }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setRecords(json.data.roomMaintenanceRecords);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSave = async (roomId: string | null, status: MaintenanceStatus, notes: string, updatedBy: string) => {
    if (roomId) {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          query: `mutation U($roomId:ID!,$input:UpdateRoomMaintenanceInput!){updateRoomMaintenance(roomId:$roomId,input:$input){${RECORD_FIELDS}}}`,
          variables: { roomId, input: { status, notes: notes || null, updatedBy: updatedBy || null } },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      const updated: MaintenanceRecord = json.data.updateRoomMaintenance;
      setRecords(prev => prev.map(r => r.roomId === updated.roomId ? updated : r));
    } else {
      const roomIds = Array.from(selected);
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          query: `mutation B($roomIds:[ID!]!,$input:UpdateRoomMaintenanceInput!){bulkUpdateRoomMaintenance(roomIds:$roomIds,input:$input){${RECORD_FIELDS}}}`,
          variables: { roomIds, input: { status, notes: notes || null, updatedBy: updatedBy || null } },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      const updated: MaintenanceRecord[] = json.data.bulkUpdateRoomMaintenance;
      const map = new Map(updated.map(r => [r.roomId, r]));
      setRecords(prev => prev.map(r => map.get(r.roomId) ?? r));
      setSelected(new Set());
    }
  };

  const toggleSelect = (roomId: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(roomId)) { next.delete(roomId); } else { next.add(roomId); }
    return next;
  });

  const filteredRecords = records.filter(r => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.roomNumber.toLowerCase().includes(q) || r.roomName.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = { dirty: records.filter(r => r.status === 'DIRTY').length, clean: records.filter(r => r.status === 'CLEAN').length, maintenance: records.filter(r => r.status === 'MAINTENANCE').length, checked: records.filter(r => r.status === 'CHECKED').length };

  const allFilteredSelected = filteredRecords.length > 0 && filteredRecords.every(r => selected.has(r.roomId));

  return (
    <div className="flex h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main className="flex-1 overflow-y-auto px-8 py-8" style={mainStyle}>
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <h1 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }} className="text-[2.75rem] font-bold tracking-tight mb-1">
            {t('maintenance.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mb-8">{t('maintenance.subtitle')}</p>

          {/* Stats / filter bar */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {([['dirty', 'DIRTY'], ['clean', 'CLEAN'], ['maintenance', 'MAINTENANCE'], ['checked', 'CHECKED']] as const).map(([key, status]) => {
              const cfg = STATUS_CONFIG[status];
              const isActive = filterStatus === status;
              return (
                <button key={key} onClick={() => setFilterStatus(isActive ? 'ALL' : status)}
                  style={{ background: isActive ? cfg.bg : 'var(--surface)', border: `1px solid ${isActive ? cfg.color : 'var(--card-border)'}` }}
                  className="p-4 rounded-xl text-left transition-all hover:opacity-90">
                  <div style={{ color: isActive ? cfg.color : 'var(--text-primary)',  }} className="text-[2rem] font-bold tabular-nums">{stats[key]}</div>
                  <div style={{ color: isActive ? cfg.color : 'var(--text-muted)' }} className="text-[10px] font-semibold uppercase tracking-[0.15em] mt-1">
                    {t(`maintenance.stats.${key}` as 'maintenance.stats.dirty')}
                  </div>
                  <div className="mt-2 h-1 rounded-full" style={{ background: cfg.color, opacity: 0.5, width: `${records.length ? (stats[key] / records.length) * 100 : 0}%`, minWidth: 4 }} />
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-6">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t('common.search')}...`}
              className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E] flex-1 max-w-xs"
              style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }} />

            <button onClick={() => allFilteredSelected
              ? setSelected(prev => { const next = new Set(prev); filteredRecords.forEach(r => next.delete(r.roomId)); return next; })
              : setSelected(prev => { const next = new Set(prev); filteredRecords.forEach(r => next.add(r.roomId)); return next; })}
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
              className="px-3 py-1.5 rounded-md text-[12px] font-medium hover:opacity-80">
              {allFilteredSelected ? t('maintenance.deselectAll') : t('maintenance.selectAll')}
            </button>

            {selected.size > 0 && (
              <button onClick={() => setShowBulkModal(true)}
                style={{ background: 'var(--gold)', color: 'var(--background)' }}
                className="px-4 py-1.5 rounded-md text-[12.5px] font-semibold hover:opacity-90">
                {t('maintenance.bulkUpdate')} ({selected.size})
              </button>
            )}

            <button onClick={fetchRecords}
              style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}
              className="p-2 rounded-md hover:opacity-80" title={t('common.refresh')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          {error && (
            <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }} className="px-4 py-3 rounded-md text-[13px] mb-5">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--gold)' }} />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }} className="text-center py-24 text-[13px]">
              {records.length === 0 ? 'No rooms found. Make sure rooms are created first.' : t('common.noResults')}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredRecords.map(record => (
                <RoomCard key={record.roomId} record={record} selected={selected.has(record.roomId)} onSelect={toggleSelect} onClick={setEditRecord} />
              ))}
            </div>
          )}
        </div>
      </main>

      {editRecord && (
        <StatusModal record={editRecord} onClose={() => setEditRecord(null)} onSave={handleSave} />
      )}
      {showBulkModal && (
        <StatusModal record={null} count={selected.size} onClose={() => setShowBulkModal(false)} onSave={handleSave} />
      )}
    </div>
  );
}
