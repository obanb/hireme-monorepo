'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

interface RoomType {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

interface RoomTypeFormData {
  code: string;
  name: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const emptyFormData: RoomTypeFormData = {
  code: '',
  name: '',
};

export default function RoomTypesPage() {
  const { t } = useLocale();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [formData, setFormData] = useState<RoomTypeFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<RoomType | null>(null);

  const fetchRoomTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            query ListRoomTypes($includeInactive: Boolean) {
              roomTypes(includeInactive: $includeInactive) {
                id
                code
                name
                isActive
                version
                createdAt
                updatedAt
              }
            }
          `,
          variables: { includeInactive },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to fetch room types');
      }

      setRoomTypes(result.data?.roomTypes ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room types');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchRoomTypes();
  }, [fetchRoomTypes]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const filteredRoomTypes = roomTypes.filter((roomType) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        roomType.code.toLowerCase().includes(query) ||
        roomType.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const openCreateModal = () => {
    setEditingRoomType(null);
    setFormData(emptyFormData);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (roomType: RoomType) => {
    setEditingRoomType(roomType);
    setFormData({
      code: roomType.code,
      name: roomType.name,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoomType(null);
    setFormData(emptyFormData);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      if (editingRoomType) {
        // Update existing room type
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation UpdateRoomType($id: ID!, $input: UpdateRoomTypeInput!) {
                updateRoomType(id: $id, input: $input) {
                  roomType {
                    id
                    code
                    name
                    isActive
                    version
                  }
                }
              }
            `,
            variables: {
              id: editingRoomType.id,
              input: {
                code: formData.code,
                name: formData.name,
              },
            },
          }),
        });

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message ?? 'Failed to update room type');
        }

        setSuccessMessage(`Room type "${formData.name}" updated successfully`);
      } else {
        // Create new room type
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation CreateRoomType($input: CreateRoomTypeInput!) {
                createRoomType(input: $input) {
                  roomType {
                    id
                    code
                    name
                    isActive
                    version
                  }
                }
              }
            `,
            variables: {
              input: {
                code: formData.code,
                name: formData.name,
              },
            },
          }),
        });

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message ?? 'Failed to create room type');
        }

        setSuccessMessage(`Room type "${formData.name}" created successfully`);
      }

      closeModal();
      fetchRoomTypes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save room type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roomType: RoomType) => {
    setSaving(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation DeleteRoomType($id: ID!) {
              deleteRoomType(id: $id) {
                success
              }
            }
          `,
          variables: { id: roomType.id },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to delete room type');
      }

      setSuccessMessage(`Room type "${roomType.name}" deactivated successfully`);
      setDeleteConfirm(null);
      fetchRoomTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room type');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (roomType: RoomType) => {
    setSaving(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation UpdateRoomType($id: ID!, $input: UpdateRoomTypeInput!) {
              updateRoomType(id: $id, input: $input) {
                roomType {
                  id
                  isActive
                }
              }
            }
          `,
          variables: {
            id: roomType.id,
            input: { isActive: true },
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to reactivate room type');
      }

      setSuccessMessage(`Room type "${roomType.name}" reactivated successfully`);
      fetchRoomTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate room type');
    } finally {
      setSaving(false);
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
              <h1 className="text-4xl font-black text-stone-900 dark:text-stone-100 mb-2">{t('roomTypes.title')}</h1>
              <p className="text-stone-500 dark:text-stone-400">{t('roomTypes.subtitle')}</p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-sm font-bold flex items-center gap-2"
            >
              <span className="text-lime-400">+</span> {t('roomTypes.addRoomType')}
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-lime-50 border-2 border-lime-200 rounded-2xl text-lime-700 flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-lime-500 hover:text-lime-700">
                &times;
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                &times;
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder={t('roomTypes.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>

              {/* Include Inactive Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="w-4 h-4 text-lime-600 rounded focus:ring-lime-400"
                />
                <span className="text-sm text-stone-700 dark:text-stone-300 font-medium">{t('roomTypes.showInactive')}</span>
              </label>

              {/* Refresh */}
              <button
                onClick={fetchRoomTypes}
                disabled={loading}
                className="px-4 py-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors flex items-center gap-2 font-medium"
              >
                <span className={loading ? 'animate-spin' : ''}>&#x21bb;</span>
                {t('common.refresh')}
              </button>
            </div>
          </div>

          {/* Room Types Table */}
          <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-stone-500 dark:text-stone-400">
                <div className="animate-pulse">{t('roomTypes.loadingRoomTypes')}</div>
              </div>
            ) : filteredRoomTypes.length === 0 ? (
              <div className="p-12 text-center text-stone-500 dark:text-stone-400">
                <div className="text-4xl mb-4">&#9703;</div>
                <p className="text-lg font-bold">{t('roomTypes.noRoomTypes')}</p>
                <p className="text-sm mt-1">
                  {roomTypes.length === 0
                    ? t('roomTypes.createFirst')
                    : t('common.tryAdjusting')}
                </p>
                {roomTypes.length === 0 && (
                  <button
                    onClick={openCreateModal}
                    className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 font-bold"
                  >
                    {t('roomTypes.addFirst')}
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-stone-50 dark:bg-stone-700 border-b border-stone-200 dark:border-stone-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('common.code')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('common.name')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                  {filteredRoomTypes.map((roomType) => (
                    <tr key={roomType.id} className={`hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors ${!roomType.isActive ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm bg-stone-100 dark:bg-stone-700 px-2 py-1 rounded-lg">
                          {roomType.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-stone-900 dark:text-stone-100">{roomType.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded-lg ${
                            roomType.isActive
                              ? 'bg-lime-100 text-lime-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {roomType.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(roomType)}
                            className="px-3 py-1 text-sm text-lime-600 hover:bg-lime-50 rounded-lg transition-colors font-bold"
                          >
                            {t('common.edit')}
                          </button>
                          {roomType.isActive ? (
                            <button
                              onClick={() => setDeleteConfirm(roomType)}
                              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                            >
                              {t('common.deactivate')}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(roomType)}
                              disabled={saving}
                              className="px-3 py-1 text-sm text-lime-600 hover:bg-lime-50 rounded-lg transition-colors disabled:opacity-50 font-medium"
                            >
                              {t('common.reactivate')}
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

          {/* Count */}
          {!loading && filteredRoomTypes.length > 0 && (
            <div className="mt-4 text-sm text-stone-500 dark:text-stone-400 text-center">
              Showing {filteredRoomTypes.length} of {roomTypes.length} room types
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700">
              <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
                {editingRoomType ? t('roomTypes.editRoomType') : t('roomTypes.addNew')}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm">
                  {formError}
                </div>
              )}

              {/* Code */}
              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {t('common.code')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SINGLE"
                  maxLength={20}
                  className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400 font-mono uppercase dark:bg-stone-800 dark:text-stone-100"
                />
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{t('roomTypes.uniqueId')}</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {t('common.name')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Single Room"
                  maxLength={100}
                  className="w-full px-4 py-2 border-2 border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border-2 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors font-bold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 font-bold"
                >
                  {saving ? t('common.saving') : editingRoomType ? t('common.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-stone-800 rounded-3xl border-2 border-stone-200 dark:border-stone-700 shadow-2xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 mb-2">
              {t('roomTypes.deactivateTitle')}
            </h2>
            <p className="text-stone-600 dark:text-stone-300 mb-6">
              Are you sure you want to deactivate &quot;{deleteConfirm.name}&quot;? This room type will no longer be available for selection.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border-2 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors font-bold"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 font-bold"
              >
                {saving ? t('common.deactivating') : t('common.deactivate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
