'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
/* ─── hourly distribution models ──────────────────────────────────────────── */
// Values represent relative weight per hour (0–23). Peaks based on hotel industry norms.
const ARRIVAL_DIST = [
  0, 0, 0, 0, 0, 0, 0,    // 00–06  almost no arrivals
  0.2, 0.5, 0.8, 1.0,      // 07–10  early risers
  1.2, 1.5, 2.0,            // 11–13  pre-check-in surge
  4.5, 5.0, 4.8, 4.2,      // 14–17  PEAK check-in window
  3.0, 2.5, 2.0, 1.5,      // 18–21  evening arrivals
  0.8, 0.3,                 // 22–23  late arrivals
];

const DEPARTURE_DIST = [
  0, 0, 0, 0, 0, 0, 0.3,  // 00–06
  1.5, 2.5, 3.5,            // 07–09  early departures
  5.0, 5.0, 4.5,            // 10–12  PEAK checkout
  3.0, 2.0, 1.5,            // 13–15  post-checkout trickle
  1.0, 0.8, 0.6,            // 16–18
  0.4, 0.3, 0.2, 0.1,      // 19–22
  0, 0,                     // 23
];

function distributeToHours(total: number, dist: number[]): number[] {
  const sum = dist.reduce((a, b) => a + b, 0);
  if (sum === 0 || total === 0) return new Array(24).fill(0);
  const raw = dist.map(w => (w / sum) * total);
  // Round while preserving total
  const floored = raw.map(Math.floor);
  const remainder = total - floored.reduce((a, b) => a + b, 0);
  const diffs = raw.map((v, i) => ({ i, d: v - floored[i] })).sort((a, b) => b.d - a.d);
  for (let k = 0; k < remainder; k++) floored[diffs[k].i]++;
  return floored;
}

/* ─── types ──────────────────────────────────────────────────────────────── */
interface ForecastGuest {
  id: string;
  guestName: string | null;
  guestEmail: string | null;
  roomIds: string[];
  status: string;
}

interface DayForecast {
  date: string;
  checkIns: number;
  checkOuts: number;
  inHouseGuests: number;
  arrivals: ForecastGuest[];
  departures: ForecastGuest[];
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function formatDayLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const GQL_QUERY = `
  query ReceptionForecast($days: Int) {
    receptionForecast(days: $days) {
      date
      checkIns
      checkOuts
      inHouseGuests
      arrivals { id guestName guestEmail roomIds status }
      departures { id guestName guestEmail roomIds status }
    }
  }
`;

async function fetchForecast(days: number): Promise<DayForecast[]> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query: GQL_QUERY, variables: { days } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data.receptionForecast;
}

/* ─── HourBar ─────────────────────────────────────────────────────────────── */
function HourBars({ arrivals, departures }: { arrivals: number[]; departures: number[] }) {
  const max = Math.max(...arrivals, ...departures, 1);
  const now = new Date().getHours();

  return (
    <div className="mt-4">
      <div className="flex items-end gap-px" style={{ height: 64 }}>
        {arrivals.map((a, h) => {
          const d = departures[h];
          const ah = Math.round((a / max) * 56);
          const dh = Math.round((d / max) * 56);
          const isPast = h < now;
          const isCurrent = h === now;
          return (
            <div key={h} className="relative flex-1 flex flex-col items-center gap-px group" style={{ height: 64 }}>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap shadow-lg">
                  {String(h).padStart(2, '0')}:00 · +{a} −{d}
                </div>
              </div>
              <div className="w-full flex flex-col justify-end" style={{ height: 64 }}>
                {/* Arrivals bar */}
                {ah > 0 && (
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: ah,
                      background: isPast
                        ? 'rgba(16,185,129,0.2)'
                        : isCurrent
                        ? 'rgba(16,185,129,1)'
                        : 'rgba(16,185,129,0.7)',
                      boxShadow: isCurrent ? '0 0 8px rgba(16,185,129,0.8)' : undefined,
                    }}
                  />
                )}
                {/* Departures bar */}
                {dh > 0 && (
                  <div
                    className="w-full rounded-b-sm transition-all"
                    style={{
                      height: dh,
                      background: isPast
                        ? 'rgba(251,191,36,0.2)'
                        : isCurrent
                        ? 'rgba(251,191,36,1)'
                        : 'rgba(251,191,36,0.7)',
                      boxShadow: isCurrent ? '0 0 8px rgba(251,191,36,0.8)' : undefined,
                    }}
                  />
                )}
                {/* Empty placeholder */}
                {ah === 0 && dh === 0 && (
                  <div className="w-full" style={{ height: 2, background: 'rgba(255,255,255,0.04)' }} />
                )}
              </div>
              {/* Hour label at quarters */}
              {(h % 6 === 0) && (
                <div className="absolute -bottom-5 text-[9px] text-gray-500 font-mono">
                  {String(h).padStart(2, '0')}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Hour axis labels */}
      <div className="h-5" />
    </div>
  );
}

/* ─── GuestList ───────────────────────────────────────────────────────────── */
function GuestList({ guests, type }: { guests: ForecastGuest[]; type: 'arrival' | 'departure' }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? guests : guests.slice(0, 4);
  const color = type === 'arrival' ? 'text-emerald-400' : 'text-amber-400';
  const dot = type === 'arrival' ? 'bg-emerald-400' : 'bg-amber-400';

  if (guests.length === 0) {
    return <p className="text-xs text-gray-600 italic mt-1">None scheduled</p>;
  }

  return (
    <div className="space-y-1 mt-1">
      {shown.map(g => (
        <Link
          key={g.id}
          href={`/hotel-cms/bookings/${g.id}`}
          className="flex items-center gap-2 group/row rounded px-1.5 py-1 hover:bg-white/5 transition-colors"
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
          <span className="text-xs text-gray-200 group-hover/row:text-white transition-colors flex-1 truncate">
            {g.guestName ?? g.guestEmail ?? 'Unknown guest'}
          </span>
          {g.roomIds.length > 0 && (
            <span className={`text-[10px] font-mono ${color} opacity-70`}>
              {g.roomIds.length} rm
            </span>
          )}
        </Link>
      ))}
      {guests.length > 4 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors pl-4"
        >
          {expanded ? 'Show less' : `+${guests.length - 4} more`}
        </button>
      )}
    </div>
  );
}

/* ─── PeakBadge ───────────────────────────────────────────────────────────── */
function PeakBadge({ hours, label, color }: { hours: number[]; label: string; color: string }) {
  const maxVal = Math.max(...hours);
  if (maxVal === 0) return null;
  const peakHour = hours.indexOf(maxVal);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${color}`}>
      <span className="opacity-60">{label} peak</span>
      <span className="font-bold">{String(peakHour).padStart(2, '0')}:00</span>
    </span>
  );
}

/* ─── DayCard ─────────────────────────────────────────────────────────────── */
function DayCard({ day, isFirst }: { day: DayForecast; isFirst: boolean }) {
  const [tab, setTab] = useState<'arrivals' | 'departures'>('arrivals');
  const arrHours = distributeToHours(day.checkIns, ARRIVAL_DIST);
  const depHours = distributeToHours(day.checkOuts, DEPARTURE_DIST);

  const intensity = day.checkIns + day.checkOuts;
  const intensityLabel = intensity === 0 ? 'Quiet' : intensity < 5 ? 'Moderate' : intensity < 10 ? 'Busy' : 'Peak';
  const intensityColor = intensity === 0
    ? 'text-gray-600'
    : intensity < 5
    ? 'text-blue-400'
    : intensity < 10
    ? 'text-amber-400'
    : 'text-red-400';

  return (
    <div
      className="rounded-xl border flex flex-col gap-0 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderColor: isFirst ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)',
        boxShadow: isFirst ? '0 0 20px rgba(16,185,129,0.06)' : undefined,
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {isFirst && (
                <span className="text-[9px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-400/10 rounded px-1.5 py-0.5">
                  Today
                </span>
              )}
              <span className={`text-[10px] font-medium uppercase tracking-widest ${intensityColor}`}>
                {intensityLabel}
              </span>
            </div>
            <h3 className="text-base font-semibold text-white mt-1 font-mono">
              {formatDayLabel(day.date)}
            </h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-white">{day.inHouseGuests}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">in-house</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-mono text-emerald-300 font-bold">{day.checkIns}</span>
            <span className="text-[10px] text-gray-500">arriving</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-sm font-mono text-amber-300 font-bold">{day.checkOuts}</span>
            <span className="text-[10px] text-gray-500">departing</span>
          </div>
        </div>

        {/* Peak time badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <PeakBadge hours={arrHours} label="arrival" color="bg-emerald-400/10 text-emerald-400" />
          <PeakBadge hours={depHours} label="departure" color="bg-amber-400/10 text-amber-400" />
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[9px] uppercase tracking-widest text-gray-600 font-medium">Hourly forecast</span>
          <div className="flex gap-2">
            <span className="flex items-center gap-1 text-[9px] text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500 inline-block" /> arrivals
            </span>
            <span className="flex items-center gap-1 text-[9px] text-amber-500">
              <span className="w-1.5 h-1.5 rounded-sm bg-amber-500 inline-block" /> departures
            </span>
          </div>
        </div>
        <HourBars arrivals={arrHours} departures={depHours} />
      </div>

      {/* Guest list tabs */}
      <div className="flex-1 flex flex-col">
        <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {(['arrivals', 'departures'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                tab === t
                  ? t === 'arrivals'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {t === 'arrivals' ? `Arriving (${day.arrivals.length})` : `Departing (${day.departures.length})`}
            </button>
          ))}
        </div>
        <div className="px-3 py-2 min-h-[100px]">
          {tab === 'arrivals'
            ? <GuestList guests={day.arrivals} type="arrival" />
            : <GuestList guests={day.departures} type="departure" />
          }
        </div>
      </div>
    </div>
  );
}

/* ─── Live clock ──────────────────────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-xs text-gray-500 tabular-nums">
      {time}
    </span>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function PredictionsPage() {
  const [days, setDays] = useState(3);
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchForecast(d);
      setForecast(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const totalArrivals = forecast.reduce((s, d) => s + d.checkIns, 0);
  const totalDepartures = forecast.reduce((s, d) => s + d.checkOuts, 0);
  const todayInHouse = forecast[0]?.inHouseGuests ?? 0;

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'var(--bg, #0a0a0f)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-500">
              Live Forecast
            </span>
            <LiveClock />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Arrival Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Predict guest flow — staff accordingly
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Days selector */}
          {[1, 2, 3].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                days === d
                  ? 'bg-emerald-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                background: days === d ? undefined : 'rgba(255,255,255,0.05)',
              }}
            >
              {d}D
            </button>
          ))}
          <Link
            href="/hotel-cms/reception"
            className="ml-2 px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
            Reception
          </Link>
        </div>
      </div>

      {/* Summary strip */}
      {!loading && forecast.length > 0 && (
        <div
          className="grid grid-cols-3 gap-3 mb-6 rounded-xl p-4 border"
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <div className="text-2xl font-bold font-mono text-white">{todayInHouse}</div>
            <div className="text-[10px] uppercase tracking-widest text-gray-600 mt-0.5">currently in-house</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-400">{totalArrivals}</div>
            <div className="text-[10px] uppercase tracking-widest text-gray-600 mt-0.5">
              arrivals next {days}d
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-amber-400">{totalDepartures}</div>
            <div className="text-[10px] uppercase tracking-widest text-gray-600 mt-0.5">
              departures next {days}d
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg px-4 py-3 mb-6 text-sm text-red-300 bg-red-500/10 border border-red-500/20">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
          {Array.from({ length: days }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border h-96 animate-pulse"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            />
          ))}
        </div>
      )}

      {/* Day cards */}
      {!loading && forecast.length > 0 && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${forecast.length}, minmax(0, 1fr))` }}
        >
          {forecast.map((day, i) => (
            <DayCard key={day.date} day={day} isFirst={i === 0} />
          ))}
        </div>
      )}

      {/* Legend note */}
      {!loading && (
        <p className="text-[10px] text-gray-700 mt-6 text-center">
          Hourly distribution is modeled from industry check-in/check-out patterns (actual timestamps not stored).
          Bars show relative expected volume per hour.
        </p>
      )}
    </div>
  );
}
