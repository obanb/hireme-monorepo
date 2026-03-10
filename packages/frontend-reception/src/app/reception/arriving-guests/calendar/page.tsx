'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ArrivingGuestPerson {
  id: number;
  firstname: string;
  surname: string;
}

interface ArrivingGuest {
  id: number;
  hotelName: string;
  bookingId: number;
  tier: number;
  tierLabel: string;
  firstname: string;
  surname: string;
  guests: ArrivingGuestPerson[];
  arrival: string;
  departure: string;
  paxCountAdults: number;
  paxCountChildren: number;
  roomType: string;
  roomRateCode: string;
  roomState: string;
  provider: string;
  roomCode: string | null;
  benefits: string[];
  inventoryItems: string[];
}

// ── GQL ────────────────────────────────────────────────────────────────────────

const QUERY = `
  query CalendarGuests($filter: ArrivingGuestsFilter, $limit: Int) {
    arrivingGuests(filter: $filter, page: 1, limit: $limit) {
      total
      items {
        id hotelName bookingId tier tierLabel
        firstname surname
        guests { id firstname surname }
        arrival departure
        paxCountAdults paxCountChildren
        roomType roomRateCode roomState provider roomCode
        benefits inventoryItems
      }
    }
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TIER_COLORS: Record<number, { bar: string; text: string; border: string }> = {
  1: { bar: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  2: { bar: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
  3: { bar: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  4: { bar: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
};

// ── Tooltip ────────────────────────────────────────────────────────────────────

function GuestTooltip({ guest, visible }: { guest: ArrivingGuest; visible: boolean }) {
  const nights = daysBetween(guest.arrival, guest.departure);
  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1E293B',
      color: '#F8FAFC',
      borderRadius: 8,
      padding: '10px 14px',
      width: 220,
      zIndex: 100,
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.12s',
      boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
        {guest.firstname} {guest.surname}
        {guest.guests.length > 1 && (
          <span style={{ color: '#94A3B8', fontWeight: 400 }}> +{guest.guests.length - 1}</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.7 }}>
        <div>#{guest.bookingId} · {guest.hotelName.replace('OREA ', '')}</div>
        <div>{guest.arrival} → {guest.departure} ({nights}n)</div>
        <div>{guest.paxCountAdults}A{guest.paxCountChildren > 0 ? ` + ${guest.paxCountChildren}C` : ''} · {guest.roomType} · {guest.roomRateCode}</div>
        {guest.benefits.length > 0 && <div style={{ color: '#6EE7B7' }}>{guest.benefits.join(', ')}</div>}
        {guest.inventoryItems.length > 0 && <div style={{ color: '#7DD3FC' }}>{guest.inventoryItems.join(', ')}</div>}
      </div>
      {/* arrow */}
      <div style={{
        position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
        width: 10, height: 10, background: '#1E293B',
        clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
      }} />
    </div>
  );
}

// ── Gantt bar ──────────────────────────────────────────────────────────────────

interface GanttBarProps {
  guest: ArrivingGuest;
  days: string[];   // YYYY-MM-DD for each column
  colWidth: number;
}

function GanttBar({ guest, days, colWidth }: GanttBarProps) {
  const [hovered, setHovered] = useState(false);
  const calStart = days[0];
  const calEnd   = isoDate(addDays(new Date(days[days.length - 1]), 1)); // exclusive end

  // Clamp to calendar window
  const barStart = guest.arrival  < calStart ? calStart : guest.arrival;
  const barEnd   = guest.departure > calEnd   ? calEnd   : guest.departure;

  const startOffset = daysBetween(calStart, barStart);
  const duration    = daysBetween(barStart, barEnd);

  if (duration <= 0 || startOffset >= days.length) return null;

  const noRoom  = !guest.roomCode;
  const tier    = TIER_COLORS[guest.tier] ?? TIER_COLORS[1];
  const isIn    = guest.roomState === 'CheckedIn';

  const left    = startOffset * colWidth;
  const width   = Math.min(duration * colWidth, days.length * colWidth - left) - 4;

  return (
    <div
      style={{
        position: 'absolute',
        left,
        width,
        top: 6,
        bottom: 6,
        borderRadius: 6,
        background: noRoom
          ? 'repeating-linear-gradient(45deg, rgba(245,158,11,0.18), rgba(245,158,11,0.18) 4px, rgba(245,158,11,0.08) 4px, rgba(245,158,11,0.08) 8px)'
          : tier.bar,
        border: `1.5px ${noRoom ? 'dashed' : 'solid'} ${noRoom ? 'rgba(245,158,11,0.6)' : tier.border}`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 8,
        gap: 6,
        overflow: 'hidden',
        cursor: 'default',
        transition: 'filter 0.1s, box-shadow 0.1s',
        filter: hovered ? 'brightness(0.93)' : 'none',
        boxShadow: hovered ? '0 2px 10px rgba(0,0,0,0.12)' : 'none',
        zIndex: hovered ? 10 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Room badge */}
      {guest.roomCode ? (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600,
          color: tier.text,
          background: 'rgba(0,0,0,0.08)',
          borderRadius: 3, padding: '1px 5px',
          flexShrink: 0,
        }}>
          {guest.roomCode}
        </span>
      ) : (
        <span style={{
          fontSize: 10, color: 'var(--status-yellow)',
          display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          No room
        </span>
      )}

      {/* Name — only if bar is wide enough */}
      {width > 100 && (
        <span style={{
          fontSize: 11, fontWeight: 500,
          color: noRoom ? 'var(--status-yellow)' : tier.text,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {guest.firstname} {guest.surname}
        </span>
      )}

      {/* Checked-in dot */}
      {isIn && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--status-green)', flexShrink: 0, marginLeft: 'auto', marginRight: 6,
        }} title="Checked in" />
      )}

      {/* Tooltip */}
      <GuestTooltip guest={guest} visible={hovered} />
    </div>
  );
}

// ── Hotel group ────────────────────────────────────────────────────────────────

interface HotelGroupProps {
  hotel: string;
  guests: ArrivingGuest[];
  days: string[];
  colWidth: number;
  todayIso: string;
}

function HotelGroup({ hotel, guests, days, colWidth, todayIso }: HotelGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const shortName = hotel.replace(/^OREA\s+/i, '');

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Hotel header row */}
      <div
        style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        {/* Label column */}
        <div style={{
          width: 200, flexShrink: 0,
          padding: '5px 12px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="var(--fg-subtle)" strokeWidth="2.5"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {shortName}
          </span>
          <span style={{
            fontSize: 10, color: 'var(--fg-subtle)',
            background: 'var(--bg-surface)', borderRadius: 10,
            padding: '0 5px', flexShrink: 0,
          }}>
            {guests.length}
          </span>
        </div>
        {/* Day cells (decorative) */}
        <div style={{ flex: 1, display: 'flex' }}>
          {days.map(d => (
            <div key={d} style={{
              width: colWidth, flexShrink: 0,
              borderLeft: '1px solid var(--border)',
              height: 28,
              background: d === todayIso ? 'rgba(14,165,233,0.06)' : 'transparent',
            }} />
          ))}
        </div>
      </div>

      {/* Guest rows */}
      {!collapsed && guests.map(guest => (
        <div key={guest.id} style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Name label */}
          <div style={{
            width: 200, flexShrink: 0,
            padding: '0 12px',
            display: 'flex', alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            minHeight: 44,
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: 12, fontWeight: 500, color: 'var(--fg)',
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                {guest.firstname} {guest.surname}
                {guest.guests.length > 1 && (
                  <span style={{ color: 'var(--fg-subtle)', fontSize: 10, fontWeight: 400 }}>
                    {' '}+{guest.guests.length - 1}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--fg-subtle)',
                fontFamily: 'var(--font-mono)',
              }}>
                #{guest.bookingId}
              </div>
            </div>
          </div>

          {/* Gantt track */}
          <div style={{ flex: 1, display: 'flex', position: 'relative', borderBottom: '1px solid var(--border)' }}>
            {/* Day column backgrounds */}
            {days.map(d => (
              <div key={d} style={{
                width: colWidth, flexShrink: 0,
                borderLeft: '1px solid var(--border)',
                background: d === todayIso ? 'rgba(14,165,233,0.04)' : 'transparent',
              }} />
            ))}
            {/* Today vertical line */}
            {days.includes(todayIso) && (
              <div style={{
                position: 'absolute',
                left: days.indexOf(todayIso) * colWidth + Math.floor(colWidth / 2),
                top: 0, bottom: 0, width: 2,
                background: 'rgba(14,165,233,0.35)',
                pointerEvents: 'none',
                zIndex: 4,
              }} />
            )}
            {/* The actual bar */}
            <GanttBar guest={guest} days={days} colWidth={colWidth} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [guests, setGuests] = useState<ArrivingGuest[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [offsetDays, setOffsetDays] = useState(0); // shift the 7-day window

  // Build 7-day window
  const windowStart = addDays(new Date(), offsetDays);
  windowStart.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => isoDate(addDays(windowStart, i)));
  const todayIso = isoDate(new Date());

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          filter: { period: 'days7' },
          limit: 200,
        },
      }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.errors?.length) throw new Error(json.errors[0].message);
        setGuests(json.data.arrivingGuests.items);
        setTotal(json.data.arrivingGuests.total);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Group by hotel, only show guests whose stay overlaps the current 7-day window
  const windowEnd = isoDate(addDays(windowStart, 7));
  const visible = guests.filter(g => g.arrival < windowEnd && g.departure > days[0]);

  const hotelMap = new Map<string, ArrivingGuest[]>();
  for (const g of visible) {
    const arr = hotelMap.get(g.hotelName) ?? [];
    arr.push(g);
    hotelMap.set(g.hotelName, arr);
  }
  const hotels = [...hotelMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // Stats
  const noRoomCount = visible.filter(g => !g.roomCode).length;
  const checkedInCount = visible.filter(g => g.roomState === 'CheckedIn').length;

  // Dynamic column width
  const COL_WIDTH = 130;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-strong)',
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/reception/arriving-guests" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--fg-muted)', textDecoration: 'none',
            fontSize: 13, padding: '5px 10px',
            border: '1px solid var(--border-strong)',
            borderRadius: 7,
            background: 'var(--bg-surface)',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            List
          </Link>

          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20, fontWeight: 600,
              color: 'var(--fg)', margin: 0,
              letterSpacing: '-0.02em',
            }}>
              7-Day Arrival Calendar
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{
              background: 'var(--accent-light)', color: 'var(--accent)',
              borderRadius: 6, padding: '3px 10px', fontWeight: 600,
            }}>
              {visible.length} arrivals
            </span>
            {noRoomCount > 0 && (
              <span style={{
                background: 'var(--status-yellow-bg)', color: 'var(--status-yellow)',
                borderRadius: 6, padding: '3px 10px', fontWeight: 600,
                border: '1px dashed var(--status-yellow-border)',
              }}>
                ⚠ {noRoomCount} no room
              </span>
            )}
            {checkedInCount > 0 && (
              <span style={{
                background: 'var(--status-green-bg)', color: 'var(--status-green)',
                borderRadius: 6, padding: '3px 10px', fontWeight: 600,
              }}>
                ● {checkedInCount} checked in
              </span>
            )}
          </div>

          {/* Window navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setOffsetDays(o => Math.max(o - 7, -7))}
              disabled={offsetDays <= -7}
              title={offsetDays <= -7 ? 'No historical data available' : 'Previous 7 days'}
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-surface)',
                cursor: offsetDays <= -7 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: offsetDays <= -7 ? 0.4 : 1,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <button
              onClick={() => setOffsetDays(0)}
              disabled={offsetDays === 0}
              style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                border: '1px solid var(--border-strong)',
                background: offsetDays === 0 ? 'var(--accent)' : 'var(--bg-surface)',
                color: offsetDays === 0 ? '#fff' : 'var(--fg-muted)',
                cursor: offsetDays === 0 ? 'default' : 'pointer',
              }}
            >
              Today
            </button>
            <button
              onClick={() => setOffsetDays(o => Math.min(o + 7, 7))}
              disabled={offsetDays >= 7}
              title={offsetDays >= 7 ? 'No data beyond next 7 days' : 'Next 7 days'}
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-surface)',
                cursor: offsetDays >= 7 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: offsetDays >= 7 ? 0.4 : 1,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{
        padding: '8px 24px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
        fontSize: 11, color: 'var(--fg-muted)',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--fg-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 10 }}>Legend</span>
        {[
          { label: 'Newcomer',  bg: '#F1F5F9', border: '#CBD5E1', text: '#64748B', dashed: false },
          { label: 'Silver',    bg: '#EFF6FF', border: '#BFDBFE', text: '#3B82F6', dashed: false },
          { label: 'Gold',      bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dashed: false },
          { label: 'Platinum',  bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED', dashed: false },
          { label: 'No room',   bg: 'repeating-linear-gradient(45deg, rgba(245,158,11,0.18), rgba(245,158,11,0.18) 4px, rgba(245,158,11,0.08) 4px, rgba(245,158,11,0.08) 8px)', border: 'rgba(245,158,11,0.6)', text: 'var(--status-yellow)', dashed: true },
        ].map(({ label, bg, border, text, dashed }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 28, height: 14, borderRadius: 4,
              background: bg,
              border: `1.5px ${dashed ? 'dashed' : 'solid'} ${border}`,
              flexShrink: 0,
            }} />
            <span style={{ color: text }}>{label}</span>
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-green)', flexShrink: 0 }} />
          Checked in
        </span>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          margin: '16px 24px', padding: '10px 14px',
          background: 'var(--status-red-bg)',
          border: '1px solid var(--status-red-border)',
          borderRadius: 8, color: 'var(--status-red)', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── Calendar grid ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 24 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, animationDelay: `${i * 0.04}s` }} />
            ))}
          </div>
        ) : (
          <div style={{ minWidth: 200 + COL_WIDTH * 7 }}>

            {/* ── Date header ── */}
            <div style={{
              display: 'flex',
              position: 'sticky', top: 0, zIndex: 20,
              background: 'var(--bg)',
              borderBottom: '2px solid var(--border-strong)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {/* Corner */}
              <div style={{
                width: 200, flexShrink: 0,
                padding: '10px 12px',
                fontSize: 10.5, fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
                borderRight: '1px solid var(--border-strong)',
              }}>
                Guest
              </div>
              {/* Day headers */}
              {days.map(d => {
                const date  = new Date(d + 'T12:00:00');
                const isToday = d === todayIso;
                return (
                  <div
                    key={d}
                    style={{
                      width: COL_WIDTH, flexShrink: 0,
                      padding: '10px 8px',
                      textAlign: 'center',
                      borderLeft: '1px solid var(--border)',
                      background: isToday ? 'var(--accent-light)' : 'transparent',
                      position: 'relative',
                    }}
                  >
                    {isToday && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                        background: 'var(--accent)',
                      }} />
                    )}
                    <div style={{
                      fontSize: 11, fontWeight: isToday ? 700 : 600,
                      color: isToday ? 'var(--accent)' : 'var(--fg-subtle)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      {DAY_NAMES[date.getDay()]}
                    </div>
                    <div style={{
                      fontSize: isToday ? 20 : 17,
                      fontWeight: isToday ? 700 : 400,
                      fontFamily: 'var(--font-display)',
                      color: isToday ? 'var(--accent)' : 'var(--fg)',
                      lineHeight: 1.1,
                      marginTop: 2,
                    }}>
                      {date.getDate()}
                    </div>
                    <div style={{
                      fontSize: 10, color: 'var(--fg-subtle)',
                      marginTop: 1,
                    }}>
                      {MONTH_NAMES[date.getMonth()]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Hotel groups ── */}
            {hotels.length === 0 && (
              <div style={{
                padding: '60px 24px', textAlign: 'center',
                color: 'var(--fg-subtle)', fontSize: 14,
              }}>
                No arrivals in this window
              </div>
            )}
            {hotels.map(([hotel, hotelGuests]) => (
              <HotelGroup
                key={hotel}
                hotel={hotel}
                guests={hotelGuests}
                days={days}
                colWidth={COL_WIDTH}
                todayIso={todayIso}
              />
            ))}

          </div>
        )}
      </div>
    </div>
  );
}
