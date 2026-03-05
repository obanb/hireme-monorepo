'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

interface Room { id: string; name: string; roomNumber: string; type: string; capacity: number; status: string; color: string; }
interface Reservation { id: string; guestName: string; status: string; checkInDate: string; checkOutDate: string; roomIds: string[]; }

type ViewMode = 'week' | 'month';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';
const mainStyle = { marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' };

function addDays(date: Date, days: number): Date { const r = new Date(date); r.setDate(r.getDate() + days); return r; }
function formatDateKey(date: Date): string { return date.toISOString().split('T')[0]; }
function getStartOfWeek(date: Date): Date { const d = new Date(date); const day = d.getDay(); d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); d.setHours(0, 0, 0, 0); return d; }
function getStartOfMonth(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), 1); }

export default function CalendarPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(() => { const now = new Date(); now.setHours(0, 0, 0, 0); return now; });
  const [dragData, setDragData] = useState<{ reservationId: string; sourceRoomId: string; guestName: string } | null>(null);
  const [dropTargetRoomId, setDropTargetRoomId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [didDrag, setDidDrag] = useState(false);

  const dateRange = useMemo(() => {
    const start = viewMode === 'week' ? getStartOfWeek(currentDate) : getStartOfMonth(currentDate);
    const days = viewMode === 'week' ? 7 : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const dates: Date[] = [];
    for (let i = 0; i < days; i++) dates.push(addDays(start, i));
    return dates;
  }, [currentDate, viewMode]);

  const startDate = dateRange[0];
  const endDate = dateRange[dateRange.length - 1];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsRes, resRes] = await Promise.all([
        fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `{ rooms { id name roomNumber type capacity status color } }` }) }),
        fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `query($filter:ReservationFilterInput){reservations(filter:$filter){id guestName status checkInDate checkOutDate roomIds}}`, variables: { filter: { checkInFrom: formatDateKey(addDays(startDate, -30)), checkOutTo: formatDateKey(addDays(endDate, 30)) } } }) }),
      ]);
      const [roomsJson, resJson] = await Promise.all([roomsRes.json(), resRes.json()]);
      if (roomsJson.errors) throw new Error(roomsJson.errors[0]?.message);
      if (resJson.errors) throw new Error(resJson.errors[0]?.message);
      setRooms(roomsJson.data?.rooms ?? []);
      setReservations(resJson.data?.reservations ?? []);
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrev = () => viewMode === 'week' ? setCurrentDate(addDays(currentDate, -7)) : setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNext = () => viewMode === 'week' ? setCurrentDate(addDays(currentDate, 7)) : setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => { const now = new Date(); now.setHours(0, 0, 0, 0); setCurrentDate(now); };

  const handleCellClick = (roomId: string, date: Date) => router.push(`/hotel-cms/bookings?roomId=${roomId}&checkInDate=${formatDateKey(date)}`);

  const handleReservationClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (didDrag) { setDidDrag(false); return; }
    router.push(`/hotel-cms/bookings/${id}`);
  };

  const handleDragStart = (e: React.DragEvent, res: Reservation) => {
    e.stopPropagation();
    setDragData({ reservationId: res.id, sourceRoomId: res.roomIds[0] ?? '', guestName: res.guestName });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => { if (dragData) setDidDrag(true); setDragData(null); setDropTargetRoomId(null); };

  const handleDrop = async (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    setDropTargetRoomId(null);
    if (!dragData || dragData.sourceRoomId === targetRoomId) return;
    const { reservationId, sourceRoomId, guestName } = dragData;
    const targetRoom = rooms.find(r => r.id === targetRoomId);
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, roomIds: [targetRoomId] } : r));
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `mutation($input:AssignRoomsInput!){assignRooms(input:$input){reservation{id roomIds}}}`, variables: { input: { reservationId, roomIds: [targetRoomId] } } }) });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setSuccessMessage(`Moved "${guestName}" to ${targetRoom?.name ?? 'room'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, roomIds: [sourceRoomId] } : r));
      setError('Failed to move reservation');
    }
  };

  const reservationsByRoom = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    reservations.forEach(res => res.roomIds.forEach(roomId => { const list = map.get(roomId) ?? []; list.push(res); map.set(roomId, list); }));
    return map;
  }, [reservations]);

  const getReservationStyle = (res: Reservation) => {
    const checkIn = new Date(res.checkInDate);
    const checkOut = new Date(res.checkOutDate);
    const startIdx = dateRange.findIndex(d => formatDateKey(d) === formatDateKey(checkIn));
    const endIdx = dateRange.findIndex(d => formatDateKey(d) === formatDateKey(checkOut));
    if (endIdx < 0 && checkOut < startDate) return null;
    if (startIdx < 0 && checkIn > endDate) return null;
    const visibleStart = Math.max(0, startIdx >= 0 ? startIdx : 0);
    const visibleEnd = Math.min(dateRange.length - 1, endIdx >= 0 ? endIdx : dateRange.length - 1);
    const startOffset = checkIn < startDate ? 0 : startIdx;
    return { left: `${(startOffset / dateRange.length) * 100}%`, width: `${((visibleEnd - visibleStart + 1) / dateRange.length) * 100}%` };
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayKey = formatDateKey(new Date());

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main className="flex-1 px-8 py-8" style={mainStyle}>
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }} className="text-[2.75rem] font-bold tracking-tight mb-1">{t('calendar.title')}</h1>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">{t('calendar.subtitle')}</p>
            </div>
            {/* View toggle */}
            <div className="flex p-1 rounded-lg gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              {(['week', 'month'] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  style={viewMode === m ? { background: 'var(--gold)', color: 'var(--background)' } : { color: 'var(--text-secondary)', background: 'transparent' }}
                  className="px-4 py-1.5 rounded-md text-[12px] font-semibold capitalize transition-all">
                  {t(`calendar.${m}` as 'calendar.week' | 'calendar.month')}
                </button>
              ))}
            </div>
          </div>

          {/* Alerts */}
          {successMessage && (
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ADE80' }} className="px-4 py-3 rounded-md text-[13px] mb-5 flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="opacity-70 hover:opacity-100">&times;</button>
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }} className="px-4 py-3 rounded-md text-[13px] mb-5 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100">&times;</button>
            </div>
          )}

          {/* Calendar card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl mb-5">
            {/* Nav bar */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div className="flex items-center gap-2">
                <button onClick={handlePrev} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                  className="p-1.5 rounded-md hover:opacity-80">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <button onClick={handleToday} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                  className="px-3 py-1.5 rounded-md text-[12px] font-medium hover:opacity-80">
                  {t('calendar.today')}
                </button>
                <button onClick={handleNext} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                  className="p-1.5 rounded-md hover:opacity-80">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
              <h2 style={{ color: 'var(--text-primary)' }} className="text-[17px] font-semibold">{monthYear}</h2>
              <button onClick={fetchData} disabled={loading} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium hover:opacity-80 disabled:opacity-50 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''}><path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {t('common.refresh')}
              </button>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="p-12 text-center"><div className="animate-spin w-8 h-8 rounded-full border-2 mx-auto" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--gold)' }} /></div>
            ) : rooms.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }} className="p-12 text-center">
                <p style={{ color: 'var(--text-primary)' }} className="text-[17px] font-semibold mb-2">{t('calendar.noRooms')}</p>
                <p className="text-[13px]">{t('calendar.createRoomsFirst')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 px-4 py-3 text-left min-w-[200px]"
                        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--card-border)', borderRight: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                        {t('bookings.room')}
                      </th>
                      {dateRange.map(date => {
                        const isToday = formatDateKey(date) === todayKey;
                        return (
                          <th key={formatDateKey(date)} className="p-2 text-center min-w-[72px]"
                            style={{ background: isToday ? 'rgba(201,169,110,0.08)' : 'var(--surface)', borderBottom: '1px solid var(--card-border)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div style={{ color: isToday ? 'var(--gold)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{date.getDate()}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(room => {
                      const roomRes = reservationsByRoom.get(room.id) ?? [];
                      return (
                        <tr key={room.id}
                          style={{ background: dropTargetRoomId === room.id && dragData?.sourceRoomId !== room.id ? 'rgba(201,169,110,0.06)' : 'transparent' }}
                          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetRoomId(room.id); }}
                          onDragLeave={e => { const rel = e.relatedTarget as Node | null; if (rel && (e.currentTarget as Node).contains(rel)) return; setDropTargetRoomId(null); }}
                          onDrop={e => handleDrop(e, room.id)}>
                          <td className="sticky left-0 z-10 px-4 py-3"
                            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--card-border)', borderRight: '1px solid var(--card-border)' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: room.color }} />
                              <div>
                                <div style={{ color: 'var(--text-primary)' }} className="text-[13px] font-semibold">{room.name}</div>
                                <div style={{ color: 'var(--text-muted)' }} className="text-[10px]">#{room.roomNumber} · {room.type}</div>
                              </div>
                            </div>
                          </td>
                          {dateRange.map(date => {
                            const isToday = formatDateKey(date) === todayKey;
                            return (
                              <td key={formatDateKey(date)} className="relative h-14 cursor-pointer" onClick={() => handleCellClick(room.id, date)}
                                style={{ background: isToday ? 'rgba(201,169,110,0.04)' : 'transparent', borderBottom: '1px solid var(--card-border)', borderRight: '1px solid rgba(255,255,255,0.03)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = isToday ? 'rgba(201,169,110,0.08)' : 'rgba(255,255,255,0.02)')}
                                onMouseLeave={e => (e.currentTarget.style.background = isToday ? 'rgba(201,169,110,0.04)' : 'transparent')}>
                                {roomRes.filter(res => res.checkInDate === formatDateKey(date)).map(res => {
                                  const style = getReservationStyle(res);
                                  if (!style) return null;
                                  const nights = Math.ceil((new Date(res.checkOutDate).getTime() - new Date(res.checkInDate).getTime()) / 86400000);
                                  const opacity = res.status === 'CANCELLED' ? 0.4 : res.status === 'PENDING' ? 0.7 : 1;
                                  return (
                                    <div key={res.id} draggable onDragStart={e => handleDragStart(e, res)} onDragEnd={handleDragEnd}
                                      onClick={e => handleReservationClick(res.id, e)}
                                      style={{ position: 'absolute', top: 4, left: 4, right: 4, height: 48, background: room.color, opacity: dragData?.reservationId === res.id ? 0.4 : opacity, width: `calc(${nights * 100}% - 8px)`, zIndex: 5, borderRadius: 6 }}
                                      className="px-2 py-1 text-white text-[11px] cursor-grab hover:shadow-lg transition-shadow overflow-hidden"
                                      title={`${res.guestName} - ${res.status}`}>
                                      <div className="font-semibold truncate">{res.guestName}</div>
                                      <div className="opacity-80 truncate text-[10px]">{res.checkInDate} — {res.checkOutDate}</div>
                                    </div>
                                  );
                                })}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-4">
            <p style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-3">{t('calendar.legend')}</p>
            <div className="flex flex-wrap gap-5">
              {[
                { label: t('calendar.confirmed'), opacity: 1 },
                { label: t('calendar.pending'), opacity: 0.7 },
                { label: t('calendar.cancelled'), opacity: 0.4 },
              ].map(({ label, opacity }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: 'var(--gold)', opacity }} />
                  <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: 'var(--text-muted)' }}>
                  <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">{t('calendar.dragToMove')}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
