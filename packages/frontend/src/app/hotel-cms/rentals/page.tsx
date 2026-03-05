'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import HotelSidebar from '../../../components/HotelSidebar';
import { useLocale } from '../../../context/LocaleContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4001/graphql';

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

const ITEM_FIELDS = `id name description category imageUrl totalQuantity availableQuantity dailyRate currency isActive createdAt updatedAt`;
const BOOKING_FIELDS = `id itemId guestName quantity status borrowedAt dueDate returnedAt notes item { ${ITEM_FIELDS} }`;

const CATEGORIES: RentalCategory[] = ['GAMING', 'SPORTS', 'OUTDOOR', 'FITNESS', 'KIDS', 'WELLNESS', 'OTHER'];

const CATEGORY_ICONS: Record<RentalCategory, string> = {
  GAMING: '🎮', SPORTS: '⚽', OUTDOOR: '🏔️', FITNESS: '🏋️', KIDS: '🧸', WELLNESS: '🧘', OTHER: '📦',
};

const STATUS_CONFIG: Record<RentalBookingStatus, { color: string; bg: string }> = {
  ACTIVE:   { color: '#4ADE80', bg: 'rgba(74,222,128,0.1)' },
  RETURNED: { color: 'var(--text-muted)', bg: 'rgba(160,160,140,0.1)' },
  OVERDUE:  { color: '#FB7185', bg: 'rgba(251,113,133,0.1)' },
  LOST:     { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
  background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)',
};

export default function RentalsPage() {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'catalog' | 'active'>('catalog');

  const [items, setItems] = useState<RentalItem[]>([]);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<RentalCategory | ''>('');
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '', description: '', category: 'OTHER' as RentalCategory,
    imageUrl: '', totalQuantity: 1, dailyRate: '', currency: 'EUR',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingItem, setBookingItem] = useState<RentalItem | null>(null);
  const [bookingForm, setBookingForm] = useState({ guestName: '', quantity: 1, dueDate: '', notes: '' });

  const [savingItem, setSavingItem] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const vars: Record<string, unknown> = {};
      if (categoryFilter) vars.category = categoryFilter;
      if (!showInactive) vars.isActive = true;
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ query: `query($category: RentalCategory, $isActive: Boolean) { rentalItems(category: $category, isActive: $isActive) { ${ITEM_FIELDS} } }`, variables: vars }),
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ query: `query { rentalBookings(status: ACTIVE) { ${BOOKING_FIELDS} } }` }),
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setBookings(data.data.rentalBookings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading bookings');
    }
  }, []);

  useEffect(() => {
    const load = async () => { setLoading(true); await Promise.all([fetchItems(), fetchBookings()]); setLoading(false); };
    load();
  }, [fetchItems, fetchBookings]);

  useEffect(() => {
    if (successMessage) { const timer = setTimeout(() => setSuccessMessage(null), 3000); return () => clearTimeout(timer); }
  }, [successMessage]);

  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm({ name: '', description: '', category: 'OTHER', imageUrl: '', totalQuantity: 1, dailyRate: '', currency: 'EUR' });
    setImagePreview(null);
    setShowItemModal(true);
  };

  const openEditItem = (item: RentalItem) => {
    setEditingItem(item);
    setItemForm({ name: item.name, description: item.description ?? '', category: item.category, imageUrl: item.imageUrl ?? '', totalQuantity: item.totalQuantity, dailyRate: item.dailyRate != null ? String(item.dailyRate) : '', currency: item.currency ?? 'EUR' });
    setImagePreview(item.imageUrl);
    setShowItemModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target?.result as string; setImagePreview(url); setItemForm((f) => ({ ...f, imageUrl: url })); };
    reader.readAsDataURL(file);
  };

  const saveItem = async () => {
    setSavingItem(true);
    try {
      const input = { name: itemForm.name, description: itemForm.description || null, category: itemForm.category, imageUrl: itemForm.imageUrl || null, totalQuantity: itemForm.totalQuantity, dailyRate: itemForm.dailyRate ? parseFloat(itemForm.dailyRate) : null, currency: itemForm.currency || null };
      if (editingItem) {
        await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `mutation($id: ID!, $input: UpdateRentalItemInput!) { updateRentalItem(id: $id, input: $input) { ${ITEM_FIELDS} } }`, variables: { id: editingItem.id, input } }) });
      } else {
        await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `mutation($input: CreateRentalItemInput!) { createRentalItem(input: $input) { ${ITEM_FIELDS} } }`, variables: { input } }) });
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
    await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `mutation($id: ID!, $input: UpdateRentalItemInput!) { updateRentalItem(id: $id, input: $input) { id } }`, variables: { id: item.id, input: { isActive: !item.isActive } } }) });
    setSuccessMessage(item.isActive ? 'Item deactivated' : 'Item activated');
    await fetchItems();
  };

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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ query: `mutation($input: CreateRentalBookingInput!) { createRentalBooking(input: $input) { id } }`, variables: { input: { itemId: bookingItem.id, guestName: bookingForm.guestName, quantity: bookingForm.quantity, dueDate: bookingForm.dueDate || null, notes: bookingForm.notes || null } } }),
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
    if (!(await confirm({ message: t('rentals.confirmReturn'), confirmLabel: 'Confirm' }))) return;
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `mutation($bookingId: ID!) { returnRentalItem(bookingId: $bookingId) { id } }`, variables: { bookingId } }) });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      toast.success('Item marked as returned.');
      await Promise.all([fetchItems(), fetchBookings()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error returning item');
    }
  };

  const filteredItems = items.filter((item) =>
    searchQuery ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const categoryLabel = (cat: RentalCategory) => t(`rentals.category${cat.charAt(0) + cat.slice(1).toLowerCase()}` as never) || cat;

  const availabilityColor = (item: RentalItem) => {
    const ratio = item.availableQuantity / item.totalQuantity;
    if (ratio === 0) return '#FB7185';
    if (ratio < 0.4) return '#FBBF24';
    return '#4ADE80';
  };

  const thStyle: React.CSSProperties = { color: 'var(--text-muted)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 20px', textAlign: 'left' };
  const tdStyle: React.CSSProperties = { padding: '14px 20px', borderTop: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontSize: '13px' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <HotelSidebar />
      <main style={{ flex: 1, marginLeft: 'var(--sidebar-width, 280px)', padding: '32px', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t('rentals.title')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('rentals.subtitle')}</p>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.3)', color: '#FB7185', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#FB7185', cursor: 'pointer' }}>×</button>
          </div>
        )}
        {successMessage && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ADE80', fontSize: 13 }}>
            {successMessage}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', borderRadius: 12, padding: 4, width: 'fit-content', border: '1px solid var(--card-border)' }}>
          {(['catalog', 'active'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: activeTab === tab ? 'var(--gold)' : 'transparent',
                color: activeTab === tab ? '#1a1a14' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {tab === 'catalog' ? t('rentals.tabCatalog') : t('rentals.tabActiveRentals')}
              {tab === 'active' && bookings.length > 0 && (
                <span style={{ background: '#FB7185', color: '#fff', fontSize: 10, borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>
                  {bookings.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* CATALOG TAB */}
        {activeTab === 'catalog' && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '9px 12px 9px 34px', border: '1px solid var(--card-border)', borderRadius: 10, fontSize: 13, background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', width: 200 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setCategoryFilter('')}
                  style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: categoryFilter === '' ? 'none' : '1px solid var(--card-border)', background: categoryFilter === '' ? 'var(--gold)' : 'transparent', color: categoryFilter === '' ? '#1a1a14' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {t('rentals.allCategories')}
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: categoryFilter === cat ? 'none' : '1px solid var(--card-border)', background: categoryFilter === cat ? 'var(--gold)' : 'transparent', color: categoryFilter === cat ? '#1a1a14' : 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {CATEGORY_ICONS[cat]} {categoryLabel(cat)}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                  {t('rentals.includeInactive')}
                </label>
                <button
                  onClick={openCreateItem}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--gold)', color: '#1a1a14', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  {t('rentals.addItem')}
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
            ) : filteredItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
                <p style={{ fontWeight: 500, marginBottom: 4 }}>{t('rentals.noCatalog')}</p>
                <p style={{ fontSize: 12 }}>{t('rentals.noCatalogDesc')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
                {filteredItems.map((item) => (
                  <div key={item.id} style={{ background: 'var(--surface)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--card-border)', opacity: !item.isActive ? 0.6 : 1, transition: 'transform 0.15s, box-shadow 0.15s' }}>
                    <div style={{ position: 'relative', height: 160, background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 44 }}>{CATEGORY_ICONS[item.category]}</span>
                      )}
                      <div style={{ position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: '50%', background: availabilityColor(item), boxShadow: '0 0 0 2px var(--surface)' }} />
                      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 6, backdropFilter: 'blur(4px)' }}>
                        {CATEGORY_ICONS[item.category]} {categoryLabel(item.category)}
                      </div>
                      {!item.isActive && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 11, padding: '3px 10px', borderRadius: 8 }}>{t('common.inactive')}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 14 }}>
                      <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{item.name}</h3>
                      {item.description && <p style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>}

                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                          <span>{item.availableQuantity} {t('rentals.available')}</span>
                          <span>{t('rentals.of')} {item.totalQuantity}</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--background)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: availabilityColor(item), width: `${(item.availableQuantity / item.totalQuantity) * 100}%`, transition: 'width 0.3s' }} />
                        </div>
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 600, color: item.dailyRate != null ? 'var(--gold)' : '#4ADE80', marginBottom: 12 }}>
                        {item.dailyRate != null ? `${item.dailyRate} ${item.currency}${t('rentals.perDay')}` : t('rentals.free')}
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openRentModal(item)}
                          disabled={item.availableQuantity === 0 || !item.isActive}
                          style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: (item.availableQuantity === 0 || !item.isActive) ? 'var(--background)' : 'var(--gold)', color: (item.availableQuantity === 0 || !item.isActive) ? 'var(--text-muted)' : '#1a1a14', fontSize: 11, fontWeight: 600, cursor: (item.availableQuantity === 0 || !item.isActive) ? 'not-allowed' : 'pointer' }}
                        >
                          {t('rentals.rentOut')}
                        </button>
                        <button onClick={() => openEditItem(item)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>
                          {t('common.edit')}
                        </button>
                        <button onClick={() => toggleItemActive(item)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }} title={item.isActive ? t('rentals.deactivate') : t('rentals.reactivate')}>
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

        {/* ACTIVE RENTALS TAB */}
        {activeTab === 'active' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
            ) : bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <p style={{ fontWeight: 500, marginBottom: 4 }}>{t('rentals.noActiveRentals')}</p>
                <p style={{ fontSize: 12 }}>{t('rentals.noActiveRentalsDesc')}</p>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{t('rentals.item')}</th>
                      <th style={thStyle}>{t('rentals.guest')}</th>
                      <th style={thStyle}>{t('rentals.quantity')}</th>
                      <th style={thStyle}>{t('rentals.borrowedAt')}</th>
                      <th style={thStyle}>{t('rentals.dueDate')}</th>
                      <th style={thStyle}>{t('rentals.status')}</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => {
                      const isOverdue = booking.dueDate && new Date(booking.dueDate) < new Date() && booking.status === 'ACTIVE';
                      const displayStatus: RentalBookingStatus = isOverdue ? 'OVERDUE' : booking.status;
                      const cfg = STATUS_CONFIG[displayStatus];
                      const isHov = hoveredRow === booking.id;
                      return (
                        <tr key={booking.id} onMouseEnter={() => setHoveredRow(booking.id)} onMouseLeave={() => setHoveredRow(null)} style={{ background: isHov ? 'var(--surface-hover)' : 'transparent', transition: 'background 0.15s' }}>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {booking.item?.imageUrl ? (
                                <img src={booking.item.imageUrl} alt={booking.item?.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                  {booking.item ? CATEGORY_ICONS[booking.item.category] : '📦'}
                                </div>
                              )}
                              <div>
                                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{booking.item?.name ?? '—'}</p>
                                {booking.item && <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{categoryLabel(booking.item.category)}</p>}
                              </div>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 500 }}>{booking.guestName}</td>
                          <td style={tdStyle}>{booking.quantity}</td>
                          <td style={tdStyle}>{new Date(booking.borrowedAt).toLocaleDateString()}</td>
                          <td style={tdStyle}>
                            <span style={{ color: isOverdue ? '#FB7185' : 'var(--text-secondary)', fontWeight: isOverdue ? 600 : 400 }}>
                              {booking.dueDate ? new Date(booking.dueDate).toLocaleDateString() : '—'}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg }}>
                              {t(`rentals.status${displayStatus.charAt(0) + displayStatus.slice(1).toLowerCase()}` as never)}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <button onClick={() => markReturned(booking.id)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: '#1a1a14', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
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

      {/* Item Modal */}
      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: 'var(--sidebar-bg)', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--card-border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingItem ? t('rentals.editItem') : t('rentals.createItem')}
              </h2>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Image upload */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('rentals.image')}</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer', border: '2px dashed var(--card-border)', borderRadius: 10, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--background)', transition: 'border-color 0.15s' }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                      <div style={{ fontSize: 12 }}>{t('rentals.uploadImage')}</div>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('rentals.itemName')} *</label>
                <input type="text" value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Nintendo Switch" style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('rentals.itemDesc')}</label>
                <textarea value={itemForm.description} onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Short description..." style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('rentals.category')}</label>
                <select value={itemForm.category} onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value as RentalCategory }))} style={inputStyle}>
                  {CATEGORIES.map((cat) => <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {categoryLabel(cat)}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('rentals.quantity')}</label>
                <input type="number" min={1} value={itemForm.totalQuantity} onChange={(e) => setItemForm((f) => ({ ...f, totalQuantity: parseInt(e.target.value) || 1 }))} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('rentals.dailyRate')}</label>
                  <input type="number" min={0} step={0.01} value={itemForm.dailyRate} onChange={(e) => setItemForm((f) => ({ ...f, dailyRate: e.target.value }))} placeholder="0.00" style={inputStyle} />
                </div>
                <div style={{ width: 100 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('rentals.currency')}</label>
                  <input type="text" maxLength={3} value={itemForm.currency} onChange={(e) => setItemForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="EUR" style={{ ...inputStyle, textTransform: 'uppercase' }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowItemModal(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
              <button onClick={saveItem} disabled={savingItem || !itemForm.name} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'var(--gold)', color: '#1a1a14', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (savingItem || !itemForm.name) ? 0.5 : 1 }}>
                {savingItem ? t('common.saving') : (editingItem ? t('common.save') : t('common.create'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && bookingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: 'var(--sidebar-bg)', borderRadius: 16, width: '100%', maxWidth: 420, border: '1px solid var(--card-border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{t('rentals.createBooking')}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {CATEGORY_ICONS[bookingItem.category]} {bookingItem.name} <span style={{ color: 'var(--text-muted)' }}>({bookingItem.availableQuantity} {t('rentals.available')})</span>
              </p>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('rentals.guestName')} *</label>
                <input type="text" value={bookingForm.guestName} onChange={(e) => setBookingForm((f) => ({ ...f, guestName: e.target.value }))} placeholder="Guest full name" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('rentals.quantityRent')}</label>
                <input type="number" min={1} max={bookingItem.availableQuantity} value={bookingForm.quantity} onChange={(e) => setBookingForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('rentals.dueDate')}</label>
                <input type="date" value={bookingForm.dueDate} onChange={(e) => setBookingForm((f) => ({ ...f, dueDate: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{t('rentals.notes')}</label>
                <textarea value={bookingForm.notes} onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes..." style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBookingModal(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
              <button onClick={saveBooking} disabled={savingBooking || !bookingForm.guestName} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'var(--gold)', color: '#1a1a14', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (savingBooking || !bookingForm.guestName) ? 0.5 : 1 }}>
                {savingBooking ? t('common.processing') : t('rentals.rentOut')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
