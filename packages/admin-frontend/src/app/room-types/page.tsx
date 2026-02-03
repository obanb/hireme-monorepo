'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                &larr; Dashboard
              </Link>
              <div className="h-6 w-px bg-slate-300" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Room Types</h1>
                <p className="text-sm text-slate-600 mt-1">Manage room type configurations</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              + Add Room Type
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
              &times;
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              &times;
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Include Inactive Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Show inactive</span>
            </label>

            {/* Refresh */}
            <button
              onClick={fetchRoomTypes}
              disabled={loading}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <span className={loading ? 'animate-spin' : ''}>&#x21bb;</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Room Types Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="animate-pulse">Loading room types...</div>
            </div>
          ) : filteredRoomTypes.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <div className="text-4xl mb-4">&#x1F3E8;</div>
              <p className="text-lg font-medium">No room types found</p>
              <p className="text-sm mt-1">
                {roomTypes.length === 0
                  ? 'Create your first room type to get started'
                  : 'Try adjusting your search'}
              </p>
              {roomTypes.length === 0 && (
                <button
                  onClick={openCreateModal}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add First Room Type
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRoomTypes.map((roomType) => (
                  <tr key={roomType.id} className={`hover:bg-slate-50 transition-colors ${!roomType.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                        {roomType.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{roomType.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          roomType.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {roomType.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(roomType)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          Edit
                        </button>
                        {roomType.isActive ? (
                          <button
                            onClick={() => setDeleteConfirm(roomType)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(roomType)}
                            disabled={saving}
                            className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                          >
                            Reactivate
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
          <div className="mt-4 text-sm text-slate-500 text-center">
            Showing {filteredRoomTypes.length} of {roomTypes.length} room types
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingRoomType ? 'Edit Room Type' : 'Add New Room Type'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SINGLE"
                  maxLength={20}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
                <p className="text-xs text-slate-500 mt-1">Unique identifier, max 20 characters</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Single Room"
                  maxLength={100}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingRoomType ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Deactivate Room Type
            </h2>
            <p className="text-slate-600 mb-6">
              Are you sure you want to deactivate &quot;{deleteConfirm.name}&quot;? This room type will no longer be available for selection.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
