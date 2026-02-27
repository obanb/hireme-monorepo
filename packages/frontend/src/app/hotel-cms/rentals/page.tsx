'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import HotelSidebar from '../../../components/HotelSidebar';
import { useLocale } from '../../../context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4001/graphql';

// ── Types ──────────────────────────────────────────────────────────────────

type RentalCategory = 'GAMING' | 'SPORTS' | 'OUTDOOR' | 'FITNESS' | 'KIDS' | 'WELLNESS' | 'OTHER';
type RentalBookingStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST';

interface RentalItem {
  id: string;
  name: string;
  description: string | null;
  category: RentalCategory;
  imageUrl: string | null;
  totalQuantity: number;
  availableQuantity: number;
  dailyRate: number | null;
  currency: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RentalBooking {
  id: string;
  itemId: string;
  item: RentalItem | null;
  guestName: string;
  quantity: number;
  status: RentalBookingStatus;
  borrowedAt: string;
  dueDate: string | null;
  returnedAt: string | null;
  notes: string | null;
}

// ── GraphQL fragments ──────────────────────────────────────────────────────

const ITEM_FIELDS = `
  id name description category imageUrl
  totalQuantity availableQuantity
  dailyRate currency isActive createdAt updatedAt
`;

const BOOKING_FIELDS = `
  id itemId guestName quantity status
  borrowedAt dueDate returnedAt notes
  item { ${ITEM_FIELDS} }
`;

// ── Category helpers ───────────────────────────────────────────────────────

const CATEGORIES: RentalCategory[] = ['GAMING', 'SPORTS', 'OUTDOOR', 'FITNESS', 'KIDS', 'WELLNESS', 'OTHER'];

const CATEGORY_ICONS: Record<RentalCategory, string> = {
  GAMING: '🎮',
  SPORTS: '⚽',
  OUTDOOR: '🏔️',
  FITNESS: '🏋️',
  KIDS: '🧸',
  WELLNESS: '🧘',
  OTHER: '📦',
};

const STATUS_COLORS: Record<RentalBookingStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  RETURNED: 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LOST: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

// ── Main Component ─────────────────────────────────────────────────────────

export default function RentalsPage() {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<'catalog' | 'active'>('catalog');

  const [items, setItems] = useState<RentalItem[]>([]);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<RentalCategory | ''>('');
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Item modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    category: 'OTHER' as RentalCategory,
    imageUrl: '',
    totalQuantity: 1,
    dailyRate: '',
    currency: 'EUR',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Booking modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingItem, setBookingItem] = useState<RentalItem | null>(null);
  const [bookingForm, setBookingForm] = useState({
    guestName: '',
    quantity: 1,
    dueDate: '',
    notes: '',
  });

  const [savingItem, setSavingItem] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    try {
      const vars: Record<string, unknown> = {};
      if (categoryFilter) vars.category = categoryFilter;
      if (!showInactive) vars.isActive = true;

      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query($category: RentalCategory, $isActive: Boolean) {
            rentalItems(category: $category, isActive: $isActive) { ${ITEM_FIELDS} }
          }`,
          variables: vars,
        }),
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setItems(data.data.rentalItems);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading items');
    }
  }, [categoryFilter, showInactive]);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query { rentalBookings(status: ACTIVE) { ${BOOKING_FIELDS} } }`,
        }),
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setBookings(data.data.rentalBookings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading bookings');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchItems(), fetchBookings()]);
      setLoading(false);
    };
    load();
  }, [fetchItems, fetchBookings]);

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // ── Item CRUD ────────────────────────────────────────────────────────────

  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm({ name: '', description: '', category: 'OTHER', imageUrl: '', totalQuantity: 1, dailyRate: '', currency: 'EUR' });
    setImagePreview(null);
    setShowItemModal(true);
  };

  const openEditItem = (item: RentalItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description ?? '',
      category: item.category,
      imageUrl: item.imageUrl ?? '',
      totalQuantity: item.totalQuantity,
      dailyRate: item.dailyRate != null ? String(item.dailyRate) : '',
      currency: item.currency ?? 'EUR',
    });
    setImagePreview(item.imageUrl);
    setShowItemModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setItemForm((f) => ({ ...f, imageUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const saveItem = async () => {
    setSavingItem(true);
    try {
      const input = {
        name: itemForm.name,
        description: itemForm.description || null,
        category: itemForm.category,
        imageUrl: itemForm.imageUrl || null,
        totalQuantity: itemForm.totalQuantity,
        dailyRate: itemForm.dailyRate ? parseFloat(itemForm.dailyRate) : null,
        currency: itemForm.currency || null,
      };

      if (editingItem) {
        await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `mutation($id: ID!, $input: UpdateRentalItemInput!) {
              updateRentalItem(id: $id, input: $input) { ${ITEM_FIELDS} }
            }`,
            variables: { id: editingItem.id, input },
          }),
        });
      } else {
        await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `mutation($input: CreateRentalItemInput!) {
              createRentalItem(input: $input) { ${ITEM_FIELDS} }
            }`,
            variables: { input },
          }),
        });
      }

      setShowItemModal(false);
      setSuccessMessage(editingItem ? 'Item updated' : 'Item created');
      await fetchItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving item');
    } finally {
      setSavingItem(false);
    }
  };

  const toggleItemActive = async (item: RentalItem) => {
    await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `mutation($id: ID!, $input: UpdateRentalItemInput!) {
          updateRentalItem(id: $id, input: $input) { id }
        }`,
        variables: { id: item.id, input: { isActive: !item.isActive } },
      }),
    });
    setSuccessMessage(item.isActive ? 'Item deactivated' : 'Item activated');
    await fetchItems();
  };

  // ── Booking actions ──────────────────────────────────────────────────────

  const openRentModal = (item: RentalItem) => {
    setBookingItem(item);
    setBookingForm({ guestName: '', quantity: 1, dueDate: '', notes: '' });
    setShowBookingModal(true);
  };

  const saveBooking = async () => {
    if (!bookingItem) return;
    setSavingBooking(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($input: CreateRentalBookingInput!) {
            createRentalBooking(input: $input) { id }
          }`,
          variables: {
            input: {
              itemId: bookingItem.id,
              guestName: bookingForm.guestName,
              quantity: bookingForm.quantity,
              dueDate: bookingForm.dueDate || null,
              notes: bookingForm.notes || null,
            },
          },
        }),
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setShowBookingModal(false);
      setSuccessMessage('Item rented out successfully');
      await Promise.all([fetchItems(), fetchBookings()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creating rental');
    } finally {
      setSavingBooking(false);
    }
  };

  const markReturned = async (bookingId: string) => {
    if (!confirm(t('rentals.confirmReturn'))) return;
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($bookingId: ID!) {
            returnRentalItem(bookingId: $bookingId) { id }
          }`,
          variables: { bookingId },
        }),
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setSuccessMessage('Item marked as returned');
      await Promise.all([fetchItems(), fetchBookings()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error returning item');
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredItems = items.filter((item) =>
    searchQuery
      ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const categoryLabel = (cat: RentalCategory) => t(`rentals.category${cat.charAt(0) + cat.slice(1).toLowerCase()}` as never) || cat;

  const availabilityColor = (item: RentalItem) => {
    const ratio = item.availableQuantity / item.totalQuantity;
    if (ratio === 0) return 'bg-red-500';
    if (ratio < 0.4) return 'bg-orange-400';
    return 'bg-emerald-500';
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-stone-100 dark:bg-stone-900">
      <HotelSidebar />

      <main className="flex-1 ml-72 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100">{t('rentals.title')}</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">{t('rentals.subtitle')}</p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between">
            <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4">✕</button>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <span className="text-emerald-700 dark:text-emerald-400 text-sm">{successMessage}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-stone-200 dark:bg-stone-800 rounded-xl p-1 w-fit">
          {(['catalog', 'active'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {tab === 'catalog' ? t('rentals.tabCatalog') : t('rentals.tabActiveRentals')}
              {tab === 'active' && bookings.length > 0 && (
                <span className="ml-2 bg-lime-500 text-white text-xs rounded-full px-1.5 py-0.5">{bookings.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── CATALOG TAB ──────────────────────────────────────────────── */}
        {activeTab === 'catalog' && (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 w-52"
              />

              {/* Category filter pills */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    categoryFilter === ''
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                      : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 hover:border-stone-400'
                  }`}
                >
                  {t('rentals.allCategories')}
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      categoryFilter === cat
                        ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                        : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {CATEGORY_ICONS[cat]} {categoryLabel(cat)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="rounded accent-lime-500"
                  />
                  {t('rentals.includeInactive')}
                </label>
                <button
                  onClick={openCreateItem}
                  className="px-4 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
                >
                  + {t('rentals.addItem')}
                </button>
              </div>
            </div>

            {/* Item Grid */}
            {loading ? (
              <div className="text-center py-16 text-stone-400">{t('common.loading')}</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-2xl mb-2">📦</p>
                <p className="text-stone-500 dark:text-stone-400 font-medium">{t('rentals.noCatalog')}</p>
                <p className="text-stone-400 text-sm mt-1">{t('rentals.noCatalogDesc')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-stone-800 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      !item.isActive ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Image */}
                    <div className="relative h-44 bg-stone-100 dark:bg-stone-700 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-5xl">{CATEGORY_ICONS[item.category]}</span>
                      )}
                      {/* Availability dot */}
                      <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${availabilityColor(item)} ring-2 ring-white dark:ring-stone-800`} title={`${item.availableQuantity} available`} />
                      {/* Category badge */}
                      <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-lg backdrop-blur-sm">
                        {CATEGORY_ICONS[item.category]} {categoryLabel(item.category)}
                      </div>
                      {!item.isActive && (
                        <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                          <span className="bg-stone-800 text-stone-300 text-xs px-2 py-1 rounded-lg">{t('common.inactive')}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-stone-900 dark:text-stone-100 truncate">{item.name}</h3>
                      {item.description && (
                        <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5 line-clamp-2">{item.description}</p>
                      )}

                      {/* Availability bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
                          <span>{item.availableQuantity} {t('rentals.available')}</span>
                          <span>{t('rentals.of')} {item.totalQuantity}</span>
                        </div>
                        <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${availabilityColor(item)}`}
                            style={{ width: `${(item.availableQuantity / item.totalQuantity) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mt-3 text-sm">
                        {item.dailyRate != null ? (
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            {item.dailyRate} {item.currency}{t('rentals.perDay')}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{t('rentals.free')}</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openRentModal(item)}
                          disabled={item.availableQuantity === 0 || !item.isActive}
                          className="flex-1 px-3 py-2 bg-lime-500 hover:bg-lime-600 disabled:bg-stone-200 dark:disabled:bg-stone-700 disabled:text-stone-400 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          {t('rentals.rentOut')}
                        </button>
                        <button
                          onClick={() => openEditItem(item)}
                          className="px-3 py-2 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold transition-colors"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => toggleItemActive(item)}
                          className="px-3 py-2 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-500 dark:text-stone-400 rounded-lg text-xs transition-colors"
                          title={item.isActive ? t('rentals.deactivate') : t('rentals.reactivate')}
                        >
                          {item.isActive ? '⏸' : '▶'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ACTIVE RENTALS TAB ──────────────────────────────────────── */}
        {activeTab === 'active' && (
          <>
            {loading ? (
              <div className="text-center py-16 text-stone-400">{t('common.loading')}</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-stone-500 dark:text-stone-400 font-medium">{t('rentals.noActiveRentals')}</p>
                <p className="text-stone-400 text-sm mt-1">{t('rentals.noActiveRentalsDesc')}</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100 dark:border-stone-700">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('rentals.item')}</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('rentals.guest')}</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('rentals.quantity')}</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('rentals.borrowedAt')}</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('rentals.dueDate')}</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('rentals.status')}</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                    {bookings.map((booking) => {
                      const isOverdue =
                        booking.dueDate && new Date(booking.dueDate) < new Date() && booking.status === 'ACTIVE';
                      const displayStatus: RentalBookingStatus = isOverdue ? 'OVERDUE' : booking.status;
                      return (
                        <tr key={booking.id} className="hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {booking.item?.imageUrl ? (
                                <img
                                  src={booking.item.imageUrl}
                                  alt={booking.item?.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-xl">
                                  {booking.item ? CATEGORY_ICONS[booking.item.category] : '📦'}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{booking.item?.name ?? '—'}</p>
                                {booking.item && (
                                  <p className="text-xs text-stone-400">{categoryLabel(booking.item.category)}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-stone-900 dark:text-stone-100 text-sm font-medium">{booking.guestName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-stone-600 dark:text-stone-300 text-sm">{booking.quantity}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-stone-500 dark:text-stone-400 text-sm">
                              {new Date(booking.borrowedAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-stone-500 dark:text-stone-400'}`}>
                              {booking.dueDate ? new Date(booking.dueDate).toLocaleDateString() : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_COLORS[displayStatus]}`}>
                              {t(`rentals.status${displayStatus.charAt(0) + displayStatus.slice(1).toLowerCase()}` as never)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => markReturned(booking.id)}
                              className="px-4 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-xs font-semibold hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
                            >
                              {t('rentals.markReturned')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── ITEM MODAL ─────────────────────────────────────────────────── */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-100 dark:border-stone-700">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {editingItem ? t('rentals.editItem') : t('rentals.createItem')}
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">{t('rentals.image')}</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl overflow-hidden hover:border-lime-500 transition-colors"
                  style={{ height: 160 }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-stone-400">
                      <span className="text-3xl mb-2">📷</span>
                      <span className="text-sm">{t('rentals.uploadImage')}</span>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('rentals.itemName')} *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm"
                  placeholder="e.g. Nintendo Switch"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('rentals.itemDesc')}</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm resize-none"
                  placeholder="Short description..."
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('rentals.category')}</label>
                <select
                  value={itemForm.category}
                  onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value as RentalCategory }))}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {categoryLabel(cat)}</option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('rentals.quantity')}</label>
                <input
                  type="number"
                  min={1}
                  value={itemForm.totalQuantity}
                  onChange={(e) => setItemForm((f) => ({ ...f, totalQuantity: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm"
                />
              </div>

              {/* Daily rate + currency */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('rentals.dailyRate')} <span className="text-stone-400 font-normal">({t('rentals.free')})</span></label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={itemForm.dailyRate}
                    onChange={(e) => setItemForm((f) => ({ ...f, dailyRate: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('rentals.currency')}</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={itemForm.currency}
                    onChange={(e) => setItemForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm uppercase"
                    placeholder="EUR"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-stone-100 dark:border-stone-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowItemModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={saveItem}
                disabled={savingItem || !itemForm.name}
                className="px-5 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-50 transition-colors"
              >
                {savingItem ? t('common.saving') : (editingItem ? t('common.save') : t('common.create'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOOKING MODAL ──────────────────────────────────────────────── */}
      {showBookingModal && bookingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-stone-100 dark:border-stone-700">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{t('rentals.createBooking')}</h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
                {CATEGORY_ICONS[bookingItem.category]} {bookingItem.name}
                <span className="ml-2 text-stone-400">({bookingItem.availableQuantity} {t('rentals.available')})</span>
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('rentals.guestName')} *</label>
                <input
                  type="text"
                  value={bookingForm.guestName}
                  onChange={(e) => setBookingForm((f) => ({ ...f, guestName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm"
                  placeholder="Guest full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('rentals.quantityRent')}</label>
                <input
                  type="number"
                  min={1}
                  max={bookingItem.availableQuantity}
                  value={bookingForm.quantity}
                  onChange={(e) => setBookingForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('rentals.dueDate')}</label>
                <input
                  type="date"
                  value={bookingForm.dueDate}
                  onChange={(e) => setBookingForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('rentals.notes')}</label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-lime-500 text-sm resize-none"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-stone-100 dark:border-stone-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowBookingModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={saveBooking}
                disabled={savingBooking || !bookingForm.guestName}
                className="px-5 py-2.5 bg-lime-500 hover:bg-lime-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {savingBooking ? t('common.processing') : t('rentals.rentOut')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
