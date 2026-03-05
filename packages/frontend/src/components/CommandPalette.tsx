'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandPalette } from '@/context/CommandPaletteContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

// ── Types ─────────────────────────────────────────────────────────────────

type ResultType = 'booking' | 'guest' | 'room';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  accent: string;
  badge?: string;
  badgeColor?: string;
}

interface RawBooking {
  id: string;
  guestName: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  rooms: { roomNumber: string; name: string }[];
}

interface RawGuest {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface RawRoom {
  id: string;
  name: string;
  roomNumber: string;
  type: string;
  status: string;
  color: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────

const ICONS: Record<ResultType, string> = {
  booking: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  guest:   'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z',
  room:    'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm6 11V10h6v10H9z',
};

const ACCENTS: Record<ResultType, string> = {
  booking: '#60B8D4',
  guest:   '#A78BFA',
  room:    '#4ADE80',
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#4ADE80',
  PENDING:   '#FBBF24',
  CANCELLED: '#FB7185',
  AVAILABLE: '#4ADE80',
  OCCUPIED:  '#FB7185',
  DIRTY:     '#FBBF24',
};

const MAX_PER_TYPE = 5;

function Icon({ d, color }: { d: string; color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const router = useRouter();

  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [fetched, setFetched]       = useState(false);
  const [bookings, setBookings]     = useState<RawBooking[]>([]);
  const [guests, setGuests]         = useState<RawGuest[]>([]);
  const [rooms, setRooms]           = useState<RawRoom[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  // ── Fetch all data once when first opened ──────────────────────────────

  const fetchAll = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `{
            reservations {
              id guestName status checkInDate checkOutDate
              rooms { roomNumber name }
            }
            guests { id firstName lastName email }
            rooms { id name roomNumber type status color }
          }`,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setBookings(json.data.reservations ?? []);
        setGuests(json.data.guests ?? []);
        setRooms(json.data.rooms ?? []);
        setFetched(true);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [fetched]);

  useEffect(() => {
    if (isOpen) {
      fetchAll();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIdx(0);
    }
  }, [isOpen, fetchAll]);

  // ── Search / filter ────────────────────────────────────────────────────

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    const out: SearchResult[] = [];

    if (!q) {
      // Show recent bookings when empty
      bookings.slice(0, MAX_PER_TYPE).forEach((b) => {
        const rooms = b.rooms.map((r) => r.roomNumber || r.name).join(', ');
        out.push({
          type: 'booking', id: b.id,
          title: b.guestName,
          subtitle: `${new Date(b.checkInDate).toLocaleDateString('en-GB')} → ${new Date(b.checkOutDate).toLocaleDateString('en-GB')}${rooms ? '  ·  ' + rooms : ''}`,
          href: `/hotel-cms/bookings/${b.id}`,
          accent: ACCENTS.booking,
          badge: b.status, badgeColor: STATUS_COLORS[b.status],
        });
      });
      return out;
    }

    // Bookings
    bookings
      .filter((b) => b.guestName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q))
      .slice(0, MAX_PER_TYPE)
      .forEach((b) => {
        const roomStr = b.rooms.map((r) => r.roomNumber || r.name).join(', ');
        out.push({
          type: 'booking', id: b.id,
          title: b.guestName,
          subtitle: `${new Date(b.checkInDate).toLocaleDateString('en-GB')} → ${new Date(b.checkOutDate).toLocaleDateString('en-GB')}${roomStr ? '  ·  ' + roomStr : ''}`,
          href: `/hotel-cms/bookings/${b.id}`,
          accent: ACCENTS.booking,
          badge: b.status, badgeColor: STATUS_COLORS[b.status],
        });
      });

    // Guests
    guests
      .filter((g) => {
        const full = `${g.firstName} ${g.lastName}`.toLowerCase();
        return full.includes(q) || (g.email ?? '').toLowerCase().includes(q);
      })
      .slice(0, MAX_PER_TYPE)
      .forEach((g) => {
        out.push({
          type: 'guest', id: g.id,
          title: `${g.firstName} ${g.lastName}`,
          subtitle: g.email ?? 'No email',
          href: `/hotel-cms/guests`,
          accent: ACCENTS.guest,
        });
      });

    // Rooms
    rooms
      .filter((r) => {
        return (r.roomNumber ?? '').toLowerCase().includes(q)
          || (r.name ?? '').toLowerCase().includes(q)
          || (r.type ?? '').toLowerCase().includes(q);
      })
      .slice(0, MAX_PER_TYPE)
      .forEach((r) => {
        out.push({
          type: 'room', id: r.id,
          title: r.roomNumber ? `Room ${r.roomNumber}` : r.name,
          subtitle: r.type?.charAt(0) + r.type?.slice(1).toLowerCase(),
          href: `/hotel-cms/rooms`,
          accent: r.color ?? ACCENTS.room,
          badge: r.status, badgeColor: STATUS_COLORS[r.status],
        });
      });

    return out;
  }, [query, bookings, guests, rooms]);

  // ── Keyboard navigation ────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIdx]) {
        e.preventDefault();
        navigate(results[selectedIdx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, results, selectedIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  // Reset selection when results change
  useEffect(() => { setSelectedIdx(0); }, [results]);

  // ── Navigation ─────────────────────────────────────────────────────────

  function navigate(result: SearchResult) {
    close();
    router.push(result.href);
  }

  // ── Group results for rendering ────────────────────────────────────────

  const groups = useMemo(() => {
    const map = new Map<ResultType, SearchResult[]>();
    for (const r of results) {
      const arr = map.get(r.type) ?? [];
      arr.push(r);
      map.set(r.type, arr);
    }
    return map;
  }, [results]);

  const GROUP_LABELS: Record<ResultType, string> = {
    booking: 'Bookings',
    guest:   'Guests',
    room:    'Rooms',
  };

  if (!isOpen) return null;

  let globalIdx = 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '10vh 16px 0',
      }}
      onClick={close}
    >
      <div
        style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 14,
          width: '100%', maxWidth: 580,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          animation: 'cmd-in 0.15s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid var(--card-border)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookings, guests, rooms…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 15, caretColor: 'var(--gold)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          )}
          <kbd style={{
            background: 'var(--surface-hover)', color: 'var(--text-muted)',
            border: '1px solid var(--card-border)', borderRadius: 5,
            padding: '2px 7px', fontSize: 11, fontFamily: 'monospace', flexShrink: 0,
          }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 420, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading…
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {query ? `No results for "${query}"` : 'Start typing to search'}
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              {!query && (
                <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Recent Bookings
                </div>
              )}
              {Array.from(groups.entries()).map(([type, items]) => (
                <div key={type}>
                  {query && (
                    <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      {GROUP_LABELS[type]}
                    </div>
                  )}
                  {items.map((result) => {
                    const idx = globalIdx++;
                    const isSelected = idx === selectedIdx;
                    return (
                      <div
                        key={result.id + result.type}
                        data-idx={idx}
                        onClick={() => navigate(result)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '9px 16px',
                          background: isSelected ? 'var(--surface-hover)' : 'transparent',
                          cursor: 'pointer',
                          borderLeft: isSelected ? `2px solid ${result.accent}` : '2px solid transparent',
                          transition: 'background 0.08s',
                        }}
                      >
                        {/* Type icon */}
                        <div
                          style={{
                            width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: result.accent + '18',
                          }}
                        >
                          <Icon d={ICONS[result.type]} color={result.accent} />
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {result.title}
                            </span>
                            {result.badge && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                                padding: '2px 6px', borderRadius: 4,
                                color: result.badgeColor, background: (result.badgeColor ?? '#fff') + '1A',
                                flexShrink: 0,
                              }}>
                                {result.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {result.subtitle}
                          </div>
                        </div>

                        {/* Arrow */}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isSelected ? result.accent : 'var(--text-muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: isSelected ? 1 : 0.4 }}>
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '8px 16px',
          borderTop: '1px solid var(--card-border)',
        }}>
          {[
            { keys: ['↑', '↓'], label: 'navigate' },
            { keys: ['↵'],       label: 'open' },
            { keys: ['Esc'],     label: 'close' },
          ].map(({ keys, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {keys.map((k) => (
                <kbd key={k} style={{
                  background: 'var(--surface-hover)', color: 'var(--text-muted)',
                  border: '1px solid var(--card-border)', borderRadius: 4,
                  padding: '1px 6px', fontSize: 10, fontFamily: 'monospace',
                }}>
                  {k}
                </kbd>
              ))}
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{label}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11 }}>
            {results.length > 0 && `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
    </div>
  );
}
