'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

// ── Types ───────────────────────────────────────────────────────────────────

interface Booking {
  id: string;           // unique key = `${reservationId}__${roomId}`
  reservationId: string;
  allRoomIds: string[]; // all rooms on the reservation (for reassignment)
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  roomType: string;
  roomColor: string;
  roomId: string;
}

interface RoomRow {
  id: string;
  name: string;
  roomNumber: string;
  type: string;
  color: string;
}

interface RoomTypeFilter {
  id: string;
  name: string;
  color: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  SINGLE:    '#60B8D4',
  DOUBLE:    '#4ADE80',
  SUITE:     '#C9A96E',
  DELUXE:    '#A78BFA',
  PENTHOUSE: '#FB7185',
};

function typeColor(type: string): string {
  return TYPE_COLORS[type?.toUpperCase()] ?? '#A78BFA';
}

const TIMELINE_DAYS = 14;
const DAY_W         = 54;  // px per day column
const ROW_H         = 46;  // px per room row
const LABEL_W       = 132; // px for room label column

// ── Icons ────────────────────────────────────────────────────────────────────

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function RoomCalendar() {
  const toast = useToast();

  // Data
  const [bookings, setBookings]             = useState<Booking[]>([]);
  const [allRooms, setAllRooms]             = useState<RoomRow[]>([]);
  const [roomTypeFilters, setRoomTypeFilters] = useState<RoomTypeFilter[]>([]);
  const [selectedTypes, setSelectedTypes]   = useState<string[]>([]);
  const [loading, setLoading]               = useState(true);

  // Navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode]       = useState<'week' | 'month' | 'timeline'>('week');

  // Drag state
  const [dragging, setDragging]       = useState<Booking | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const dragOffsetDay                 = useRef(0); // which day-offset within block was grabbed

  // ── Fetch reservations ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `{
            reservations {
              id
              guestName
              checkInDate
              checkOutDate
              status
              roomIds
              rooms { id name roomNumber type color }
            }
            rooms { id name roomNumber type color }
          }`,
        }),
      });
      const json = await res.json();

      if (json.data) {
        // All rooms for timeline rows
        if (json.data.rooms) setAllRooms(json.data.rooms);

        // Build bookings & type filters
        if (json.data.reservations) {
          const rawBookings: Booking[] = [];
          const typeMap = new Map<string, RoomTypeFilter>();

          for (const r of json.data.reservations) {
            const allRoomIds: string[] = r.roomIds ?? [];
            const rooms: RoomRow[] = r.rooms ?? [];

            if (rooms.length === 0) {
              // Reservation with no rooms yet — show as unknown
              const color = '#A78BFA';
              rawBookings.push({
                id: `${r.id}__none`,
                reservationId: r.id,
                allRoomIds,
                guestName: r.guestName,
                checkIn: new Date(r.checkInDate),
                checkOut: new Date(r.checkOutDate),
                status: r.status,
                roomType: 'UNKNOWN',
                roomColor: color,
                roomId: '',
              });
            } else {
              // One booking entry per room
              for (const room of rooms) {
                const color = room.color ?? typeColor(room.type);
                rawBookings.push({
                  id: `${r.id}__${room.id}`,
                  reservationId: r.id,
                  allRoomIds,
                  guestName: r.guestName,
                  checkIn: new Date(r.checkInDate),
                  checkOut: new Date(r.checkOutDate),
                  status: r.status,
                  roomType: room.type,
                  roomColor: color,
                  roomId: room.id,
                });

                if (!typeMap.has(room.type)) {
                  typeMap.set(room.type, {
                    id: room.type,
                    name: room.type.charAt(0) + room.type.slice(1).toLowerCase(),
                    color,
                  });
                }
              }
            }
          }

          const filters = Array.from(typeMap.values());
          setBookings(rawBookings);
          setRoomTypeFilters(filters);
          setSelectedTypes(filters.map((f) => f.id));
        }
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Grid/calendar helpers ────────────────────────────────────────────────

  const startOfWeek = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    return d;
  }, [currentDate]);

  // Timeline: always starts on Monday of currentDate's week
  const timelineStart = useMemo(() => {
    const d = new Date(startOfWeek);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [startOfWeek]);

  const timelineDays = useMemo(
    () => Array.from({ length: TIMELINE_DAYS }, (_, i) => {
      const d = new Date(timelineStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [timelineStart]
  );

  const daysInView = useMemo(() => {
    if (viewMode === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
      });
    }
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay  = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = firstDay.getDay();
    const adjustedStart = startDay === 0 ? 6 : startDay - 1;
    const total = Math.ceil((adjustedStart + lastDay.getDate()) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(firstDay);
      d.setDate(d.getDate() + i - adjustedStart);
      return d;
    });
  }, [currentDate, startOfWeek, viewMode]);

  const filteredBookings = useMemo(
    () => bookings.filter((b) => selectedTypes.includes(b.roomType) || b.roomType === 'UNKNOWN'),
    [bookings, selectedTypes]
  );

  const getBookingsForDate = (date: Date) =>
    filteredBookings.filter((b) => {
      const ci = new Date(b.checkIn); ci.setHours(0, 0, 0, 0);
      const co = new Date(b.checkOut); co.setHours(0, 0, 0, 0);
      const d  = new Date(date); d.setHours(0, 0, 0, 0);
      return d >= ci && d < co;
    });

  const getBookingsForRoom = (roomId: string) =>
    filteredBookings.filter((b) => b.roomId === roomId);

  const navigateDate = (dir: 'prev' | 'next') => {
    const d = new Date(currentDate);
    if (viewMode === 'week')     d.setDate(d.getDate()   + (dir === 'next' ? 7  : -7));
    else if (viewMode === 'month') d.setMonth(d.getMonth() + (dir === 'next' ? 1  : -1));
    else                         d.setDate(d.getDate()   + (dir === 'next' ? 14 : -14));
    setCurrentDate(d);
  };

  const toggleType = (id: string) =>
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const isToday = (date: Date) => {
    const t = new Date();
    return date.getDate() === t.getDate()
      && date.getMonth() === t.getMonth()
      && date.getFullYear() === t.getFullYear();
  };

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const headerLabel = viewMode === 'week'
    ? `${fmt(startOfWeek)} – ${fmt(daysInView[6])}`
    : viewMode === 'month'
    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : `${fmt(timelineStart)} – ${fmt(timelineDays[TIMELINE_DAYS - 1])}`;

  // ── Timeline block geometry ──────────────────────────────────────────────

  function getBlockStyle(booking: Booking): React.CSSProperties | null {
    const end = new Date(timelineStart);
    end.setDate(end.getDate() + TIMELINE_DAYS);

    const ci = new Date(booking.checkIn);
    const co = new Date(booking.checkOut);
    if (co <= timelineStart || ci >= end) return null;

    const clamped_ci = ci < timelineStart ? timelineStart : ci;
    const clamped_co = co > end ? end : co;

    const leftDays  = (clamped_ci.getTime() - timelineStart.getTime()) / 86400000;
    const widthDays = (clamped_co.getTime() - clamped_ci.getTime()) / 86400000;

    return {
      position: 'absolute',
      left:   leftDays  * DAY_W + 3,
      width:  widthDays * DAY_W - 6,
      top:    6,
      height: ROW_H - 12,
    };
  }

  // ── Drag handlers ────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    const rect    = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relX    = e.clientX - rect.left;
    dragOffsetDay.current = Math.floor(relX / DAY_W);
    setDragging(booking);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', booking.reservationId);
    // Dim ghost
    setTimeout(() => {
      (e.currentTarget as HTMLElement).style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDragOverRoom(null);
  };

  const handleDragOver = (e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRoom(roomId);
  };

  const handleDrop = async (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    setDragOverRoom(null);
    if (!dragging || saving) return;

    const sameRoom = dragging.roomId === targetRoomId;
    if (sameRoom) { setDragging(null); return; }

    setSaving(true);
    try {
      // Build updated roomIds: replace old roomId with targetRoomId
      const newRoomIds = dragging.allRoomIds
        .filter((id) => id !== dragging.roomId)
        .concat(targetRoomId);

      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation AssignRooms($input: AssignRoomsInput!) { assignRooms(input: $input) { reservation { id roomIds } } }`,
          variables: { input: { reservationId: dragging.reservationId, roomIds: newRoomIds } },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      toast.success(`${dragging.guestName} moved to room ${targetRoomId}.`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reassign room');
    } finally {
      setSaving(false);
      setDragging(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate('prev')} style={{ color: 'var(--text-muted)' }} className="p-1.5 rounded-md hover:opacity-70 transition-opacity">
            <ChevronIcon dir="left" />
          </button>
          <span style={{ color: 'var(--text-primary)' }} className="text-[15px] font-semibold tabular-nums min-w-[200px] text-center">
            {headerLabel}
          </span>
          <button onClick={() => navigateDate('next')} style={{ color: 'var(--text-muted)' }} className="p-1.5 rounded-md hover:opacity-70 transition-opacity">
            <ChevronIcon dir="right" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{ color: 'var(--gold)', border: '1px solid var(--gold)' }}
            className="px-3 py-1 text-[11px] font-semibold rounded-md hover:opacity-80 transition-opacity ml-1"
          >
            Today
          </button>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1" style={{ background: 'var(--surface-hover)', borderRadius: 6, padding: 2 }}>
          {(['week', 'month', 'timeline'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={
                viewMode === mode
                  ? { background: 'var(--gold)', color: 'var(--background)' }
                  : { color: 'var(--text-secondary)' }
              }
              className="px-3 py-1 text-[11px] font-semibold rounded-md transition-all capitalize"
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ── Room type filters (week/month only) ── */}
      {viewMode !== 'timeline' && roomTypeFilters.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {roomTypeFilters.map((rt) => {
            const active = selectedTypes.includes(rt.id);
            return (
              <button
                key={rt.id}
                onClick={() => toggleType(rt.id)}
                style={{
                  border:     active ? `1px solid ${rt.color}40` : '1px solid var(--card-border)',
                  background: active ? `${rt.color}12` : 'transparent',
                  opacity:    active ? 1 : 0.45,
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all"
              >
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: rt.color }} />
                <span style={{ color: 'var(--text-secondary)' }} className="text-[11px] font-medium">{rt.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TIMELINE VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'timeline' && (
        <div className="overflow-x-auto">
          <div style={{ minWidth: LABEL_W + TIMELINE_DAYS * DAY_W }}>

            {/* Date header row */}
            <div className="flex" style={{ marginLeft: LABEL_W }}>
              {timelineDays.map((d, i) => {
                const today = isToday(d);
                return (
                  <div
                    key={i}
                    style={{
                      width:       DAY_W,
                      flexShrink:  0,
                      textAlign:   'center',
                      paddingBottom: 6,
                      borderLeft:  i === 0 ? 'none' : '1px solid var(--card-border)',
                      color:       today ? 'var(--gold)' : 'var(--text-muted)',
                      fontWeight:  today ? 700 : 500,
                    }}
                  >
                    <div className="text-[9px] font-semibold tracking-[0.12em] uppercase">
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-[11px] tabular-nums">{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Today column highlight overlay + room rows */}
            {loading
              ? Array(5).fill(null).map((_, i) => (
                  <div key={i} className="flex items-center animate-pulse" style={{ height: ROW_H, borderTop: '1px solid var(--card-border)' }}>
                    <div style={{ width: LABEL_W, flexShrink: 0, paddingRight: 12 }}>
                      <div style={{ height: 10, background: 'var(--surface-hover)', borderRadius: 4, width: '70%', marginLeft: 8 }} />
                    </div>
                    <div style={{ flex: 1, height: '100%', background: 'var(--surface-hover)', opacity: 0.3 }} />
                  </div>
                ))
              : allRooms.map((room) => {
                  const roomBookings = getBookingsForRoom(room.id);
                  const isDropTarget = dragOverRoom === room.id;
                  const color = room.color ?? typeColor(room.type);

                  return (
                    <div
                      key={room.id}
                      className="flex items-stretch"
                      style={{ height: ROW_H, borderTop: '1px solid var(--card-border)', position: 'relative' }}
                      onDragOver={(e) => handleDragOver(e, room.id)}
                      onDragLeave={() => setDragOverRoom(null)}
                      onDrop={(e) => handleDrop(e, room.id)}
                    >
                      {/* Room label */}
                      <div
                        style={{
                          width:      LABEL_W,
                          flexShrink: 0,
                          display:    'flex',
                          alignItems: 'center',
                          gap:        8,
                          padding:    '0 12px',
                          borderRight: '1px solid var(--card-border)',
                          background: isDropTarget ? `${color}10` : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <div>
                          <p style={{ color: 'var(--text-primary)' }} className="text-[11px] font-semibold leading-none">
                            {room.roomNumber || room.name}
                          </p>
                          <p style={{ color: 'var(--text-muted)' }} className="text-[9px] leading-none mt-0.5 capitalize">
                            {room.type?.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      {/* Timeline cells + booking blocks */}
                      <div
                        style={{
                          flex:     1,
                          position: 'relative',
                          background: isDropTarget ? `${color}06` : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        {/* Day column lines */}
                        {timelineDays.map((d, i) => {
                          const today = isToday(d);
                          return (
                            <div
                              key={i}
                              style={{
                                position:  'absolute',
                                left:      i * DAY_W,
                                top:       0,
                                width:     DAY_W,
                                height:    '100%',
                                borderLeft: i === 0 ? 'none' : '1px solid var(--card-border)',
                                background: today ? 'rgba(201,169,110,0.05)' : 'transparent',
                                pointerEvents: 'none',
                              }}
                            />
                          );
                        })}

                        {/* Booking blocks */}
                        {roomBookings.map((booking) => {
                          const style = getBlockStyle(booking);
                          if (!style) return null;
                          const isDraggingThis = dragging?.id === booking.id;
                          return (
                            <div
                              key={booking.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, booking)}
                              onDragEnd={handleDragEnd}
                              title={`${booking.guestName} · ${fmt(booking.checkIn)} – ${fmt(booking.checkOut)}`}
                              style={{
                                ...style,
                                background:  booking.roomColor + '22',
                                border:      `1px solid ${booking.roomColor}50`,
                                borderRadius: 6,
                                cursor:      saving ? 'wait' : 'grab',
                                opacity:     isDraggingThis ? 0.4 : booking.status === 'CANCELLED' ? 0.35 : 1,
                                overflow:    'hidden',
                                display:     'flex',
                                alignItems:  'center',
                                paddingLeft:  8,
                                gap:         6,
                                userSelect:  'none',
                                transition:  'opacity 0.15s',
                              }}
                            >
                              <span
                                style={{ color: booking.roomColor, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}
                              >
                                {booking.guestName.split(' ')[0]}
                              </span>
                              {/* Drag handle icon */}
                              <svg
                                width="10" height="10" viewBox="0 0 24 24"
                                fill="none" stroke={booking.roomColor} strokeWidth="2"
                                style={{ opacity: 0.6, flexShrink: 0, marginRight: 6 }}
                              >
                                <circle cx="9" cy="5" r="1.5" fill={booking.roomColor} stroke="none"/>
                                <circle cx="15" cy="5" r="1.5" fill={booking.roomColor} stroke="none"/>
                                <circle cx="9" cy="12" r="1.5" fill={booking.roomColor} stroke="none"/>
                                <circle cx="15" cy="12" r="1.5" fill={booking.roomColor} stroke="none"/>
                                <circle cx="9" cy="19" r="1.5" fill={booking.roomColor} stroke="none"/>
                                <circle cx="15" cy="19" r="1.5" fill={booking.roomColor} stroke="none"/>
                              </svg>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

            {/* Drop hint */}
            {dragging && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round">
                  <polyline points="7 10 12 15 17 10"/>
                </svg>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  Drop on a room row to reassign <strong style={{ color: 'var(--gold)' }}>{dragging.guestName}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          WEEK / MONTH VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {viewMode !== 'timeline' && (
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {daysInView.slice(0, 7).map((date, idx) => (
                <div key={idx} className="text-center py-1.5">
                  <div style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold tracking-[0.15em] uppercase">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {loading
                ? Array(7).fill(null).map((_, idx) => (
                    <div key={idx} style={{ border: '1px solid var(--card-border)', background: 'var(--surface)', minHeight: 100 }} className="rounded-md p-1.5 animate-pulse" />
                  ))
                : daysInView.map((date, idx) => {
                    const dayBookings = getBookingsForDate(date);
                    const today       = isToday(date);
                    const inMonth     = date.getMonth() === currentDate.getMonth();

                    return (
                      <div
                        key={idx}
                        style={{
                          border:     today ? '1px solid var(--gold)' : '1px solid var(--card-border)',
                          background: today ? 'rgba(201,169,110,0.06)' : 'var(--surface)',
                          opacity:    !inMonth && viewMode === 'month' ? 0.35 : 1,
                          minHeight:  100,
                        }}
                        className="rounded-md p-1.5"
                      >
                        <div
                          style={{
                            color: today ? 'var(--gold)' : inMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontFamily: today ? 'var(--font-display)' : undefined,
                          }}
                          className={`text-[12px] font-semibold mb-1 tabular-nums ${today ? 'font-bold' : ''}`}
                        >
                          {date.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium"
                              style={{
                                background: booking.roomColor + '22',
                                color:      booking.roomColor,
                                border:     `1px solid ${booking.roomColor}40`,
                                opacity:    booking.status === 'CANCELLED' ? 0.4 : 1,
                              }}
                              title={`${booking.roomType} — ${booking.guestName} (${fmt(booking.checkIn)} – ${fmt(booking.checkOut)})`}
                            >
                              {booking.guestName.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="mt-5 pt-4 flex items-center gap-5 flex-wrap" style={{ borderTop: '1px solid var(--card-border)' }}>
        {viewMode === 'timeline' ? (
          <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">
            Drag booking blocks between room rows to reassign
          </span>
        ) : (
          <>
            <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold tracking-[0.15em] uppercase">Status</span>
            {[
              { label: 'Confirmed', color: '#4ADE80' },
              { label: 'Pending',   color: '#FBBF24' },
              { label: 'Cancelled', color: '#FB7185' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">{label}</span>
              </div>
            ))}
          </>
        )}
        {!loading && bookings.length === 0 && (
          <span style={{ color: 'var(--text-muted)' }} className="text-[11px] ml-auto">No bookings found</span>
        )}
      </div>
    </div>
  );
}
