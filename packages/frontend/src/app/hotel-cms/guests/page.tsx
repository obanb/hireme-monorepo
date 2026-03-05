'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import ComposeEmailModal from '@/components/ComposeEmailModal';
import { useLocale } from '@/context/LocaleContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

interface GuestAddress {
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}

interface GuestTier {
  tier: { id: string; name: string; color: string; code: string } | null;
  reservationCount: number;
  totalSpend: number;
}

interface Guest {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  birthPlace: string | null;
  nationality: string | null;
  citizenship: string | null;
  passportNumber: string | null;
  visaNumber: string | null;
  purposeOfStay: string | null;
  homeAddress: GuestAddress | null;
  notes: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  tierInfo?: GuestTier | null;
  reservations?: Array<{
    id: string;
    status: string;
    checkInDate: string | null;
    checkOutDate: string | null;
    totalPrice: number | null;
    payedPrice: number | null;
    currency: string | null;
  }>;
  vouchers?: Array<{
    id: string;
    number: string;
    valueTotal: number;
    valueRemaining: number;
    currency: string;
    active: boolean;
  }>;
}

function TierBadge({ tier }: { tier: GuestTier['tier'] }) {
  if (!tier) return <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">—</span>;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white  whitespace-nowrap"
      style={{ backgroundColor: tier.color }}
    >
      ★ {tier.name}
    </span>
  );
}

type TabType = 'all' | 'active' | 'inactive';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const GUEST_FIELDS = `
  id email firstName lastName phone dateOfBirth birthPlace
  nationality citizenship passportNumber visaNumber purposeOfStay
  homeAddress { street city postalCode country }
  notes isActive version createdAt updatedAt
  tierInfo { tier { id name color code } reservationCount totalSpend }
`;

const GUEST_WITH_RELATIONS = `
  ${GUEST_FIELDS}
  reservations { id status checkInDate checkOutDate totalPrice payedPrice currency }
  vouchers { id number valueTotal valueRemaining currency active }
`;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function GuestsPage() {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const [guestForm, setGuestForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    birthPlace: '',
    nationality: '',
    citizenship: '',
    passportNumber: '',
    visaNumber: '',
    purposeOfStay: '',
    homeStreet: '',
    homeCity: '',
    homePostalCode: '',
    homeCountry: '',
    notes: '',
  });

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query { guests { ${GUEST_FIELDS} } }`,
        }),
      });
      const result = await response.json();
      if (!result.errors && result.data?.guests) {
        setGuests(result.data.guests);
      } else {
        setError(result.errors?.[0]?.message || 'Failed to fetch guests');
      }
    } catch {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const fetchGuestDetail = async (id: string) => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query($id: ID!) { guest(id: $id) { ${GUEST_WITH_RELATIONS} } }`,
          variables: { id },
        }),
      });
      const result = await response.json();
      if (!result.errors && result.data?.guest) {
        return result.data.guest as Guest;
      }
    } catch { /* ignore */ }
    return null;
  };

  const filteredGuests = guests.filter((g) => {
    if (activeTab === 'active' && !g.isActive) return false;
    if (activeTab === 'inactive' && g.isActive) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = `${g.firstName || ''} ${g.lastName || ''}`.toLowerCase().includes(q);
      const matchEmail = g.email.toLowerCase().includes(q);
      const matchNationality = g.nationality?.toLowerCase().includes(q);
      const matchPassport = g.passportNumber?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchNationality && !matchPassport) return false;
    }

    return true;
  });

  const handleCreateGuest = async () => {
    setLoading(true);
    try {
      const input: Record<string, unknown> = {
        email: guestForm.email,
        firstName: guestForm.firstName || undefined,
        lastName: guestForm.lastName || undefined,
        phone: guestForm.phone || undefined,
        dateOfBirth: guestForm.dateOfBirth || undefined,
        birthPlace: guestForm.birthPlace || undefined,
        nationality: guestForm.nationality || undefined,
        citizenship: guestForm.citizenship || undefined,
        passportNumber: guestForm.passportNumber || undefined,
        visaNumber: guestForm.visaNumber || undefined,
        purposeOfStay: guestForm.purposeOfStay || undefined,
        notes: guestForm.notes || undefined,
      };

      if (guestForm.homeStreet || guestForm.homeCity || guestForm.homePostalCode || guestForm.homeCountry) {
        input.homeAddress = {
          street: guestForm.homeStreet || undefined,
          city: guestForm.homeCity || undefined,
          postalCode: guestForm.homePostalCode || undefined,
          country: guestForm.homeCountry || undefined,
        };
      }

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($input: CreateGuestInput!) { createGuest(input: $input) { guest { ${GUEST_FIELDS} } } }`,
          variables: { input },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message);

      setSuccessMessage('Guest created successfully');
      setShowGuestModal(false);
      resetForm();
      await fetchGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create guest');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGuest = async () => {
    if (!editingGuest) return;
    setLoading(true);
    try {
      const input: Record<string, unknown> = {
        email: guestForm.email || undefined,
        firstName: guestForm.firstName,
        lastName: guestForm.lastName,
        phone: guestForm.phone,
        dateOfBirth: guestForm.dateOfBirth || undefined,
        birthPlace: guestForm.birthPlace,
        nationality: guestForm.nationality,
        citizenship: guestForm.citizenship,
        passportNumber: guestForm.passportNumber,
        visaNumber: guestForm.visaNumber,
        purposeOfStay: guestForm.purposeOfStay,
        notes: guestForm.notes,
        homeAddress: {
          street: guestForm.homeStreet,
          city: guestForm.homeCity,
          postalCode: guestForm.homePostalCode,
          country: guestForm.homeCountry,
        },
      };

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($id: ID!, $input: UpdateGuestInput!) { updateGuest(id: $id, input: $input) { guest { ${GUEST_FIELDS} } } }`,
          variables: { id: editingGuest.id, input },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message);

      setSuccessMessage('Guest updated successfully');
      setShowGuestModal(false);
      setEditingGuest(null);
      resetForm();
      await fetchGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update guest');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGuest = async (guest: Guest) => {
    if (!(await confirm({ message: `Delete ${guest.firstName} ${guest.lastName}?`, confirmLabel: 'Delete', danger: true }))) return;

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($id: ID!) { deleteGuest(id: $id) { success } }`,
          variables: { id: guest.id },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message);

      toast.success('Guest deleted.');
      await fetchGuests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete guest');
    }
  };

  const handleDownloadPoliceReport = async (guest: Guest) => {
    try {
      const backendBase = GRAPHQL_ENDPOINT.replace('/graphql', '');
      const response = await fetch(`${backendBase}/api/guests/${guest.id}/police-report`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `police-report-${guest.lastName || 'guest'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download report');
    }
  };

  const resetForm = () => {
    setGuestForm({
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: '',
      birthPlace: '',
      nationality: '',
      citizenship: '',
      passportNumber: '',
      visaNumber: '',
      purposeOfStay: '',
      homeStreet: '',
      homeCity: '',
      homePostalCode: '',
      homeCountry: '',
      notes: '',
    });
  };

  const openEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setGuestForm({
      email: guest.email,
      firstName: guest.firstName || '',
      lastName: guest.lastName || '',
      phone: guest.phone || '',
      dateOfBirth: guest.dateOfBirth || '',
      birthPlace: guest.birthPlace || '',
      nationality: guest.nationality || '',
      citizenship: guest.citizenship || '',
      passportNumber: guest.passportNumber || '',
      visaNumber: guest.visaNumber || '',
      purposeOfStay: guest.purposeOfStay || '',
      homeStreet: guest.homeAddress?.street || '',
      homeCity: guest.homeAddress?.city || '',
      homePostalCode: guest.homeAddress?.postalCode || '',
      homeCountry: guest.homeAddress?.country || '',
      notes: guest.notes || '',
    });
    setShowGuestModal(true);
  };

  const openDetailModal = async (guest: Guest) => {
    const detailed = await fetchGuestDetail(guest.id);
    setSelectedGuest(detailed || guest);
    setShowDetailModal(true);
  };

  const stats = {
    total: guests.length,
    active: guests.filter((g) => g.isActive).length,
    inactive: guests.filter((g) => !g.isActive).length,
    withPassport: guests.filter((g) => g.passportNumber).length,
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main className="flex-1 px-8 py-8" style={{ marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }} className="text-[2.75rem] font-bold tracking-tight mb-2">{t('guests.title')}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>{t('guests.subtitle')}</p>
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">&times;</button>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">&times;</button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">Total Guests</div>
              <div style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }} className="text-[1.75rem] font-bold tracking-tight tabular-nums">{stats.total}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('common.active')}</div>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('common.inactive')}</div>
              <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }} className="text-[1.75rem] font-bold tracking-tight tabular-nums">{stats.inactive}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">With Passport</div>
              <div className="text-2xl font-bold text-blue-600">{stats.withPassport}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-[var(--surface)] rounded-xl  border border-[var(--card-border)] p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('guests.searchPlaceholder')}
                  className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500  "
                />
              </div>
              <button onClick={fetchGuests} style={{ color: "var(--text-secondary)" }} className="px-4 py-2 rounded-md text-[13px] hover:opacity-70 transition-opacity">
                Refresh
              </button>
              <button
                onClick={() => { setEditingGuest(null); resetForm(); setShowGuestModal(true); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + {t('guests.addGuest')}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-[var(--surface)] rounded-xl  border border-[var(--card-border)] mb-6">
            <div className="flex border-b border-[var(--card-border)]">
              {(['all', 'active', 'inactive'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors capitalize ${
                    activeTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-[var(--text-secondary)] hover:opacity-70'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-[var(--surface)] rounded-xl  border border-[var(--card-border)] overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                {t('common.loading')}
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">&#9786;</div>
                <h3 style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }} className="text-[18px] font-semibold leading-none mb-2">{t('guests.noGuests')}</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  {searchQuery ? 'Try adjusting your search' : 'Create your first guest profile to get started'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-[var(--background)] border-b border-[var(--card-border)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('common.name')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('common.email')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('common.phone')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('guests.nationality')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('guests.passportNumber')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('common.status')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id} className="transition-colors" onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-6 py-4">
                        <div style={{ color: "var(--text-primary)" }} className="font-semibold">
                          {guest.firstName || ''} {guest.lastName || ''}
                        </div>
                        {guest.dateOfBirth && (
                          <div className="text-xs text-[var(--text-muted)]">DOB: {formatDate(guest.dateOfBirth)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">{guest.email}</td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">{guest.phone || '-'}</td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">{guest.nationality || '-'}</td>
                      <td className="px-6 py-4">
                        <span style={{ color: "var(--text-secondary)" }} className="font-mono text-[13px]">{guest.passportNumber || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          guest.isActive ? 'bg-[rgba(74,222,128,0.10)] text-[#4ADE80]' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--card-border)]'
                        }`}>
                          {guest.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <TierBadge tier={guest.tierInfo?.tier ?? null} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openDetailModal(guest)} style={{ color: "var(--text-secondary)" }} className="px-2 py-1 text-[12px] rounded-md hover:opacity-70 transition-opacity">
                            {t('common.view')}
                          </button>
                          <button onClick={() => openEditGuest(guest)} className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                            {t('common.edit')}
                          </button>
                          <button onClick={() => handleDownloadPoliceReport(guest)} className="px-2 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded">
                            PDF
                          </button>
                          {guest.isActive && (
                            <button onClick={() => handleDeleteGuest(guest)} className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] rounded-xl  w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--card-border)] sticky top-0 bg-[var(--surface)] z-10">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{editingGuest ? t('guests.editGuest') : t('guests.addGuest')}</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal */}
              <div>
                <h3 style={{ color: "var(--text-muted)" }} className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('guests.firstName')}</label>
                    <input type="text" value={guestForm.firstName} onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('guests.lastName')}</label>
                    <input type="text" value={guestForm.lastName} onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('common.email')} *</label>
                    <input type="email" value={guestForm.email} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('common.phone')}</label>
                    <input type="tel" value={guestForm.phone} onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('guests.dateOfBirth')}</label>
                    <input type="date" value={guestForm.dateOfBirth} onChange={(e) => setGuestForm({ ...guestForm, dateOfBirth: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                </div>
              </div>

              {/* Identity */}
              <div>
                <h3 style={{ color: "var(--text-muted)" }} className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-3">Identity & Travel</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('guests.nationality')}</label>
                    <input type="text" value={guestForm.nationality} onChange={(e) => setGuestForm({ ...guestForm, nationality: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " placeholder="e.g., Czech" />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">Citizenship</label>
                    <input type="text" value={guestForm.citizenship} onChange={(e) => setGuestForm({ ...guestForm, citizenship: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " placeholder="e.g., CZ" />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">Birth Place</label>
                    <input type="text" value={guestForm.birthPlace} onChange={(e) => setGuestForm({ ...guestForm, birthPlace: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">{t('guests.passportNumber')}</label>
                    <input type="text" value={guestForm.passportNumber} onChange={(e) => setGuestForm({ ...guestForm, passportNumber: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">Visa Number</label>
                    <input type="text" value={guestForm.visaNumber} onChange={(e) => setGuestForm({ ...guestForm, visaNumber: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">Purpose of Stay</label>
                    <input type="text" value={guestForm.purposeOfStay} onChange={(e) => setGuestForm({ ...guestForm, purposeOfStay: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " placeholder="e.g., Tourism, Business" />
                  </div>
                </div>
              </div>

              {/* Home Address */}
              <div>
                <h3 style={{ color: "var(--text-muted)" }} className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-3">Home Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">Street</label>
                    <input type="text" value={guestForm.homeStreet} onChange={(e) => setGuestForm({ ...guestForm, homeStreet: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">City</label>
                    <input type="text" value={guestForm.homeCity} onChange={(e) => setGuestForm({ ...guestForm, homeCity: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">Postal Code</label>
                    <input type="text" value={guestForm.homePostalCode} onChange={(e) => setGuestForm({ ...guestForm, homePostalCode: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">Country</label>
                    <input type="text" value={guestForm.homeCountry} onChange={(e) => setGuestForm({ ...guestForm, homeCountry: e.target.value })} className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  " placeholder="e.g., CZ, DE, US" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 style={{ color: "var(--text-muted)" }} className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-3">{t('wellness.notes')}</h3>
                <textarea
                  value={guestForm.notes}
                  onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg  "
                  rows={3}
                  placeholder="Internal notes about the guest..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[var(--card-border)]">
                <button
                  onClick={() => { setShowGuestModal(false); setEditingGuest(null); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-[var(--card-border)] rounded-lg text-[var(--text-secondary)] "
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={editingGuest ? handleUpdateGuest : handleCreateGuest}
                  disabled={loading || !guestForm.email}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
                >
                  {loading ? t('common.saving') : editingGuest ? t('common.update') : t('common.create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedGuest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] rounded-xl  w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Guest Profile</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedGuest.isActive ? 'bg-[rgba(74,222,128,0.10)] text-[#4ADE80]' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--card-border)]'}`}>
                  {selectedGuest.isActive ? t('common.active') : t('common.inactive')}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('common.name')}</div>
                  <div className="font-semibold text-lg text-[var(--text-primary)]">{selectedGuest.firstName} {selectedGuest.lastName}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('common.email')}</div>
                  <div style={{ color: 'var(--text-primary)' }} className="font-semibold">{selectedGuest.email}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('common.phone')}</div>
                  <div style={{ color: 'var(--text-primary)' }}>{selectedGuest.phone || '-'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('guests.dateOfBirth')}</div>
                  <div style={{ color: 'var(--text-primary)' }}>{formatDate(selectedGuest.dateOfBirth)}</div>
                </div>
              </div>

              {/* Tier */}
              {selectedGuest.tierInfo && (
                <div className="p-4 rounded-xl border-2" style={{ borderColor: selectedGuest.tierInfo.tier?.color ?? '#e5e7eb', backgroundColor: (selectedGuest.tierInfo.tier?.color ?? '#6366f1') + '10' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedGuest.tierInfo.tier ? (
                        <>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-black shadow" style={{ backgroundColor: selectedGuest.tierInfo.tier.color }}>★</div>
                          <div>
                            <TierBadge tier={selectedGuest.tierInfo.tier} />
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">Current loyalty tier</div>
                          </div>
                        </>
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">No tier achieved yet</div>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div style={{ color: 'var(--text-primary)' }} className="font-semibold">{selectedGuest.tierInfo.reservationCount} stays</div>
                      <div style={{ color: 'var(--text-muted)' }}>{selectedGuest.tierInfo.totalSpend.toLocaleString('cs-CZ')} total spend</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Identity */}
              <div className="p-4 bg-[var(--background)] rounded-lg">
                <div style={{ color: "var(--text-muted)" }} className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-3">Identity</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('guests.nationality')}</div>
                    <div style={{ color: 'var(--text-primary)' }}>{selectedGuest.nationality || '-'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">Citizenship</div>
                    <div style={{ color: 'var(--text-primary)' }}>{selectedGuest.citizenship || '-'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">Birth Place</div>
                    <div style={{ color: 'var(--text-primary)' }}>{selectedGuest.birthPlace || '-'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">{t('guests.passportNumber')}</div>
                    <div className="font-mono text-[var(--text-primary)]">{selectedGuest.passportNumber || '-'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">Visa Number</div>
                    <div className="font-mono text-[var(--text-primary)]">{selectedGuest.visaNumber || '-'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-[13px]">Purpose of Stay</div>
                    <div style={{ color: 'var(--text-primary)' }}>{selectedGuest.purposeOfStay || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Home Address */}
              {selectedGuest.homeAddress && (selectedGuest.homeAddress.street || selectedGuest.homeAddress.city) && (
                <div className="p-4 bg-[var(--background)] rounded-lg">
                  <div className="text-sm font-semibold text-[var(--text-primary)]  mb-2 uppercase tracking-wider">Home Address</div>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {[selectedGuest.homeAddress.street, selectedGuest.homeAddress.city, selectedGuest.homeAddress.postalCode, selectedGuest.homeAddress.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}

              {/* Reservations */}
              {selectedGuest.reservations && selectedGuest.reservations.length > 0 && (
                <div>
                  <div style={{ color: "var(--text-muted)" }} className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-3">Reservations ({selectedGuest.reservations.length})</div>
                  <div className="space-y-2">
                    {selectedGuest.reservations.map((r) => (
                      <div key={r.id} className="p-3 rounded-md flex items-center justify-between" style={{ background: "rgba(96,184,212,0.08)", border: "1px solid rgba(96,184,212,0.15)" }}>
                        <div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                            r.status === 'CONFIRMED' ? 'bg-[rgba(74,222,128,0.10)] text-[#4ADE80]' :
                            r.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{r.status}</span>
                          {r.checkInDate && <span style={{ color: 'var(--text-secondary)' }} className="text-[13px]">{formatDate(r.checkInDate)} - {formatDate(r.checkOutDate)}</span>}
                        </div>
                        {r.totalPrice != null && (
                          <div className="text-sm text-[var(--text-primary)] text-right">
                            <div className="font-semibold">{r.totalPrice.toLocaleString('cs-CZ')} {r.currency}</div>
                            {r.payedPrice != null && r.payedPrice > 0 && (
                              <div className="text-xs text-[var(--text-muted)]">paid: {r.payedPrice.toLocaleString('cs-CZ')}</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vouchers */}
              {selectedGuest.vouchers && selectedGuest.vouchers.length > 0 && (
                <div>
                  <div style={{ color: "var(--text-muted)" }} className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-3">Vouchers ({selectedGuest.vouchers.length})</div>
                  <div className="space-y-2">
                    {selectedGuest.vouchers.map((v) => (
                      <div key={v.id} className="p-3 rounded-md flex items-center justify-between" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.15)" }}>
                        <div>
                          <span className="font-mono text-sm mr-2 text-[var(--text-primary)]">{v.number}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.active ? 'bg-[rgba(74,222,128,0.10)] text-[#4ADE80]' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--card-border)]'}`}>
                            {v.active ? t('common.active') : t('common.inactive')}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {v.valueRemaining.toLocaleString('cs-CZ')} / {v.valueTotal.toLocaleString('cs-CZ')} {v.currency}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedGuest.notes && (
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]  mb-2 uppercase tracking-wider">{t('wellness.notes')}</div>
                  <div className="p-4 rounded-md" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)", color: "var(--text-secondary)" }}>{selectedGuest.notes}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[var(--card-border)]">
                <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 border border-[var(--card-border)] rounded-lg text-[var(--text-secondary)] ">
                  Close
                </button>
                <button
                  onClick={() => setShowEmailModal(true)}
                  style={{ background: "var(--gold)", color: "var(--background)" }} className="px-4 py-2 rounded-md flex items-center gap-2 font-semibold text-[13px] hover:opacity-90 transition-opacity"
                >
                  <span>✉</span> {t('email.sendEmail')}
                </button>
                <button
                  onClick={() => { setShowDetailModal(false); handleDownloadPoliceReport(selectedGuest); }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Police Report PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email compose modal */}
      {showEmailModal && selectedGuest && (
        <ComposeEmailModal
          to={selectedGuest.email}
          toName={[selectedGuest.firstName, selectedGuest.lastName].filter(Boolean).join(' ') || undefined}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}
