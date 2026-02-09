'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
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

const STATUS_COLORS = ['#a3e635', '#22c55e', '#ef4444'];
const PIE_COLORS = ['#22c55e', '#f59e0b', '#6366f1', '#ef4444'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export default function StatisticsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const [resStats, setResStats] = useState<ReservationStats | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [occupancy, setOccupancy] = useState<RoomOccupancyStats | null>(null);
  const [revTimeline, setRevTimeline] = useState<RevenuePoint[]>([]);

  const fetchData = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    const statsFilter = from || to ? `, filter: { ${from ? `dateFrom: "${from}"` : ''} ${to ? `dateTo: "${to}"` : ''} }` : '';
    const timelineFrom = from || '2020-01-01';
    const timelineTo = to || new Date().toISOString().split('T')[0];

    const query = `{
      reservationStats${statsFilter ? `(${statsFilter.replace(',', '')})` : ''} {
        totalCount pendingCount confirmedCount cancelledCount
        totalRevenue averageAmount averageStayDays
      }
      reservationTimeline(filter: { dateFrom: "${timelineFrom}", dateTo: "${timelineTo}", granularity: MONTHLY }) {
        date count revenue
      }
      roomOccupancyStats {
        totalRooms availableRooms occupiedRooms maintenanceRooms occupancyRate
      }
      revenueTimeline${statsFilter ? `(${statsFilter.replace(',', '')})` : ''} {
        month revenue
      }
    }`;

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const result = await response.json();
      if (result.data) {
        setResStats(result.data.reservationStats);
        setTimeline(result.data.reservationTimeline);
        setOccupancy(result.data.roomOccupancyStats);
        setRevTimeline(result.data.revenueTimeline);
      }
    } catch {
      // API unavailable — keep empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyFilter = () => fetchData(dateFrom, dateTo);

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
    fetchData();
  };

  const statusBarData = resStats
    ? [
        { name: 'Pending', value: resStats.pendingCount },
        { name: 'Confirmed', value: resStats.confirmedCount },
        { name: 'Cancelled', value: resStats.cancelledCount },
      ]
    : [];

  const pieData = occupancy
    ? [
        { name: 'Available', value: occupancy.availableRooms },
        { name: 'Occupied', value: occupancy.occupiedRooms },
        { name: 'Reserved', value: Math.max(0, occupancy.totalRooms - occupancy.availableRooms - occupancy.occupiedRooms - occupancy.maintenanceRooms) },
        { name: 'Maintenance', value: occupancy.maintenanceRooms },
      ].filter((d) => d.value > 0)
    : [];

  const hasData = resStats && resStats.totalCount > 0;

  return (
    <div className="flex min-h-screen bg-stone-50">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">Statistics</h1>
            <p className="text-stone-500 mt-1">Overview of reservations, revenue and occupancy</p>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-8 flex flex-wrap items-center gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-stone-600">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-stone-600">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>
            <button
              onClick={handleApplyFilter}
              className="px-5 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleClearFilter}
              className="px-5 py-2 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Clear
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-lime-500 border-t-transparent rounded-full" />
            </div>
          ) : !hasData ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center shadow-sm">
              <div className="text-5xl mb-4 text-stone-300">&#9776;</div>
              <h3 className="text-xl font-semibold text-stone-700 mb-2">No data available</h3>
              <p className="text-stone-500">Create some reservations and rooms to see statistics here.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Total Reservations</p>
                  <p className="text-3xl font-black text-stone-900 mt-1">{resStats!.totalCount}</p>
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Total Revenue</p>
                  <p className="text-3xl font-black text-stone-900 mt-1">{formatCurrency(resStats!.totalRevenue)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Avg Stay</p>
                  <p className="text-3xl font-black text-stone-900 mt-1">{resStats!.averageStayDays.toFixed(1)} <span className="text-lg font-medium text-stone-400">days</span></p>
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Occupancy Rate</p>
                  <p className="text-3xl font-black text-stone-900 mt-1">{occupancy?.occupancyRate.toFixed(1) ?? 0}<span className="text-lg font-medium text-stone-400">%</span></p>
                </div>
              </div>

              {/* Charts 2x2 Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reservations by Status */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Reservations by Status</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={statusBarData} barSize={48}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="name" tick={{ fill: '#78716c', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4' }}
                      />
                      <Bar dataKey="value" name="Count" radius={[8, 8, 0, 0]}>
                        {statusBarData.map((_, index) => (
                          <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Reservation Timeline */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Reservation Timeline</h3>
                  {timeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={timeline}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a3e635" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#78716c', fontSize: 12 }}
                          tickFormatter={(v: string) => v.slice(0, 7)}
                        />
                        <YAxis allowDecimals={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4' }}
                          labelFormatter={(v) => String(v).slice(0, 10)}
                        />
                        <Area type="monotone" dataKey="count" name="Reservations" stroke="#84cc16" fill="url(#colorCount)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-stone-400">No timeline data</div>
                  )}
                </div>

                {/* Room Status Distribution */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Room Status Distribution</h3>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name ?? ''}: ${value}`}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-stone-400">No rooms found</div>
                  )}
                </div>

                {/* Revenue by Month */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Revenue by Month</h3>
                  {revTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={revTimeline} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                        <XAxis dataKey="month" tick={{ fill: '#78716c', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#78716c', fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4' }}
                          formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                        />
                        <Bar dataKey="revenue" name="Revenue" fill="#84cc16" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-stone-400">No revenue data</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
