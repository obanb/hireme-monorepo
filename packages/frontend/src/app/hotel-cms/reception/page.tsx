'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import HotelSidebar from '@/components/HotelSidebar';

interface Reservation {
  id: string;
  originId: string | null;
  guestName: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  currency: string;
  roomId: string | null;
  version: number;
  createdAt: string;
}

interface Room {
  id: string;
  name: string;
  roomNumber: string;
  type: string;
  capacity: number;
  status: string;
  color: string;
}

type DateFilter = 'today' | 'tomorrow' | 'week' | 'custom';
type StatusFilter = 'all' | 'PENDING' | 'CONFIRMED';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

// Helper functions for date calculations
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getToday(): string {
  return formatDate(new Date());
}

function getTomorrow(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

function getWeekEnd(): string {
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  return formatDate(weekEnd);
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDaysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function ReceptionPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customDateFrom, setCustomDateFrom] = useState(getToday());
  const [customDateTo, setCustomDateTo] = useState(getToday());

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return { from: getToday(), to: getToday() };
      case 'tomorrow':
        return { from: getTomorrow(), to: getTomorrow() };
      case 'week':
        return { from: getToday(), to: getWeekEnd() };
      case 'custom':
        return { from: customDateFrom, to: customDateTo };
    }
  }, [dateFilter, customDateFrom, customDateTo]);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      });

      const result = await response.json();
      if (!result.errors) {
        setRooms(result.data?.rooms ?? []);
      }
    } catch {
      // Silently fail rooms fetch
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query ListReservations($filter: ReservationFilterInput) {
              reservations(filter: $filter) {
                id
                originId
                guestName
                status
                checkInDate
                checkOutDate
                totalAmount
                currency
                roomId
                version
                createdAt
              }
            }
          `,
          variables: {
            filter: {
              checkInFrom: dateRange.from,
              checkInTo: dateRange.to,
            },
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to fetch reservations');
      }

      setReservations(result.data?.reservations ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reservations');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReservations();
    fetchRooms();
  }, [fetchReservations, fetchRooms]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filter reservations
  const filteredReservations = useMemo(() => {
    return reservations
      .filter((r) => {
        // Exclude cancelled reservations
        if (r.status === 'CANCELLED') return false;
        // Status filter
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            r.guestName?.toLowerCase().includes(query) ||
            r.originId?.toLowerCase().includes(query) ||
            r.id.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by check-in date, then by status (PENDING first)
        if (a.checkInDate !== b.checkInDate) {
          return a.checkInDate.localeCompare(b.checkInDate);
        }
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
        return 0;
      });
  }, [reservations, statusFilter, searchQuery]);

  // Group reservations by date
  const groupedReservations = useMemo(() => {
    const groups: Record<string, Reservation[]> = {};
    filteredReservations.forEach((r) => {
      const date = r.checkInDate;
      if (!groups[date]) groups[date] = [];
      groups[date].push(r);
    });
    return groups;
  }, [filteredReservations]);

  // Statistics
  const stats = useMemo(() => {
    const pending = filteredReservations.filter((r) => r.status === 'PENDING').length;
    const confirmed = filteredReservations.filter((r) => r.status === 'CONFIRMED').length;
    const noRoom = filteredReservations.filter((r) => !r.roomId).length;
    return { total: filteredReservations.length, pending, confirmed, noRoom };
  }, [filteredReservations]);

  const handleConfirmReservation = async (reservation: Reservation) => {
    setActionLoading(reservation.id);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation ConfirmReservation($input: ConfirmReservationInput!) {
              confirmReservation(input: $input) {
                reservation {
                  id
                  status
                }
              }
            }
          `,
          variables: {
            input: {
              reservationId: reservation.id,
              confirmedBy: 'Reception',
            },
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to confirm reservation');
      }

      setSuccessMessage(`Guest ${reservation.guestName} checked in successfully!`);
      fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm reservation');
    } finally {
      setActionLoading(null);
    }
  };

  const getRoom = (roomId: string | null) => {
    if (!roomId) return null;
    return rooms.find((r) => r.id === roomId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Checked In
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
            Awaiting
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
            {status}
          </span>
        );
    }
  };

  const getDateLabel = (dateStr: string): string => {
    const today = getToday();
    const tomorrow = getTomorrow();
    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    return formatDisplayDate(dateStr);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <HotelSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-slate-800 mb-2">Reception</h1>
                <p className="text-slate-600">
                  Manage guest arrivals and check-ins
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">Current Date</div>
                <div className="text-2xl font-bold text-slate-800">
                  {formatDisplayDate(getToday())}
                </div>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-3">
              <span className="text-xl">&#10003;</span>
              <span className="flex-1">{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700 text-xl">
                &times;
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
              <span className="text-xl">!</span>
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xl">
                &times;
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500 font-medium">Expected Arrivals</div>
                  <div className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                  &#128100;
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500 font-medium">Awaiting Check-in</div>
                  <div className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</div>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
                  &#9201;
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500 font-medium">Checked In</div>
                  <div className="text-3xl font-bold text-green-600 mt-1">{stats.confirmed}</div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                  &#10003;
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500 font-medium">No Room Assigned</div>
                  <div className="text-3xl font-bold text-red-600 mt-1">{stats.noRoom}</div>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">
                  &#9888;
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Filter Tabs */}
              <div className="flex bg-slate-100 rounded-lg p-1">
                {(['today', 'tomorrow', 'week', 'custom'] as DateFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDateFilter(filter)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      dateFilter === filter
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {filter === 'today' && 'Today'}
                    {filter === 'tomorrow' && 'Tomorrow'}
                    {filter === 'week' && 'This Week'}
                    {filter === 'custom' && 'Custom'}
                  </button>
                ))}
              </div>

              {/* Custom Date Range */}
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Divider */}
              <div className="h-8 w-px bg-slate-200" />

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="PENDING">Awaiting Check-in</option>
                  <option value="CONFIRMED">Checked In</option>
                </select>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-slate-200" />

              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search guest name or booking ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Refresh */}
              <button
                onClick={() => fetchReservations()}
                disabled={loading}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <span className={loading ? 'animate-spin' : ''}>&#x21bb;</span>
                Refresh
              </button>
            </div>
          </div>

          {/* Arrivals List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="animate-pulse text-slate-500">Loading arrivals...</div>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="text-5xl mb-4">&#128716;</div>
              <p className="text-xl font-medium text-slate-700">No arrivals found</p>
              <p className="text-slate-500 mt-2">
                {dateFilter === 'today'
                  ? 'No guests expected to arrive today'
                  : dateFilter === 'tomorrow'
                  ? 'No guests expected to arrive tomorrow'
                  : 'No arrivals match your current filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedReservations).map(([date, dayReservations]) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg">
                      <span className="text-lg">&#128197;</span>
                      <span className="font-semibold">{getDateLabel(date)}</span>
                    </div>
                    <div className="text-sm text-slate-500">
                      {dayReservations.length} arrival{dayReservations.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {/* Reservation Cards */}
                  <div className="grid gap-4">
                    {dayReservations.map((reservation) => {
                      const room = getRoom(reservation.roomId);
                      const nights = getDaysDiff(reservation.checkInDate, reservation.checkOutDate);

                      return (
                        <div
                          key={reservation.id}
                          className={`bg-white rounded-xl shadow-sm border-2 transition-all hover:shadow-md ${
                            reservation.status === 'PENDING'
                              ? 'border-amber-200 hover:border-amber-300'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="p-5">
                            <div className="flex items-start gap-4">
                              {/* Guest Avatar */}
                              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                                {reservation.guestName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                              </div>

                              {/* Guest Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 className="text-lg font-bold text-slate-800 truncate">
                                    {reservation.guestName || 'Unknown Guest'}
                                  </h3>
                                  {getStatusBadge(reservation.status)}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                  <span className="font-mono">#{reservation.originId || reservation.id.slice(0, 8)}</span>
                                  <span>&#8226;</span>
                                  <span>{nights} night{nights !== 1 ? 's' : ''}</span>
                                  <span>&#8226;</span>
                                  <span>
                                    Check-out: {formatDisplayDate(reservation.checkOutDate)}
                                  </span>
                                </div>
                              </div>

                              {/* Room Info */}
                              <div className="flex-shrink-0 text-right">
                                {room ? (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: room.color }}
                                    />
                                    <div>
                                      <div className="font-bold text-slate-800">Room #{room.roomNumber}</div>
                                      <div className="text-sm text-slate-500">{room.type}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                                    No Room Assigned
                                  </div>
                                )}
                              </div>

                              {/* Amount */}
                              <div className="flex-shrink-0 text-right px-4 border-l border-slate-100">
                                <div className="text-xs text-slate-400 uppercase">Total</div>
                                <div className="text-lg font-bold text-slate-800">
                                  {reservation.totalAmount?.toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: reservation.currency || 'USD',
                                  }) || '-'}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex-shrink-0 flex items-center gap-2 pl-4 border-l border-slate-100">
                                {reservation.status === 'PENDING' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleConfirmReservation(reservation);
                                    }}
                                    disabled={actionLoading === reservation.id}
                                    className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                                  >
                                    {actionLoading === reservation.id ? (
                                      <span className="flex items-center gap-2">
                                        <span className="animate-spin">&#8987;</span>
                                        Processing...
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-2">
                                        <span>&#10003;</span>
                                        Check In
                                      </span>
                                    )}
                                  </button>
                                ) : (
                                  <div className="px-5 py-2.5 bg-green-100 text-green-700 font-semibold rounded-lg">
                                    &#10003; Checked In
                                  </div>
                                )}
                                <button
                                  onClick={() => router.push(`/hotel-cms/bookings/${reservation.id}`)}
                                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
