'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

interface ReservationStats {
  totalCount: number;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  totalRevenue: number;
  averageAmount: number;
  averageStayDays: number;
}

interface TimelinePoint {
  date: string;
  count: number;
  revenue: number;
}

interface RoomOccupancyStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  occupancyRate: number;
}

interface RevenuePoint {
  month: string;
  revenue: number;
}

interface RoomTypeRevenue {
  roomType: string;
  revenue: number;
  bookingCount: number;
  avgStayDays: number;
}

interface OccupancyPoint {
  date: string;
  occupancyRate: number;
  occupiedRooms: number;
  totalRooms: number;
}

const PIE_COLORS = ['#4ADE80', '#FBBF24', '#A78BFA', '#FB7185'];
const ROOM_TYPE_COLORS = ['#C9A96E', '#60B8D4', '#A78BFA', '#4ADE80', '#FB7185', '#FBBF24'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

const inputStyle = { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' };

export default function StatisticsPage() {
  const { t } = useLocale();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [resStats, setResStats] = useState<ReservationStats | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [occupancy, setOccupancy] = useState<RoomOccupancyStats | null>(null);
  const [revTimeline, setRevTimeline] = useState<RevenuePoint[]>([]);
  const [roomTypeRevenue, setRoomTypeRevenue] = useState<RoomTypeRevenue[]>([]);
  const [occupancyTimeline, setOccupancyTimeline] = useState<OccupancyPoint[]>([]);

  const fetchData = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    const statsFilter = from || to ? `(filter: { ${from ? `dateFrom: "${from}"` : ''} ${to ? `dateTo: "${to}"` : ''} })` : '';
    const timelineFrom = from || '2020-01-01';
    const timelineTo = to || new Date().toISOString().split('T')[0];
    const query = `{
      reservationStats${statsFilter} {
        totalCount pendingCount confirmedCount cancelledCount totalRevenue averageAmount averageStayDays
      }
      reservationTimeline(filter: { dateFrom: "${timelineFrom}", dateTo: "${timelineTo}", granularity: MONTHLY }) { date count revenue }
      roomOccupancyStats { totalRooms availableRooms occupiedRooms maintenanceRooms occupancyRate }
      revenueTimeline${statsFilter} { month revenue }
      revenueByRoomType${statsFilter} { roomType revenue bookingCount avgStayDays }
      occupancyTimeline(filter: { dateFrom: "${timelineFrom}", dateTo: "${timelineTo}", granularity: MONTHLY }) { date occupancyRate occupiedRooms totalRooms }
    }`;
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query }),
      });
      const result = await response.json();
      if (result.data) {
        setResStats(result.data.reservationStats);
        setTimeline(result.data.reservationTimeline ?? []);
        setOccupancy(result.data.roomOccupancyStats);
        setRevTimeline(result.data.revenueTimeline ?? []);
        setRoomTypeRevenue(result.data.revenueByRoomType ?? []);
        setOccupancyTimeline(result.data.occupancyTimeline ?? []);
      }
    } catch { /* API unavailable */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApplyFilter = () => fetchData(dateFrom, dateTo);
  const handleClearFilter = () => { setDateFrom(''); setDateTo(''); fetchData(); };

  // Derived metrics
  const adr = resStats && resStats.totalCount > 0 && resStats.averageStayDays > 0
    ? resStats.totalRevenue / (resStats.totalCount * resStats.averageStayDays)
    : 0;
  const cancellationRate = resStats && resStats.totalCount > 0
    ? (resStats.cancelledCount / resStats.totalCount) * 100
    : 0;
  const revPAR = adr * ((occupancy?.occupancyRate ?? 0) / 100);

  const pieData = occupancy
    ? [
        { name: 'Available', value: occupancy.availableRooms },
        { name: 'Occupied', value: occupancy.occupiedRooms },
        { name: 'Reserved', value: Math.max(0, occupancy.totalRooms - occupancy.availableRooms - occupancy.occupiedRooms - occupancy.maintenanceRooms) },
        { name: 'Maintenance', value: occupancy.maintenanceRooms },
      ].filter((d) => d.value > 0)
    : [];

  const hasData = resStats && resStats.totalCount > 0;

  const tooltipStyle = {
    contentStyle: {
      background: 'var(--sidebar-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: '8px',
      color: 'var(--text-primary)',
      fontSize: '12px',
    },
  };

  const axisStyle = { fill: 'var(--text-muted)', fontSize: 11 };

  const kpiCards = resStats
    ? [
        { label: t('statistics.totalReservations'), value: resStats.totalCount.toString(), sub: `${resStats.confirmedCount} confirmed`, color: '#60B8D4' },
        { label: t('statistics.revenue'), value: formatCurrency(resStats.totalRevenue), sub: `Avg booking ${formatCurrency(resStats.averageAmount)}`, color: '#C9A96E' },
        { label: 'ADR', value: formatCurrency(adr), sub: 'Avg Daily Rate', color: '#A78BFA' },
        { label: 'RevPAR', value: formatCurrency(revPAR), sub: `Occ. ${formatPct(occupancy?.occupancyRate ?? 0)}`, color: '#4ADE80' },
        { label: t('statistics.avgStay'), value: `${resStats.averageStayDays.toFixed(1)} nights`, sub: `${resStats.totalCount} stays`, color: '#FBBF24' },
        { label: 'Cancellation Rate', value: formatPct(cancellationRate), sub: `${resStats.cancelledCount} cancelled`, color: cancellationRate > 20 ? '#FB7185' : '#4ADE80' },
      ]
    : [];

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main
        className="flex-1 px-8 py-8"
        style={{ marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <h1 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }} className="text-[2.75rem] font-bold tracking-tight mb-1">
            {t('statistics.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mb-8">{t('statistics.subtitle')}</p>

          {/* Filter Bar */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-4 mb-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('statistics.dateRange')}</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
            </div>
            <div className="flex items-center gap-2">
              <label style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('vouchers.to')}</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
            </div>
            <button onClick={handleApplyFilter} style={{ background: 'var(--gold)', color: 'var(--background)' }} className="px-4 py-1.5 text-[12.5px] font-semibold rounded-md hover:opacity-90 transition-opacity">
              {t('statistics.apply')}
            </button>
            <button onClick={handleClearFilter} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }} className="px-4 py-1.5 text-[12.5px] font-medium rounded-md hover:opacity-80 transition-opacity">
              {t('statistics.clear')}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--gold)' }} />
            </div>
          ) : !hasData ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-16 text-center">
              <p style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold mb-2">{t('statistics.noData')}</p>
              <p style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('statistics.noDataHint')}</p>
            </div>
          ) : (
            <>
              {/* KPI Cards — 6 metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {kpiCards.map(({ label, value, sub, color }) => (
                  <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderTop: `2px solid ${color}` }} className="rounded-xl p-4">
                    <p style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold tracking-[0.2em] uppercase mb-2">{label}</p>
                    <p style={{ color }} className="text-[1.5rem] font-bold tabular-nums leading-none mb-1">{value}</p>
                    <p style={{ color: 'var(--text-muted)' }} className="text-[10px]">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Charts — 2 col grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Revenue by Month */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
                  <h3 style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold tracking-[0.2em] uppercase mb-4">{t('statistics.revenueByMonth')}</h3>
                  {revTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={revTimeline} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" />
                        <XAxis dataKey="month" tick={axisStyle} />
                        <YAxis tick={axisStyle} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip {...tooltipStyle} formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']} />
                        <Bar dataKey="revenue" name="Revenue" fill="#C9A96E" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[260px] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>{t('statistics.noRevenue')}</div>
                  )}
                </div>

                {/* Revenue by Room Type */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
                  <h3 style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold tracking-[0.2em] uppercase mb-4">Revenue by Room Type</h3>
                  {roomTypeRevenue.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={roomTypeRevenue} layout="vertical" barSize={20}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" horizontal={false} />
                          <XAxis type="number" tick={axisStyle} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="roomType" tick={axisStyle} width={80} />
                          <Tooltip {...tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Revenue']} />
                          <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                            {roomTypeRevenue.map((_, i) => <Cell key={i} fill={ROOM_TYPE_COLORS[i % ROOM_TYPE_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      {/* Table breakdown */}
                      <div className="mt-4 space-y-2">
                        {roomTypeRevenue.map((rt, i) => {
                          const pct = resStats && resStats.totalRevenue > 0
                            ? (rt.revenue / resStats.totalRevenue) * 100
                            : 0;
                          return (
                            <div key={rt.roomType} className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ROOM_TYPE_COLORS[i % ROOM_TYPE_COLORS.length] }} />
                              <span style={{ color: 'var(--text-secondary)' }} className="text-[11px] w-24 flex-shrink-0">{rt.roomType}</span>
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ROOM_TYPE_COLORS[i % ROOM_TYPE_COLORS.length] }} />
                              </div>
                              <span style={{ color: 'var(--text-muted)' }} className="text-[10px] tabular-nums w-20 text-right">{formatCurrency(rt.revenue)}</span>
                              <span style={{ color: 'var(--text-muted)' }} className="text-[10px] w-12 text-right">{rt.bookingCount} bk</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="h-[260px] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>No room type data — assign rooms to reservations</div>
                  )}
                </div>

                {/* Reservations timeline */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
                  <h3 style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold tracking-[0.2em] uppercase mb-4">{t('statistics.reservationTimeline')}</h3>
                  {timeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={timeline}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#C9A96E" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#C9A96E" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" />
                        <XAxis dataKey="date" tick={axisStyle} tickFormatter={(v: string) => v.slice(0, 7)} />
                        <YAxis allowDecimals={false} tick={axisStyle} />
                        <Tooltip {...tooltipStyle} labelFormatter={(v) => String(v).slice(0, 10)} />
                        <Area type="monotone" dataKey="count" name="Bookings" stroke="#C9A96E" fill="url(#colorCount)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[260px] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>{t('statistics.noTimeline')}</div>
                  )}
                </div>

                {/* Occupancy Rate Over Time */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
                  <h3 style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold tracking-[0.2em] uppercase mb-4">Occupancy Rate Over Time</h3>
                  {occupancyTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={occupancyTimeline}>
                        <defs>
                          <linearGradient id="colorOcc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" />
                        <XAxis dataKey="date" tick={axisStyle} tickFormatter={(v: string) => v.slice(0, 7)} />
                        <YAxis domain={[0, 100]} tick={axisStyle} tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip {...tooltipStyle} formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Occupancy']} labelFormatter={(v) => String(v).slice(0, 10)} />
                        <Line type="monotone" dataKey="occupancyRate" name="Occupancy %" stroke="#4ADE80" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[260px] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>No occupancy history</div>
                  )}
                </div>

                {/* Room Status Snapshot */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
                  <h3 style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold tracking-[0.2em] uppercase mb-1">{t('statistics.roomDistribution')}</h3>
                  <p style={{ color: 'var(--text-muted)' }} className="text-[10px] mb-4">Current snapshot</p>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name ?? ''}: ${value}`}>
                          {pieData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[260px] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>{t('statistics.noRooms')}</div>
                  )}
                </div>

                {/* ADR & Stay Length breakdown */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-6">
                  <h3 style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold tracking-[0.2em] uppercase mb-4">Performance Metrics</h3>
                  <div className="space-y-5">
                    {/* ADR vs RevPAR */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">ADR (Avg Daily Rate)</span>
                        <span style={{ color: 'var(--text-primary)' }} className="text-[13px] font-bold tabular-nums">{formatCurrency(adr)}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">RevPAR</span>
                        <span style={{ color: 'var(--text-primary)' }} className="text-[13px] font-bold tabular-nums">{formatCurrency(revPAR)}</span>
                      </div>
                      <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--background)' }}>
                        <div className="h-full rounded-full" style={{ width: `${adr > 0 ? Math.min((revPAR / adr) * 100, 100) : 0}%`, background: 'linear-gradient(90deg, #4ADE80, #C9A96E)' }} />
                      </div>
                      <p style={{ color: 'var(--text-muted)' }} className="text-[10px] mt-1">RevPAR/ADR ratio: {adr > 0 ? formatPct((revPAR / adr) * 100) : '—'}</p>
                    </div>

                    <div style={{ height: 1, background: 'var(--card-border)' }} />

                    {/* Booking status breakdown */}
                    {resStats && ([
                      { label: 'Confirmed', count: resStats.confirmedCount, color: '#4ADE80' },
                      { label: 'Pending', count: resStats.pendingCount, color: '#FBBF24' },
                      { label: 'Cancelled', count: resStats.cancelledCount, color: '#FB7185' },
                    ].map(({ label, count, color }) => {
                      const pct = resStats.totalCount > 0 ? (count / resStats.totalCount) * 100 : 0;
                      return (
                        <div key={label}>
                          <div className="flex justify-between mb-1">
                            <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">{label}</span>
                            <span style={{ color }} className="text-[12px] font-semibold tabular-nums">{count} ({formatPct(pct)})</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                      );
                    }))}

                    <div style={{ height: 1, background: 'var(--card-border)' }} />

                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">Avg Stay Length</span>
                      <span style={{ color: 'var(--text-primary)' }} className="text-[13px] font-bold tabular-nums">{resStats?.averageStayDays.toFixed(1)} nights</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">Avg Booking Value</span>
                      <span style={{ color: 'var(--text-primary)' }} className="text-[13px] font-bold tabular-nums">{formatCurrency(resStats?.averageAmount ?? 0)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
