'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

interface Tier {
  id: string;
  code: string;
  name: string;
  description: string | null;
  minReservations: number | null;
  minSpend: number | null;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const PRESET_COLORS = [
  { label: 'Bronze', color: '#cd7f32' },
  { label: 'Silver', color: '#94a3b8' },
  { label: 'Gold', color: '#f59e0b' },
  { label: 'Platinum', color: '#8b5cf6' },
  { label: 'Diamond', color: '#06b6d4' },
  { label: 'Emerald', color: '#10b981' },
  { label: 'Ruby', color: '#ef4444' },
  { label: 'Sapphire', color: '#3b82f6' },
];

function TierCard({ tier, onEdit, onDelete }: { tier: Tier; onEdit: (t: Tier) => void; onDelete: (t: Tier) => void }) {
  const hasReservations = tier.minReservations !== null;
  const hasSpend = tier.minSpend !== null;

  return (
    <div
      className="relative bg-white dark:bg-stone-800 rounded-2xl shadow-sm overflow-hidden border-2 transition-all hover:shadow-lg"
      style={{ borderColor: tier.color }}
    >
      {/* Top color band */}
      <div className="h-2 w-full" style={{ backgroundColor: tier.color }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg flex-shrink-0"
              style={{ backgroundColor: tier.color }}
            >
              ★
            </div>
            <div>
              <div className="font-black text-xl text-stone-900 dark:text-stone-100 leading-tight">{tier.name}</div>
              <div className="text-xs font-mono text-stone-400 dark:text-stone-500 mt-0.5 uppercase tracking-widest">{tier.code}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onEdit(tier)}
              className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Edit"
            >
              ✎
            </button>
            <button
              onClick={() => onDelete(tier)}
              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Description */}
        {tier.description && (
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">{tier.description}</p>
        )}

        {/* Criteria */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            Qualification Criteria
          </div>
          {!hasReservations && !hasSpend ? (
            <div className="flex items-center gap-2 text-sm text-stone-400 italic">
              <span>No criteria set — open tier</span>
            </div>
          ) : (
            <>
              {hasReservations && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: tier.color + '18', color: tier.color }}>
                  <span className="text-base">🔁</span>
                  <span>≥ {tier.minReservations} reservation{tier.minReservations !== 1 ? 's' : ''}</span>
                </div>
              )}
              {hasSpend && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: tier.color + '18', color: tier.color }}>
                  <span className="text-base">💰</span>
                  <span>≥ {tier.minSpend?.toLocaleString('cs-CZ')} total spend</span>
                </div>
              )}
              {hasReservations && hasSpend && (
                <div className="text-xs text-stone-400 dark:text-stone-500 text-center">Both criteria must be met</div>
              )}
            </>
          )}
        </div>

        {/* Sort order badge */}
        <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-700 flex items-center justify-between">
          <span className="text-xs text-stone-400">Priority: {tier.sortOrder}</span>
          <TierBadge tier={tier} size="sm" />
        </div>
      </div>
    </div>
  );
}

function TierBadge({ tier, size = 'md' }: { tier: { name: string; color: string } | null | undefined; size?: 'sm' | 'md' }) {
  if (!tier) return null;
  const cls = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5';
  return (
    <span
      className={`inline-flex items-center ${cls} rounded-full font-bold text-white shadow-sm whitespace-nowrap`}
      style={{ backgroundColor: tier.color }}
    >
      <span>★</span>
      {tier.name}
    </span>
  );
}

const emptyForm = {
  code: '',
  name: '',
  description: '',
  minReservations: '',
  minSpend: '',
  color: '#f59e0b',
  sortOrder: '0',
};

export default function TiersPage() {
  const { t } = useLocale();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: `{ tiers { id code name description minReservations minSpend color sortOrder createdAt updatedAt } }` }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setTiers(json.data.tiers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tiers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sortOrder: String(tiers.length) });
    setShowModal(true);
  };

  const openEdit = (tier: Tier) => {
    setEditing(tier);
    setForm({
      code: tier.code,
      name: tier.name,
      description: tier.description ?? '',
      minReservations: tier.minReservations !== null ? String(tier.minReservations) : '',
      minSpend: tier.minSpend !== null ? String(tier.minSpend) : '',
      color: tier.color,
      sortOrder: String(tier.sortOrder),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const input = {
        code: form.code,
        name: form.name,
        description: form.description || null,
        minReservations: form.minReservations !== '' ? parseInt(form.minReservations, 10) : null,
        minSpend: form.minSpend !== '' ? parseFloat(form.minSpend) : null,
        color: form.color,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };

      const query = editing
        ? `mutation($id: ID!, $input: UpdateTierInput!) { updateTier(id: $id, input: $input) { id code name } }`
        : `mutation($input: CreateTierInput!) { createTier(input: $input) { id code name } }`;
      const variables = editing ? { id: editing.id, input } : { input };

      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, variables }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);

      setSuccess(editing ? 'Tier updated' : 'Tier created');
      setShowModal(false);
      fetchTiers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tier: Tier) => {
    if (!confirm(`Delete tier "${tier.name}"?`)) return;
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($id: ID!) { deleteTier(id: $id) }`,
          variables: { id: tier.id },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setSuccess('Tier deleted');
      fetchTiers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tier');
    }
  };

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-black text-stone-900 dark:text-stone-100 mb-2">{t('tiers.title')}</h1>
              <p className="text-stone-500 dark:text-stone-400">{t('tiers.subtitle')}</p>
            </div>
            <button
              onClick={openCreate}
              className="px-5 py-2.5 bg-stone-900 dark:bg-stone-700 text-white font-semibold rounded-xl hover:bg-stone-800 dark:hover:bg-stone-600 transition-colors shadow-sm"
            >
              + {t('tiers.addTier')}
            </button>
          </div>

          {/* Alerts */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">&times;</button>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">&times;</button>
            </div>
          )}

          {/* How it works */}
          <div className="mb-8 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
            <div className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">How tiers work</div>
            <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <div>• A guest qualifies for a tier when they meet <strong>all</strong> defined criteria (reservations count + total spend).</div>
              <div>• The guest receives the tier with the <strong>highest priority</strong> they qualify for.</div>
              <div>• Set a higher <strong>Sort Order</strong> for premium tiers (e.g., Bronze=1, Silver=2, Gold=3).</div>
            </div>
          </div>

          {/* Tier cards grid */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-8 h-8 border-4 border-stone-900 border-t-transparent rounded-full" />
            </div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
              <div className="text-6xl mb-4">★</div>
              <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">{t('tiers.noTiers')}</h3>
              <p className="text-stone-500 dark:text-stone-400 mb-6">{t('tiers.noTiersDesc')}</p>
              <button onClick={openCreate} className="px-5 py-2.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 font-semibold">
                Create first tier
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tiers.map((tier) => (
                <TierCard key={tier.id} tier={tier} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700 sticky top-0 bg-white dark:bg-stone-800 z-10">
              <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
                {editing ? t('tiers.editTier') : t('tiers.addTier')}
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Preview badge */}
              <div className="flex items-center gap-3 p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-md" style={{ backgroundColor: form.color }}>★</div>
                <div>
                  <div className="font-black text-stone-900 dark:text-stone-100">{form.name || 'Tier Name'}</div>
                  <TierBadge tier={{ name: form.name || 'Preview', color: form.color }} size="sm" />
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t('tiers.color')}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map((p) => (
                    <button
                      key={p.color}
                      onClick={() => setForm({ ...form, color: p.color })}
                      className={`w-8 h-8 rounded-lg shadow-sm transition-transform hover:scale-110 ${form.color === p.color ? 'ring-2 ring-offset-2 ring-stone-900 scale-110' : ''}`}
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-stone-200"
                    title="Custom color"
                  />
                </div>
              </div>

              {/* Code & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">{t('tiers.code')} *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="GOLD"
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg font-mono uppercase dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">{t('tiers.name')} *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Gold Member"
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">{t('tiers.description')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the benefits of this tier..."
                  rows={2}
                  className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
                />
              </div>

              {/* Criteria */}
              <div>
                <div className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">Qualification Criteria</div>
                <div className="space-y-3 p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                  <div>
                    <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1">
                      🔁 {t('tiers.minReservations')} <span className="text-stone-400">(leave blank = no requirement)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.minReservations}
                      onChange={(e) => setForm({ ...form, minReservations: e.target.value })}
                      placeholder="e.g. 3"
                      className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1">
                      💰 {t('tiers.minSpend')} <span className="text-stone-400">(leave blank = no requirement)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minSpend}
                      onChange={(e) => setForm({ ...form, minSpend: e.target.value })}
                      placeholder="e.g. 5000"
                      className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                  </div>
                </div>
              </div>

              {/* Sort order */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {t('tiers.sortOrder')} <span className="text-stone-400 font-normal">(higher = better tier, evaluated first)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.code || !form.name}
                className="flex-1 px-4 py-2.5 bg-stone-900 dark:bg-stone-700 text-white rounded-xl hover:bg-stone-800 dark:hover:bg-stone-600 disabled:opacity-50 transition-colors font-semibold"
              >
                {saving ? t('common.saving') : editing ? t('common.update') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
