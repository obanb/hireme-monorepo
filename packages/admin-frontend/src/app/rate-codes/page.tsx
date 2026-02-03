'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface RateCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

interface RateCodeFormData {
  code: string;
  name: string;
  description: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const emptyFormData: RateCodeFormData = {
  code: '',
  name: '',
  description: '',
};

export default function RateCodesPage() {
  const [rateCodes, setRateCodes] = useState<RateCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRateCode, setEditingRateCode] = useState<RateCode | null>(null);
  const [formData, setFormData] = useState<RateCodeFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<RateCode | null>(null);

  const fetchRateCodes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query ListRateCodes($includeInactive: Boolean) {
              rateCodes(includeInactive: $includeInactive) {
                id
                code
                name
                description
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
        throw new Error(result.errors[0]?.message ?? 'Failed to fetch rate codes');
      }

      setRateCodes(result.data?.rateCodes ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rate codes');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchRateCodes();
  }, [fetchRateCodes]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const filteredRateCodes = rateCodes.filter((rateCode) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        rateCode.code.toLowerCase().includes(query) ||
        rateCode.name.toLowerCase().includes(query) ||
        (rateCode.description?.toLowerCase().includes(query) ?? false)
      );
    }
    return true;
  });

  const openCreateModal = () => {
    setEditingRateCode(null);
    setFormData(emptyFormData);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rateCode: RateCode) => {
    setEditingRateCode(rateCode);
    setFormData({
      code: rateCode.code,
      name: rateCode.name,
      description: rateCode.description ?? '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRateCode(null);
    setFormData(emptyFormData);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      if (editingRateCode) {
        // Update existing rate code
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation UpdateRateCode($id: ID!, $input: UpdateRateCodeInput!) {
                updateRateCode(id: $id, input: $input) {
                  rateCode {
                    id
                    code
                    name
                    description
                    isActive
                    version
                  }
                }
              }
            `,
            variables: {
              id: editingRateCode.id,
              input: {
                code: formData.code,
                name: formData.name,
                description: formData.description || null,
              },
            },
          }),
        });

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message ?? 'Failed to update rate code');
        }

        setSuccessMessage(`Rate code "${formData.name}" updated successfully`);
      } else {
        // Create new rate code
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation CreateRateCode($input: CreateRateCodeInput!) {
                createRateCode(input: $input) {
                  rateCode {
                    id
                    code
                    name
                    description
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
                description: formData.description || null,
              },
            },
          }),
        });

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message ?? 'Failed to create rate code');
        }

        setSuccessMessage(`Rate code "${formData.name}" created successfully`);
      }

      closeModal();
      fetchRateCodes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save rate code');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rateCode: RateCode) => {
    setSaving(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation DeleteRateCode($id: ID!) {
              deleteRateCode(id: $id) {
                success
              }
            }
          `,
          variables: { id: rateCode.id },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to delete rate code');
      }

      setSuccessMessage(`Rate code "${rateCode.name}" deactivated successfully`);
      setDeleteConfirm(null);
      fetchRateCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rate code');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (rateCode: RateCode) => {
    setSaving(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation UpdateRateCode($id: ID!, $input: UpdateRateCodeInput!) {
              updateRateCode(id: $id, input: $input) {
                rateCode {
                  id
                  isActive
                }
              }
            }
          `,
          variables: {
            id: rateCode.id,
            input: { isActive: true },
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to reactivate rate code');
      }

      setSuccessMessage(`Rate code "${rateCode.name}" reactivated successfully`);
      fetchRateCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate rate code');
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
                <h1 className="text-2xl font-bold text-slate-900">Rate Codes</h1>
                <p className="text-sm text-slate-600 mt-1">Manage pricing rate configurations</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              + Add Rate Code
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
                placeholder="Search by code, name, or description..."
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
              onClick={fetchRateCodes}
              disabled={loading}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <span className={loading ? 'animate-spin' : ''}>&#x21bb;</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Rate Codes Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="animate-pulse">Loading rate codes...</div>
            </div>
          ) : filteredRateCodes.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <div className="text-4xl mb-4">&#x1F4B0;</div>
              <p className="text-lg font-medium">No rate codes found</p>
              <p className="text-sm mt-1">
                {rateCodes.length === 0
                  ? 'Create your first rate code to get started'
                  : 'Try adjusting your search'}
              </p>
              {rateCodes.length === 0 && (
                <button
                  onClick={openCreateModal}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add First Rate Code
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
                    Description
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
                {filteredRateCodes.map((rateCode) => (
                  <tr key={rateCode.id} className={`hover:bg-slate-50 transition-colors ${!rateCode.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                        {rateCode.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{rateCode.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 text-sm">
                        {rateCode.description || <span className="text-slate-400 italic">No description</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rateCode.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {rateCode.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(rateCode)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          Edit
                        </button>
                        {rateCode.isActive ? (
                          <button
                            onClick={() => setDeleteConfirm(rateCode)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(rateCode)}
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
        {!loading && filteredRateCodes.length > 0 && (
          <div className="mt-4 text-sm text-slate-500 text-center">
            Showing {filteredRateCodes.length} of {rateCodes.length} rate codes
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingRateCode ? 'Edit Rate Code' : 'Add New Rate Code'}
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
                  placeholder="e.g., RACK"
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
                  placeholder="e.g., Rack Rate"
                  maxLength={100}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this rate code..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                  {saving ? 'Saving...' : editingRateCode ? 'Update' : 'Create'}
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
              Deactivate Rate Code
            </h2>
            <p className="text-slate-600 mb-6">
              Are you sure you want to deactivate &quot;{deleteConfirm.name}&quot;? This rate code will no longer be available for selection.
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
