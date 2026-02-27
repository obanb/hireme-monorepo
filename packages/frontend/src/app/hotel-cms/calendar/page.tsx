'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

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
  guestName: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  roomIds: string[];
}

type ViewMode = 'week' | 'month';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function CalendarPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [dragData, setDragData] = useState<{ reservationId: string; sourceRoomId: string; guestName: string } | null>(null);
  const [dropTargetRoomId, setDropTargetRoomId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [didDrag, setDidDrag] = useState(false);

  const dateRange = useMemo(() => {
    const start = viewMode === 'week' ? getStartOfWeek(currentDate) : getStartOfMonth(currentDate);
    const days = viewMode === 'week' ? 7 : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      dates.push(addDays(start, i));
    }
    return dates;
  }, [currentDate, viewMode]);

  const startDate = dateRange[0];
  const endDate = dateRange[dateRange.length - 1];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch rooms and reservations in parallel
      const [roomsResponse, reservationsResponse] = await Promise.all([
        fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `
              query ListRooms {
                rooms {
                  id
                  name
                  roomNumber
                  type
                  capacity
                  status
                  color
                }
              }
            `,
          }),
        }),
        fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `
              query ListReservations($filter: ReservationFilterInput) {
                reservations(filter: $filter) {
                  id
                  guestName
                  status
                  checkInDate
                  checkOutDate
                  roomIds
                }
              }
            `,
            variables: {
              filter: {
                checkInFrom: formatDateKey(addDays(startDate, -30)),
                checkOutTo: formatDateKey(addDays(endDate, 30)),
              },
            },
          }),
        }),
      ]);

      const [roomsResult, reservationsResult] = await Promise.all([
        roomsResponse.json(),
        reservationsResponse.json(),
      ]);

      if (roomsResult.errors) {
        throw new Error(roomsResult.errors[0]?.message ?? 'Failed to fetch rooms');
      }
      if (reservationsResult.errors) {
        throw new Error(reservationsResult.errors[0]?.message ?? 'Failed to fetch reservations');
      }

      setRooms(roomsResult.data?.rooms ?? []);
      setReservations(reservationsResult.data?.reservations ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setCurrentDate(now);
  };

  const handleCellClick = (roomId: string, date: Date) => {
    const dateStr = formatDateKey(date);
    router.push(`/hotel-cms/bookings?roomId=${roomId}&checkInDate=${dateStr}`);
  };

  const handleReservationClick = (reservationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (didDrag) {
      setDidDrag(false);
      return;
    }
    router.push(`/hotel-cms/bookings/${reservationId}`);
  };

  const handleDragStart = (e: React.DragEvent, reservation: Reservation) => {
    e.stopPropagation();
    setDragData({ reservationId: reservation.id, sourceRoomId: reservation.roomIds[0] ?? '', guestName: reservation.guestName });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    if (dragData) setDidDrag(true);
    setDragData(null);
    setDropTargetRoomId(null);
  };

  const handleDragOver = (e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetRoomId(roomId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && (e.currentTarget as Node).contains(relatedTarget)) return;
    setDropTargetRoomId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    setDropTargetRoomId(null);
    if (!dragData || dragData.sourceRoomId === targetRoomId) return;

    const { reservationId, sourceRoomId, guestName } = dragData;
    const targetRoom = rooms.find(r => r.id === targetRoomId);

    // Optimistic update
    setReservations(prev => prev.map(r =>
      r.id === reservationId ? { ...r, roomIds: [targetRoomId] } : r
    ));

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation AssignRooms($input: AssignRoomsInput!) {
              assignRooms(input: $input) {
                reservation { id roomIds }
              }
            }
          `,
          variables: { input: { reservationId, roomIds: [targetRoomId] } },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0].message);
      setSuccessMessage(`Moved "${guestName}" to ${targetRoom?.name ?? 'room'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Revert optimistic update
      setReservations(prev => prev.map(r =>
        r.id === reservationId ? { ...r, roomIds: [sourceRoomId] } : r
      ));
      setError('Failed to move reservation');
    }
  };

  // Group reservations by roomId (a reservation may span multiple rooms)
  const reservationsByRoom = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const reservation of reservations) {
      for (const roomId of reservation.roomIds) {
        const list = map.get(roomId) || [];
        list.push(reservation);
        map.set(roomId, list);
      }
    }
    return map;
  }, [reservations]);

  // Calculate reservation bar position and width
  const getReservationStyle = (reservation: Reservation) => {
    const checkIn = new Date(reservation.checkInDate);
    const checkOut = new Date(reservation.checkOutDate);

    const startIdx = dateRange.findIndex(d => formatDateKey(d) === formatDateKey(checkIn));
    const endIdx = dateRange.findIndex(d => formatDateKey(d) === formatDateKey(checkOut));

    // If reservation is completely outside the visible range, skip
    if (endIdx < 0 && checkOut < startDate) return null;
    if (startIdx < 0 && checkIn > endDate) return null;

    // Clamp to visible range
    const visibleStart = Math.max(0, startIdx >= 0 ? startIdx : 0);
    const visibleEnd = Math.min(dateRange.length - 1, endIdx >= 0 ? endIdx : dateRange.length - 1);

    const startOffset = checkIn < startDate ? 0 : startIdx;
    const totalDays = visibleEnd - visibleStart + 1;

    return {
      left: `${(startOffset / dateRange.length) * 100}%`,
      width: `${(totalDays / dateRange.length) * 100}%`,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'opacity-100';
      case 'PENDING':
        return 'opacity-70';
      case 'CANCELLED':
        return 'opacity-40 line-through';
      default:
        return 'opacity-100';
    }
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-stone-100 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-full mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-stone-900 dark:text-stone-100 mb-2">{t('calendar.title')}</h1>
              <p className="text-stone-500 dark:text-stone-400">
                {t('calendar.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex bg-white dark:bg-stone-800 rounded-2xl border-2 border-stone-200 dark:border-stone-700 p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    viewMode === 'week'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
                >
                  {t('calendar.week')}
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    viewMode === 'month'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
                >
                  {t('calendar.month')}
                </button>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-2xl text-green-700 flex items-center justify-between">
              {successMessage}
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-4 text-green-500 hover:text-green-700"
              >
                {t('common.dismiss')}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-500 hover:text-red-700"
              >
                {t('common.dismiss')}
              </button>
            </div>
          )}

          {/* Calendar Controls */}
          <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 mb-6">
            <div className="p-4 flex items-center justify-between border-b border-stone-200 dark:border-stone-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevious}
                  className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors text-stone-600 dark:text-stone-300"
                  aria-label="Previous"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleToday}
                  className="px-4 py-2 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors"
                >
                  {t('calendar.today')}
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors text-stone-600 dark:text-stone-300"
                  aria-label="Next"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">{monthYear}</h2>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors flex items-center gap-2 font-medium"
              >
                <span className={loading ? 'animate-spin' : ''}>&#x21bb;</span>
                {t('common.refresh')}
              </button>
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="p-12 text-center text-stone-500 dark:text-stone-400">
                <div className="animate-pulse">{t('calendar.loadingCalendar')}</div>
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-12 text-center text-stone-500 dark:text-stone-400">
                <div className="text-4xl mb-4">&#x25EB;</div>
                <p className="text-lg font-bold">{t('calendar.noRooms')}</p>
                <p className="text-sm mt-1">{t('calendar.createRoomsFirst')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  {/* Date Headers */}
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-stone-50 dark:bg-stone-700 border-b border-r border-stone-200 dark:border-stone-700 p-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase min-w-[180px]">
                        {t('bookings.room')}
                      </th>
                      {dateRange.map((date) => {
                        const isToday = formatDateKey(date) === formatDateKey(new Date());
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        const dayNum = date.getDate();
                        return (
                          <th
                            key={formatDateKey(date)}
                            className={`border-b border-stone-200 dark:border-stone-700 p-2 text-center min-w-[80px] ${
                              isToday ? 'bg-lime-50 dark:bg-lime-900/30' : 'bg-stone-50 dark:bg-stone-700'
                            }`}
                          >
                            <div className="text-xs text-stone-500 dark:text-stone-400">{dayName}</div>
                            <div className={`text-sm font-bold ${isToday ? 'text-lime-600' : 'text-stone-700 dark:text-stone-300'}`}>
                              {dayNum}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => {
                      const roomReservations = reservationsByRoom.get(room.id) || [];
                      return (
                        <tr
                          key={room.id}
                          className={`group ${dropTargetRoomId === room.id && dragData?.sourceRoomId !== room.id ? 'bg-blue-50' : ''}`}
                          onDragOver={(e) => handleDragOver(e, room.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, room.id)}
                        >
                          {/* Room Info */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-stone-800 border-b border-r border-stone-200 dark:border-stone-700 p-3 group-hover:bg-stone-50 dark:group-hover:bg-stone-700">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: room.color }}
                              />
                              <div>
                                <div className="font-bold text-stone-900 dark:text-stone-100">{room.name}</div>
                                <div className="text-xs text-stone-500 dark:text-stone-400">
                                  #{room.roomNumber} - {room.type}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Date Cells */}
                          {dateRange.map((date) => {
                            const isToday = formatDateKey(date) === formatDateKey(new Date());
                            return (
                              <td
                                key={formatDateKey(date)}
                                className={`border-b border-stone-200 dark:border-stone-700 p-0 relative h-16 cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors ${
                                  isToday ? 'bg-lime-50/50 dark:bg-lime-900/20' : ''
                                }`}
                                onClick={() => handleCellClick(room.id, date)}
                              >
                                {/* Render reservations that start on this date or span through it */}
                                {roomReservations
                                  .filter((res) => res.checkInDate === formatDateKey(date))
                                  .map((res) => {
                                    const style = getReservationStyle(res);
                                    if (!style) return null;

                                    const checkIn = new Date(res.checkInDate);
                                    const checkOut = new Date(res.checkOutDate);
                                    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

                                    return (
                                      <div
                                        key={res.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, res)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => handleReservationClick(res.id, e)}
                                        className={`absolute top-1 left-1 right-1 h-14 rounded-md px-2 py-1 text-white text-xs cursor-grab hover:shadow-lg transition-shadow overflow-hidden ${getStatusColor(res.status)} ${dragData?.reservationId === res.id ? 'opacity-50' : ''}`}
                                        style={{
                                          backgroundColor: room.color,
                                          width: `calc(${nights * 100}% - 8px)`,
                                          zIndex: 5,
                                        }}
                                        title={`${res.guestName} - ${res.status}`}
                                      >
                                        <div className="font-semibold truncate">{res.guestName}</div>
                                        <div className="text-xs opacity-80 truncate">
                                          {res.checkInDate} - {res.checkOutDate}
                                        </div>
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
          <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-4">
            <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-3">{t('calendar.legend')}</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-lg bg-lime-500" />
                <span className="text-sm text-stone-600 dark:text-stone-300">{t('calendar.confirmed')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-lg bg-lime-500 opacity-70" />
                <span className="text-sm text-stone-600 dark:text-stone-300">{t('calendar.pending')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-lg bg-lime-500 opacity-40" />
                <span className="text-sm text-stone-600 dark:text-stone-300">{t('calendar.cancelled')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-500" />
                <span className="text-sm text-stone-600 dark:text-stone-300">{t('calendar.clickToCreate')}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <span className="text-sm text-stone-600 dark:text-stone-300">{t('calendar.dragToMove')}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
