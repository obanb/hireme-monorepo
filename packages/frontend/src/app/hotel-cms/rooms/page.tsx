'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

type RoomType = 'SINGLE' | 'DOUBLE' | 'SUITE' | 'DELUXE' | 'PENTHOUSE';
type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

interface RoomTypeEntity { id: string; code: string; name: string; isActive: boolean; }
interface RateCode { id: string; code: string; name: string; isActive: boolean; }
interface Room {
  id: string; name: string; roomNumber: string; type: RoomType; capacity: number;
  status: RoomStatus; color: string; roomTypeId?: string; rateCodeId?: string;
  roomTypeEntity?: RoomTypeEntity; rateCode?: RateCode; version: number;
  createdAt?: string; updatedAt?: string;
}
interface RoomFormData {
  name: string; roomNumber: string; type: RoomType; capacity: number;
  color: string; roomTypeId: string; rateCodeId: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'SINGLE', label: 'Single' }, { value: 'DOUBLE', label: 'Double' },
  { value: 'SUITE', label: 'Suite' }, { value: 'DELUXE', label: 'Deluxe' }, { value: 'PENTHOUSE', label: 'Penthouse' },
];

const ROOM_STATUS_COLORS: Record<RoomStatus, string> = {
  AVAILABLE: '#4ADE80',
  OCCUPIED: '#A78BFA',
  MAINTENANCE: '#FBBF24',
};

const DEFAULT_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#EF4444', '#14B8A6', '#F97316', '#84CC16'];

const emptyFormData: RoomFormData = { name: '', roomNumber: '', type: 'DOUBLE', capacity: 2, color: DEFAULT_COLORS[0], roomTypeId: '', rateCodeId: '' };

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function RefreshIcon({ spin }: { spin?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={spin ? 'animate-spin' : ''}>
      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

const inputStyle = { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' };
const inputClass = 'w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]';

export default function RoomsPage() {
  const { t } = useLocale();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypeEntities, setRoomTypeEntities] = useState<RoomTypeEntity[]>([]);
  const [rateCodes, setRateCodes] = useState<RateCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusModalRoom, setStatusModalRoom] = useState<Room | null>(null);
  const [newStatus, setNewStatus] = useState<RoomStatus>('AVAILABLE');
  const [statusReason, setStatusReason] = useState('');
  const [filterType, setFilterType] = useState<RoomType | ''>('');
  const [filterStatus, setFilterStatus] = useState<RoomStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query ListRooms($type: RoomType, $status: RoomStatus) {
            rooms(type: $type, status: $status) {
              id name roomNumber type capacity status color roomTypeId rateCodeId
              roomTypeEntity { id code name } rateCode { id code name } version createdAt updatedAt
            }
            roomTypes { id code name isActive }
            rateCodes { id code name isActive }
          }`,
          variables: { type: filterType || null, status: filterStatus || null },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to fetch rooms');
      setRooms(result.data?.rooms ?? []);
      setRoomTypeEntities(result.data?.roomTypes ?? []);
      setRateCodes(result.data?.rateCodes ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return room.name.toLowerCase().includes(query) || room.roomNumber.toLowerCase().includes(query) || room.type.toLowerCase().includes(query);
  });

  const openCreateModal = () => {
    setEditingRoom(null);
    setFormData({ ...emptyFormData, color: DEFAULT_COLORS[rooms.length % DEFAULT_COLORS.length], roomTypeId: roomTypeEntities[0]?.id ?? '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setFormData({ name: room.name, roomNumber: room.roomNumber, type: room.type, capacity: room.capacity, color: room.color, roomTypeId: room.roomTypeId ?? '', rateCodeId: room.rateCodeId ?? '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingRoom(null); setFormData(emptyFormData); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const input = { name: formData.name, roomNumber: formData.roomNumber, type: formData.type, capacity: formData.capacity, color: formData.color, roomTypeId: formData.roomTypeId || null, rateCodeId: formData.rateCodeId || null };
      if (editingRoom) {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `mutation UpdateRoom($id: ID!, $input: UpdateRoomInput!) { updateRoom(id: $id, input: $input) { room { id name roomNumber type capacity status color roomTypeId rateCodeId version } } }`, variables: { id: editingRoom.id, input } }),
        });
        const result = await response.json();
        if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to update room');
        setSuccessMessage(`Room "${formData.name}" updated successfully`);
      } else {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `mutation CreateRoom($input: CreateRoomInput!) { createRoom(input: $input) { room { id name roomNumber type capacity status color roomTypeId rateCodeId version } } }`, variables: { input } }),
        });
        const result = await response.json();
        if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to create room');
        setSuccessMessage(`Room "${formData.name}" created successfully`);
      }
      closeModal();
      fetchRooms();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusModalRoom) return;
    setSaving(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: `mutation ChangeRoomStatus($input: ChangeRoomStatusInput!) { changeRoomStatus(input: $input) { room { id status version } } }`, variables: { input: { roomId: statusModalRoom.id, status: newStatus, reason: statusReason || null } } }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message ?? 'Failed to change status');
      setSuccessMessage(`Room status changed to ${newStatus}`);
      setStatusModalRoom(null);
      setStatusReason('');
      fetchRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main className="flex-1 px-8 py-8" style={{ marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }} className="text-[2.75rem] font-bold tracking-tight mb-1">{t('rooms.title')}</h1>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">{t('rooms.subtitle')}</p>
            </div>
            <button onClick={openCreateModal} style={{ background: 'var(--gold)', color: 'var(--background)' }} className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-md hover:opacity-90 transition-opacity">
              <PlusIcon /> {t('rooms.addRoom')}
            </button>
          </div>

          {/* Success */}
          {successMessage && (
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.20)', color: '#4ADE80' }} className="px-4 py-3 rounded-md text-[13px] flex items-center justify-between mb-5">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="hover:opacity-70">✕</button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }} className="px-4 py-3 rounded-md text-[13px] flex items-center justify-between mb-5">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="hover:opacity-70">✕</button>
            </div>
          )}

          {/* Filters */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-4 mb-5">
            <div className="flex flex-wrap gap-3 items-center">
              <input type="text" placeholder={t('rooms.searchRooms')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 min-w-[200px] px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as RoomType | '')} className="px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle}>
                <option value="">{t('rooms.allTypes')}</option>
                {ROOM_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as RoomStatus | '')} className="px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle}>
                <option value="">{t('rooms.allStatuses')}</option>
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
              <button onClick={fetchRooms} disabled={loading} style={{ color: 'var(--text-secondary)' }} className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-md hover:opacity-70 transition-opacity" onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <RefreshIcon spin={loading} /> {t('common.refresh')}
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl overflow-hidden">
            {loading ? (
              <div style={{ color: 'var(--text-muted)' }} className="py-16 text-center text-[13px] animate-pulse">{t('rooms.loadingRooms')}</div>
            ) : filteredRooms.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }} className="py-16 text-center">
                <p style={{ color: 'var(--text-primary)' }} className="text-[15px] font-semibold mb-1">{t('rooms.noRooms')}</p>
                <p className="text-[12px]">{rooms.length === 0 ? t('rooms.createFirst') : t('common.tryAdjusting')}</p>
                {rooms.length === 0 && (
                  <button onClick={openCreateModal} style={{ background: 'var(--gold)', color: 'var(--background)' }} className="mt-4 px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity">
                    {t('rooms.addFirst')}
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--surface-hover)' }}>
                    {[t('bookings.room'), t('rooms.roomType'), t('rooms.rateCode'), t('rooms.capacity'), t('common.status'), t('common.actions')].map((h, i) => (
                      <th key={h} style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)', textAlign: i === 5 ? 'right' : 'left' }} className="px-5 py-3 text-[9px] font-semibold tracking-[0.2em] uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map((room, i) => (
                    <tr key={room.id} style={{ borderBottom: i < filteredRooms.length - 1 ? '1px solid var(--card-border)' : 'none' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-md flex-shrink-0" style={{ backgroundColor: room.color }} />
                          <div>
                            <div style={{ color: 'var(--text-primary)' }} className="text-[13px] font-semibold">{room.name}</div>
                            <div style={{ color: 'var(--text-muted)' }} className="text-[11px]">#{room.roomNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div style={{ color: 'var(--text-secondary)' }} className="text-[13px] font-medium">
                          {room.roomTypeEntity?.name ?? ROOM_TYPES.find(t => t.value === room.type)?.label ?? room.type}
                        </div>
                        {room.roomTypeEntity && <div style={{ color: 'var(--text-muted)' }} className="text-[11px]">{room.roomTypeEntity.code}</div>}
                      </td>
                      <td className="px-5 py-4">
                        {room.rateCode ? (
                          <div>
                            <div style={{ color: 'var(--text-secondary)' }} className="text-[13px] font-medium">{room.rateCode.name}</div>
                            <div style={{ color: 'var(--text-muted)' }} className="text-[11px]">{room.rateCode.code}</div>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span style={{ color: 'var(--text-secondary)' }} className="text-[13px]">{t('rooms.capacityGuests', { count: room.capacity })}</span>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => { setStatusModalRoom(room); setNewStatus(room.status); setStatusReason(''); }} className="hover:opacity-80 transition-opacity">
                          <span style={{ color: ROOM_STATUS_COLORS[room.status], background: ROOM_STATUS_COLORS[room.status] + '1A' }} className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md">
                            {room.status}
                          </span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => openEditModal(room)} style={{ color: 'var(--gold)' }} className="text-[12px] font-semibold hover:opacity-70 transition-opacity">
                          {t('common.edit')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && filteredRooms.length > 0 && (
            <p style={{ color: 'var(--text-muted)' }} className="mt-4 text-[11px] text-center tabular-nums">
              {filteredRooms.length} of {rooms.length} rooms
            </p>
          )}
        </div>

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)' }} className="rounded-xl w-full max-w-md mx-4 shadow-2xl">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold">
                  {editingRoom ? t('rooms.editRoom') : t('rooms.addNewRoom')}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }} className="px-3 py-2.5 rounded-md text-[12px]">{formError}</div>
                )}
                {[
                  { label: t('rooms.roomName'), key: 'name', type: 'text', placeholder: 'e.g., Ocean View Suite', required: true },
                  { label: t('rooms.roomNumber'), key: 'roomNumber', type: 'text', placeholder: 'e.g., 101', required: true },
                ].map(({ label, key, type, placeholder, required }) => (
                  <div key={key}>
                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{label}</label>
                    <input type={type} required={required} value={String(formData[key as keyof RoomFormData])} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} placeholder={placeholder} className={inputClass} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('rooms.roomTypeLegacy')}</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as RoomType })} className={inputClass} style={inputStyle}>
                    {ROOM_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                {roomTypeEntities.length > 0 && (
                  <div>
                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('rooms.roomType')}</label>
                    <select value={formData.roomTypeId} onChange={(e) => setFormData({ ...formData, roomTypeId: e.target.value })} className={inputClass} style={inputStyle}>
                      <option value="">{t('rooms.selectRoomType')}</option>
                      {roomTypeEntities.map(rt => <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>)}
                    </select>
                  </div>
                )}
                {rateCodes.length > 0 && (
                  <div>
                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('rooms.rateCode')}</label>
                    <select value={formData.rateCodeId} onChange={(e) => setFormData({ ...formData, rateCodeId: e.target.value })} className={inputClass} style={inputStyle}>
                      <option value="">{t('rooms.selectRateCode')}</option>
                      {rateCodes.map(rc => <option key={rc.id} value={rc.id}>{rc.name} ({rc.code})</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('rooms.capacity')}</label>
                  <input type="number" required min={1} max={10} value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })} className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('rooms.calendarColor')}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-10 h-9 rounded-md cursor-pointer border-0 p-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} />
                    <div className="flex gap-1.5 flex-wrap">
                      {DEFAULT_COLORS.map(color => (
                        <button key={color} type="button" onClick={() => setFormData({ ...formData, color })} className="w-5 h-5 rounded-md transition-transform hover:scale-110" style={{ backgroundColor: color, outline: formData.color === color ? `2px solid var(--gold)` : 'none', outlineOffset: '2px' }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)', flex: 1 }} className="px-4 py-2 text-[12.5px] font-medium rounded-md hover:opacity-80 transition-opacity" onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" disabled={saving} style={{ background: 'var(--gold)', color: 'var(--background)', flex: 1 }} className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
                    {saving ? t('common.saving') : editingRoom ? `${t('common.update')} ${t('bookings.room')}` : `${t('common.create')} ${t('bookings.room')}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Status Modal */}
        {statusModalRoom && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)' }} className="rounded-xl w-full max-w-sm mx-4 shadow-2xl">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold">{t('rooms.changeStatus')}</h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-[12px] mt-0.5">{statusModalRoom.name} (#{statusModalRoom.roomNumber})</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  {(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] as RoomStatus[]).map(status => (
                    <label key={status} className="flex items-center gap-3 p-3 rounded-md cursor-pointer" style={{ border: newStatus === status ? '1px solid var(--gold)' : '1px solid var(--card-border)', background: newStatus === status ? 'rgba(201,169,110,0.08)' : 'var(--surface)' }}>
                      <input type="radio" name="status" value={status} checked={newStatus === status} onChange={() => setNewStatus(status)} style={{ accentColor: 'var(--gold)' }} />
                      <span style={{ color: ROOM_STATUS_COLORS[status], background: ROOM_STATUS_COLORS[status] + '1A' }} className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md">
                        {status}
                      </span>
                    </label>
                  ))}
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('rooms.reason')}</label>
                  <input type="text" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="e.g., Plumbing repairs" className={inputClass} style={inputStyle} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStatusModalRoom(null)} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)', flex: 1 }} className="px-4 py-2 text-[12.5px] font-medium rounded-md hover:opacity-80 transition-opacity" onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    {t('common.cancel')}
                  </button>
                  <button onClick={handleStatusChange} disabled={saving || newStatus === statusModalRoom.status} style={{ background: 'var(--gold)', color: 'var(--background)', flex: 1 }} className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
                    {saving ? t('common.saving') : t('rooms.updateStatus')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
