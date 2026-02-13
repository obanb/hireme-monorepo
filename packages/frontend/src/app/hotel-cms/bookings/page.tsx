'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

interface Reservation {
  id: string;
  originId: string | null;
  guestName: string;
  guestEmail: string | null;
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

interface CreateReservationInput {
  originId: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  currency: string;
  roomId: string;
}

interface ReservationFilter {
  status: string;
  guestName: string;
  checkInFrom: string;
  checkInTo: string;
  checkOutFrom: string;
  checkOutTo: string;
  createdFrom: string;
  createdTo: string;
  currency: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const emptyFilter: ReservationFilter = {
  status: '',
  guestName: '',
  checkInFrom: '',
  checkInTo: '',
  checkOutFrom: '',
  checkOutTo: '',
  createdFrom: '',
  createdTo: '',
  currency: '',
};

function BookingsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<ReservationFilter>(emptyFilter);
  const [appliedFilters, setAppliedFilters] = useState<ReservationFilter>(emptyFilter);
  const [formData, setFormData] = useState<CreateReservationInput>({
    originId: '',
    guestFirstName: '',
    guestLastName: '',
    guestEmail: '',
    checkInDate: '',
    checkOutDate: '',
    totalAmount: 0,
    currency: 'USD',
    roomId: '',
  });

  // Handle URL params for pre-filling form
  useEffect(() => {
    const roomId = searchParams.get('roomId');
    const checkInDate = searchParams.get('checkInDate');

    if (roomId || checkInDate) {
      setShowForm(true);
      setFormData(prev => ({
        ...prev,
        roomId: roomId || prev.roomId,
        checkInDate: checkInDate || prev.checkInDate,
      }));
      // Clear URL params after reading them
      router.replace('/hotel-cms/bookings', { scroll: false });
    }
  }, [searchParams, router]);

  const buildFilterInput = useCallback((f: ReservationFilter) => {
    const filter: Record<string, string> = {};
    if (f.status) filter.status = f.status;
    if (f.guestName) filter.guestName = f.guestName;
    if (f.checkInFrom) filter.checkInFrom = f.checkInFrom;
    if (f.checkInTo) filter.checkInTo = f.checkInTo;
    if (f.checkOutFrom) filter.checkOutFrom = f.checkOutFrom;
    if (f.checkOutTo) filter.checkOutTo = f.checkOutTo;
    if (f.createdFrom) filter.createdFrom = f.createdFrom;
    if (f.createdTo) filter.createdTo = f.createdTo;
    if (f.currency) filter.currency = f.currency;
    return Object.keys(filter).length > 0 ? filter : null;
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
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
      });

      const result = await response.json();
      if (!result.errors) {
        setRooms(result.data?.rooms ?? []);
      }
    } catch {
      // Silently fail rooms fetch - not critical
    }
  }, []);

  const fetchReservations = useCallback(async (filterToApply?: ReservationFilter) => {
    try {
      setLoading(true);
      const filterInput = buildFilterInput(filterToApply ?? appliedFilters);

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            query ListReservations($filter: ReservationFilterInput) {
              reservations(filter: $filter) {
                id
                originId
                guestName
                guestEmail
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
            filter: filterInput,
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
  }, [appliedFilters, buildFilterInput]);

  useEffect(() => {
    fetchReservations();
    fetchRooms();
  }, [fetchReservations, fetchRooms]);

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    fetchReservations(filters);
  };

  const handleClearFilters = () => {
    setFilters(emptyFilter);
    setAppliedFilters(emptyFilter);
    fetchReservations(emptyFilter);
  };

  const activeFilterCount = Object.values(appliedFilters).filter(v => v !== '').length;

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation CreateReservation($input: CreateReservationInput!) {
              createReservation(input: $input) {
                reservation {
                  id
                  guestName
                  status
                }
                events {
                  id
                  type
                }
              }
            }
          `,
          variables: {
            input: {
              originId: formData.originId || `WEB-${Date.now()}`,
              guestFirstName: formData.guestFirstName,
              guestLastName: formData.guestLastName,
              guestEmail: formData.guestEmail,
              checkInDate: formData.checkInDate,
              checkOutDate: formData.checkOutDate,
              totalAmount: parseFloat(formData.totalAmount.toString()),
              currency: formData.currency,
              roomId: formData.roomId || null,
            },
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to create reservation');
      }

      setFormData({
        originId: '',
        guestFirstName: '',
        guestLastName: '',
        guestEmail: '',
        checkInDate: '',
        checkOutDate: '',
        totalAmount: 0,
        currency: 'USD',
        roomId: '',
      });
      setShowForm(false);
      fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-lime-100 text-lime-700';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-stone-100 text-stone-700';
    }
  };

  return (
    <div className="flex min-h-screen bg-stone-100 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-stone-900 dark:text-stone-100 mb-2">{t('bookings.title')}</h1>
              <p className="text-stone-500 dark:text-stone-400">
                {t('bookings.subtitle')}
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold rounded-2xl shadow-lg hover:shadow-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-xl text-lime-400 dark:text-lime-500">{showForm ? '✕' : '+'}</span>
              {showForm ? t('common.cancel') : t('bookings.newReservation')}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                {t('common.dismiss')}
              </button>
            </div>
          )}

          {/* Create Reservation Form */}
          {showForm && (
            <div className="mb-8 bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-6">
              <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 mb-4">
                {t('bookings.createNew')}
              </h2>
              <form onSubmit={handleCreateReservation} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('bookings.firstName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.guestFirstName}
                      onChange={(e) =>
                        setFormData({ ...formData, guestFirstName: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('bookings.lastName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.guestLastName}
                      onChange={(e) =>
                        setFormData({ ...formData, guestLastName: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      placeholder="Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('common.email')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.guestEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, guestEmail: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('bookings.checkInDate')} *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.checkInDate}
                      onChange={(e) =>
                        setFormData({ ...formData, checkInDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('bookings.checkOutDate')} *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.checkOutDate}
                      onChange={(e) =>
                        setFormData({ ...formData, checkOutDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('bookings.totalAmount')} *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.totalAmount || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      placeholder="299.99"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('bookings.currency')}
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData({ ...formData, currency: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CZK">CZK</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('bookings.room')}
                    </label>
                    <select
                      value={formData.roomId}
                      onChange={(e) =>
                        setFormData({ ...formData, roomId: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    >
                      <option value="">{t('bookings.noRoomAssigned')}</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          #{room.roomNumber} - {room.name} ({room.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('bookings.originId')}
                    </label>
                    <input
                      type="text"
                      value={formData.originId}
                      onChange={(e) =>
                        setFormData({ ...formData, originId: e.target.value })
                      }
                      className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      placeholder="BOOKING-123 (auto-generated if empty)"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 border-2 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold rounded-xl shadow-md hover:shadow-lg hover:bg-stone-800 dark:hover:bg-stone-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? t('common.creating') : t('bookings.createReservation')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters Section */}
          <div className="mb-6 bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 overflow-hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl text-lime-600">&#x25CE;</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{t('common.filters')}</span>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 bg-lime-100 text-lime-700 text-xs font-bold rounded-full">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <span className="text-stone-400 dark:text-stone-500">{showFilters ? '\u25B2' : '\u25BC'}</span>
            </button>

            {showFilters && (
              <div className="p-6 border-t border-stone-200 dark:border-stone-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('filters.status')}
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    >
                      <option value="">{t('filters.allStatuses')}</option>
                      <option value="PENDING">{t('filters.pending')}</option>
                      <option value="CONFIRMED">{t('filters.confirmed')}</option>
                      <option value="CANCELLED">{t('filters.cancelled')}</option>
                    </select>
                  </div>

                  {/* Guest Name Filter */}
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('filters.guestName')}
                    </label>
                    <input
                      type="text"
                      value={filters.guestName}
                      onChange={(e) => setFilters({ ...filters, guestName: e.target.value })}
                      placeholder="Search by name..."
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  {/* Currency Filter */}
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('bookings.currency')}
                    </label>
                    <select
                      value={filters.currency}
                      onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    >
                      <option value="">{t('filters.allCurrencies')}</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CZK">CZK</option>
                    </select>
                  </div>

                  {/* Check-in Date Range */}
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('filters.checkInFrom')}
                    </label>
                    <input
                      type="date"
                      value={filters.checkInFrom}
                      onChange={(e) => setFilters({ ...filters, checkInFrom: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('filters.checkInTo')}
                    </label>
                    <input
                      type="date"
                      value={filters.checkInTo}
                      onChange={(e) => setFilters({ ...filters, checkInTo: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  {/* Check-out Date Range */}
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('filters.checkOutFrom')}
                    </label>
                    <input
                      type="date"
                      value={filters.checkOutFrom}
                      onChange={(e) => setFilters({ ...filters, checkOutFrom: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('filters.checkOutTo')}
                    </label>
                    <input
                      type="date"
                      value={filters.checkOutTo}
                      onChange={(e) => setFilters({ ...filters, checkOutTo: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  {/* Created Date Range (Event Sourcing Audit) */}
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('filters.createdFrom')}
                      <span className="ml-1 text-xs text-stone-400 dark:text-stone-500">{t('filters.audit')}</span>
                    </label>
                    <input
                      type="date"
                      value={filters.createdFrom}
                      onChange={(e) => setFilters({ ...filters, createdFrom: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {t('filters.createdTo')}
                      <span className="ml-1 text-xs text-stone-400 dark:text-stone-500">{t('filters.audit')}</span>
                    </label>
                    <input
                      type="date"
                      value={filters.createdTo}
                      onChange={(e) => setFilters({ ...filters, createdTo: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-100 dark:border-stone-700">
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-sm text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors font-medium"
                  >
                    {t('common.clearAll')}
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
                  >
                    {t('common.applyFilters')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reservations List */}
          <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
                  {t('bookings.reservations')}
                  {activeFilterCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-stone-500 dark:text-stone-400">
                      {t('bookings.filtered')}
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => fetchReservations()}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors flex items-center gap-2 font-medium"
                >
                  <span className={loading ? 'animate-spin' : ''}>&#x21bb;</span>
                  {t('common.refresh')}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-stone-500 dark:text-stone-400">
                <div className="animate-pulse">{t('bookings.loadingReservations')}</div>
              </div>
            ) : reservations.length === 0 ? (
              <div className="p-12 text-center text-stone-500 dark:text-stone-400">
                <div className="text-4xl mb-4">&#x25A3;</div>
                <p className="text-lg font-bold">
                  {activeFilterCount > 0 ? t('bookings.noMatching') : t('bookings.noReservations')}
                </p>
                <p className="text-sm mt-1">
                  {activeFilterCount > 0
                    ? 'Try adjusting your filters'
                    : t('bookings.createFirst')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50 dark:bg-stone-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('bookings.guest')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('filters.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('bookings.room')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('bookings.checkIn')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('bookings.checkOut')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('bookings.amount')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                        {t('common.created')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                    {reservations.map((reservation) => {
                      const room = rooms.find((r) => r.id === reservation.roomId);
                      return (
                        <tr
                          key={reservation.id}
                          className="hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                          onClick={() => router.push(`/hotel-cms/bookings/${reservation.id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="font-bold text-stone-900 dark:text-stone-100">
                              {reservation.guestName}
                            </div>
                            {reservation.guestEmail && (
                              <div className="text-xs text-stone-500 dark:text-stone-400">
                                {reservation.guestEmail}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-bold rounded-lg ${getStatusColor(
                                reservation.status
                              )}`}
                            >
                              {reservation.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {room ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-lg flex-shrink-0"
                                  style={{ backgroundColor: room.color }}
                                />
                                <span className="text-stone-600 dark:text-stone-300">#{room.roomNumber}</span>
                              </div>
                            ) : (
                              <span className="text-stone-400 dark:text-stone-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-stone-600 dark:text-stone-300">
                            {reservation.checkInDate}
                          </td>
                          <td className="px-6 py-4 text-stone-600 dark:text-stone-300">
                            {reservation.checkOutDate}
                          </td>
                          <td className="px-6 py-4 text-stone-900 dark:text-stone-100 font-bold">
                            {reservation.totalAmount?.toLocaleString('en-US', {
                              style: 'currency',
                              currency: reservation.currency || 'USD',
                            })}
                          </td>
                          <td className="px-6 py-4 text-stone-500 dark:text-stone-400 text-sm">
                            {reservation.createdAt
                              ? new Date(reservation.createdAt).toLocaleDateString()
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BookingsPage() {
  const { t } = useLocale();
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-stone-100 dark:bg-stone-900">
        <HotelSidebar />
        <main className="flex-1 ml-72 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse text-center text-stone-500 dark:text-stone-400 py-12">
              {t('common.loading')}
            </div>
          </div>
        </main>
      </div>
    }>
      <BookingsPageContent />
    </Suspense>
  );
}
