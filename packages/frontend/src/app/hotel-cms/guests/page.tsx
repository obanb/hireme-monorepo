'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

interface GuestAddress {
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
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
  reservations?: Array<{
    id: string;
    status: string;
    checkInDate: string | null;
    checkOutDate: string | null;
    totalAmount: number | null;
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

type TabType = 'all' | 'active' | 'inactive';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const GUEST_FIELDS = `
  id email firstName lastName phone dateOfBirth birthPlace
  nationality citizenship passportNumber visaNumber purposeOfStay
  homeAddress { street city postalCode country }
  notes isActive version createdAt updatedAt
`;

const GUEST_WITH_RELATIONS = `
  ${GUEST_FIELDS}
  reservations { id status checkInDate checkOutDate totalAmount currency }
  vouchers { id number valueTotal valueRemaining currency active }
`;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function GuestsPage() {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
    if (!confirm(`Are you sure you want to delete ${guest.firstName} ${guest.lastName}?`)) return;

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

      setSuccessMessage('Guest deleted successfully');
      await fetchGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete guest');
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
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-stone-800 dark:text-stone-100 mb-2">{t('guests.title')}</h1>
            <p className="text-stone-600 dark:text-stone-300">{t('guests.subtitle')}</p>
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
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4">
              <div className="text-sm text-stone-500 dark:text-stone-400">Total Guests</div>
              <div className="text-2xl font-bold text-stone-800 dark:text-stone-100">{stats.total}</div>
            </div>
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4">
              <div className="text-sm text-stone-500 dark:text-stone-400">{t('common.active')}</div>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </div>
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4">
              <div className="text-sm text-stone-500 dark:text-stone-400">{t('common.inactive')}</div>
              <div className="text-2xl font-bold text-stone-400">{stats.inactive}</div>
            </div>
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4">
              <div className="text-sm text-stone-500 dark:text-stone-400">With Passport</div>
              <div className="text-2xl font-bold text-blue-600">{stats.withPassport}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('guests.searchPlaceholder')}
                  className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <button onClick={fetchGuests} className="px-4 py-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors">
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
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 mb-6">
            <div className="flex border-b border-stone-200 dark:border-stone-700">
              {(['all', 'active', 'inactive'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors capitalize ${
                    activeTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-stone-500 dark:text-stone-400">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                {t('common.loading')}
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">&#9786;</div>
                <h3 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">{t('guests.noGuests')}</h3>
                <p className="text-stone-500 dark:text-stone-400">
                  {searchQuery ? 'Try adjusting your search' : 'Create your first guest profile to get started'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">{t('common.name')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">{t('common.email')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">{t('common.phone')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">{t('guests.nationality')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">{t('guests.passportNumber')}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">{t('common.status')}</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-stone-800 dark:text-stone-100">
                          {guest.firstName || ''} {guest.lastName || ''}
                        </div>
                        {guest.dateOfBirth && (
                          <div className="text-xs text-stone-500 dark:text-stone-400">DOB: {formatDate(guest.dateOfBirth)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-stone-600 dark:text-stone-300">{guest.email}</td>
                      <td className="px-6 py-4 text-stone-600 dark:text-stone-300">{guest.phone || '-'}</td>
                      <td className="px-6 py-4 text-stone-600 dark:text-stone-300">{guest.nationality || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-stone-700 dark:text-stone-300">{guest.passportNumber || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          guest.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                        }`}>
                          {guest.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openDetailModal(guest)} className="px-2 py-1 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700 sticky top-0 bg-white dark:bg-stone-800 z-10">
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">{editingGuest ? t('guests.editGuest') : t('guests.addGuest')}</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('guests.firstName')}</label>
                    <input type="text" value={guestForm.firstName} onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('guests.lastName')}</label>
                    <input type="text" value={guestForm.lastName} onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('common.email')} *</label>
                    <input type="email" value={guestForm.email} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('common.phone')}</label>
                    <input type="tel" value={guestForm.phone} onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('guests.dateOfBirth')}</label>
                    <input type="date" value={guestForm.dateOfBirth} onChange={(e) => setGuestForm({ ...guestForm, dateOfBirth: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                </div>
              </div>

              {/* Identity */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">Identity & Travel</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('guests.nationality')}</label>
                    <input type="text" value={guestForm.nationality} onChange={(e) => setGuestForm({ ...guestForm, nationality: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" placeholder="e.g., Czech" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Citizenship</label>
                    <input type="text" value={guestForm.citizenship} onChange={(e) => setGuestForm({ ...guestForm, citizenship: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" placeholder="e.g., CZ" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Birth Place</label>
                    <input type="text" value={guestForm.birthPlace} onChange={(e) => setGuestForm({ ...guestForm, birthPlace: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('guests.passportNumber')}</label>
                    <input type="text" value={guestForm.passportNumber} onChange={(e) => setGuestForm({ ...guestForm, passportNumber: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Visa Number</label>
                    <input type="text" value={guestForm.visaNumber} onChange={(e) => setGuestForm({ ...guestForm, visaNumber: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Purpose of Stay</label>
                    <input type="text" value={guestForm.purposeOfStay} onChange={(e) => setGuestForm({ ...guestForm, purposeOfStay: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" placeholder="e.g., Tourism, Business" />
                  </div>
                </div>
              </div>

              {/* Home Address */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">Home Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Street</label>
                    <input type="text" value={guestForm.homeStreet} onChange={(e) => setGuestForm({ ...guestForm, homeStreet: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">City</label>
                    <input type="text" value={guestForm.homeCity} onChange={(e) => setGuestForm({ ...guestForm, homeCity: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Postal Code</label>
                    <input type="text" value={guestForm.homePostalCode} onChange={(e) => setGuestForm({ ...guestForm, homePostalCode: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Country</label>
                    <input type="text" value={guestForm.homeCountry} onChange={(e) => setGuestForm({ ...guestForm, homeCountry: e.target.value })} className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100" placeholder="e.g., CZ, DE, US" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">{t('wellness.notes')}</h3>
                <textarea
                  value={guestForm.notes}
                  onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100"
                  rows={3}
                  placeholder="Internal notes about the guest..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
                <button
                  onClick={() => { setShowGuestModal(false); setEditingGuest(null); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Guest Profile</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedGuest.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}`}>
                  {selectedGuest.isActive ? t('common.active') : t('common.inactive')}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('common.name')}</div>
                  <div className="font-semibold text-lg text-stone-900 dark:text-stone-100">{selectedGuest.firstName} {selectedGuest.lastName}</div>
                </div>
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('common.email')}</div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100">{selectedGuest.email}</div>
                </div>
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('common.phone')}</div>
                  <div className="text-stone-900 dark:text-stone-100">{selectedGuest.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('guests.dateOfBirth')}</div>
                  <div className="text-stone-900 dark:text-stone-100">{formatDate(selectedGuest.dateOfBirth)}</div>
                </div>
              </div>

              {/* Identity */}
              <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-lg">
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">Identity</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-stone-500 dark:text-stone-400">{t('guests.nationality')}</div>
                    <div className="text-stone-900 dark:text-stone-100">{selectedGuest.nationality || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 dark:text-stone-400">Citizenship</div>
                    <div className="text-stone-900 dark:text-stone-100">{selectedGuest.citizenship || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 dark:text-stone-400">Birth Place</div>
                    <div className="text-stone-900 dark:text-stone-100">{selectedGuest.birthPlace || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 dark:text-stone-400">{t('guests.passportNumber')}</div>
                    <div className="font-mono text-stone-900 dark:text-stone-100">{selectedGuest.passportNumber || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 dark:text-stone-400">Visa Number</div>
                    <div className="font-mono text-stone-900 dark:text-stone-100">{selectedGuest.visaNumber || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 dark:text-stone-400">Purpose of Stay</div>
                    <div className="text-stone-900 dark:text-stone-100">{selectedGuest.purposeOfStay || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Home Address */}
              {selectedGuest.homeAddress && (selectedGuest.homeAddress.street || selectedGuest.homeAddress.city) && (
                <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-lg">
                  <div className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2 uppercase tracking-wider">Home Address</div>
                  <div className="text-stone-900 dark:text-stone-100">
                    {[selectedGuest.homeAddress.street, selectedGuest.homeAddress.city, selectedGuest.homeAddress.postalCode, selectedGuest.homeAddress.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}

              {/* Reservations */}
              {selectedGuest.reservations && selectedGuest.reservations.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">Reservations ({selectedGuest.reservations.length})</div>
                  <div className="space-y-2">
                    {selectedGuest.reservations.map((r) => (
                      <div key={r.id} className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-between">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                            r.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                            r.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{r.status}</span>
                          {r.checkInDate && <span className="text-sm text-stone-600 dark:text-stone-300">{formatDate(r.checkInDate)} - {formatDate(r.checkOutDate)}</span>}
                        </div>
                        {r.totalAmount != null && (
                          <div className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                            {r.totalAmount.toLocaleString('cs-CZ')} {r.currency}
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
                  <div className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">Vouchers ({selectedGuest.vouchers.length})</div>
                  <div className="space-y-2">
                    {selectedGuest.vouchers.map((v) => (
                      <div key={v.id} className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="font-mono text-sm mr-2 text-stone-900 dark:text-stone-100">{v.number}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.active ? 'bg-green-100 text-green-700' : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}`}>
                            {v.active ? t('common.active') : t('common.inactive')}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
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
                  <div className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2 uppercase tracking-wider">{t('wellness.notes')}</div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-stone-700 dark:text-stone-300">{selectedGuest.notes}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
                <button onClick={() => setShowDetailModal(false)} className="flex-1 px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300">
                  Close
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
    </div>
  );
}
