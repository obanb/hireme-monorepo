'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

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
  { label: 'Bronze', color: '#cd7f32' }, { label: 'Silver', color: '#94a3b8' },
  { label: 'Gold', color: '#f59e0b' }, { label: 'Platinum', color: '#8b5cf6' },
  { label: 'Diamond', color: '#06b6d4' }, { label: 'Emerald', color: '#10b981' },
  { label: 'Ruby', color: '#ef4444' }, { label: 'Sapphire', color: '#3b82f6' },
];
const emptyForm = { code: '', name: '', description: '', minReservations: '', minSpend: '', color: '#f59e0b', sortOrder: '0' };
const mainStyle = { marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' };
const inputStyle = { background: 'var(--background)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' };

function TierCard({ tier, onEdit, onDelete }: { tier: Tier; onEdit: (t: Tier) => void; onDelete: (t: Tier) => void }) {
  return (
    <div style={{ background: 'var(--surface)', borderLeft: `3px solid ${tier.color}`, border: `1px solid var(--card-border)`, borderLeftWidth: 3, borderLeftColor: tier.color }} className="rounded-xl overflow-hidden">
      {/* Color bar */}
      <div className="h-1.5" style={{ background: tier.color }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg" style={{ background: tier.color }}>
              ★
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)' }} className="text-[17px] font-bold leading-tight">{tier.name}</div>
              <div style={{ color: 'var(--text-muted)' }} className="font-mono text-[10px] uppercase tracking-widest mt-0.5">{tier.code}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(tier)} style={{ color: 'var(--text-muted)' }} className="p-1.5 rounded-md hover:opacity-80 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button onClick={() => onDelete(tier)} style={{ color: '#FB7185' }} className="p-1.5 rounded-md hover:opacity-80 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
            </button>
          </div>
        </div>

        {tier.description && <p style={{ color: 'var(--text-muted)' }} className="text-[12px] mb-4 leading-relaxed">{tier.description}</p>}

        <div className="space-y-2">
          <p style={{ color: 'var(--text-muted)' }} className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2">Criteria</p>
          {!tier.minReservations && !tier.minSpend ? (
            <p style={{ color: 'var(--text-muted)' }} className="text-[12px] italic">Open tier — no requirements</p>
          ) : (
            <>
              {tier.minReservations && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] font-medium" style={{ color: tier.color, background: tier.color + '18' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ≥ {tier.minReservations} reservation{tier.minReservations !== 1 ? 's' : ''}
                </div>
              )}
              {tier.minSpend && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] font-medium" style={{ color: tier.color, background: tier.color + '18' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" /></svg>
                  ≥ {tier.minSpend?.toLocaleString('cs-CZ')} total spend
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
          <span style={{ color: 'var(--text-muted)' }} className="text-[10px]">Priority: {tier.sortOrder}</span>
          <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: tier.color }}>★ {tier.name}</span>
        </div>
      </div>
    </div>
  );
}

export default function TiersPage() {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); } }, [success]);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `{ tiers { id code name description minReservations minSpend color sortOrder createdAt updatedAt } }` }) });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setTiers(json.data.tiers ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, sortOrder: String(tiers.length) }); setShowModal(true); };
  const openEdit = (tier: Tier) => {
    setEditing(tier);
    setForm({ code: tier.code, name: tier.name, description: tier.description ?? '', minReservations: tier.minReservations !== null ? String(tier.minReservations) : '', minSpend: tier.minSpend !== null ? String(tier.minSpend) : '', color: tier.color, sortOrder: String(tier.sortOrder) });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const input = { code: form.code, name: form.name, description: form.description || null, minReservations: form.minReservations !== '' ? parseInt(form.minReservations, 10) : null, minSpend: form.minSpend !== '' ? parseFloat(form.minSpend) : null, color: form.color, sortOrder: parseInt(form.sortOrder, 10) || 0 };
      const query = editing ? `mutation($id:ID!,$input:UpdateTierInput!){updateTier(id:$id,input:$input){id}}` : `mutation($input:CreateTierInput!){createTier(input:$input){id}}`;
      const variables = editing ? { id: editing.id, input } : { input };
      const res = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query, variables }) });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setSuccess(editing ? 'Tier updated' : 'Tier created');
      setShowModal(false);
      fetchTiers();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (tier: Tier) => {
    if (!(await confirm({ message: `Delete tier "${tier.name}"?`, confirmLabel: 'Delete', danger: true }))) return;
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `mutation($id:ID!){deleteTier(id:$id)}`, variables: { id: tier.id } }) });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      toast.success('Tier deleted.');
      fetchTiers();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main className="flex-1 px-8 py-8" style={mainStyle}>
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }} className="text-[2.75rem] font-bold tracking-tight mb-1">{t('tiers.title')}</h1>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">{t('tiers.subtitle')}</p>
            </div>
            <button onClick={openCreate} style={{ background: 'var(--gold)', color: 'var(--background)' }} className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" /><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" /></svg>
              {t('tiers.addTier')}
            </button>
          </div>

          {/* Alerts */}
          {success && (
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ADE80' }} className="px-4 py-3 rounded-md text-[13px] mb-5 flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="opacity-70 hover:opacity-100 text-lg leading-none">&times;</button>
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }} className="px-4 py-3 rounded-md text-[13px] mb-5 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100 text-lg leading-none">&times;</button>
            </div>
          )}

          {/* Info box */}
          <div style={{ background: 'rgba(96,184,212,0.06)', border: '1px solid rgba(96,184,212,0.2)' }} className="rounded-xl p-5 mb-8">
            <p style={{ color: '#60B8D4' }} className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-2">How tiers work</p>
            <div style={{ color: 'var(--text-secondary)' }} className="text-[12px] space-y-1">
              <p>• A guest qualifies when they meet <strong>all</strong> defined criteria.</p>
              <p>• The guest receives the tier with the <strong>highest priority</strong> they qualify for.</p>
              <p>• Set a higher <strong>Sort Order</strong> for premium tiers (Bronze=1, Silver=2, Gold=3).</p>
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="flex items-center justify-center h-48"><div className="animate-spin w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--gold)' }} /></div>
          ) : tiers.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-16 text-center">
              <p style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold mb-2">{t('tiers.noTiers')}</p>
              <p style={{ color: 'var(--text-muted)' }} className="text-[13px] mb-6">{t('tiers.noTiersDesc')}</p>
              <button onClick={openCreate} style={{ background: 'var(--gold)', color: 'var(--background)' }} className="px-5 py-2.5 text-[13px] font-semibold rounded-md hover:opacity-90">Create first tier</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tiers.map(tier => <TierCard key={tier.id} tier={tier} onEdit={openEdit} onDelete={handleDelete} />)}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 sticky top-0 z-10" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold">
                  {editing ? t('tiers.editTier') : t('tiers.addTier')}
                </h2>
                <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)' }} className="text-xl hover:opacity-80">&times;</button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Preview */}
              <div style={{ background: 'var(--background)', border: '1px solid var(--card-border)' }} className="rounded-lg p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-white text-lg font-bold" style={{ background: form.color }}>★</div>
                <div>
                  <div style={{ color: 'var(--text-primary)' }} className="font-semibold">{form.name || 'Tier Name'}</div>
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: form.color }}>★ {form.name || 'Preview'}</span>
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-2">{t('tiers.color')}</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(p => (
                    <button key={p.color} onClick={() => setForm({ ...form, color: p.color })} title={p.label}
                      style={{ background: p.color, outline: form.color === p.color ? `2px solid var(--gold)` : 'none', outlineOffset: '2px' }}
                      className="w-8 h-8 rounded-lg shadow-sm hover:opacity-90 transition-opacity" />
                  ))}
                  <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-[var(--card-border)]" title="Custom color" />
                </div>
              </div>

              {/* Code & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{t('tiers.code')} *</label>
                  <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="GOLD"
                    className="w-full px-3 py-2 rounded-md font-mono uppercase text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{t('tiers.name')} *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Gold Member"
                    className="w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{t('tiers.description')}</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Describe benefits..."
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E] resize-none" style={inputStyle} />
              </div>

              {/* Criteria */}
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-2">Qualification Criteria</label>
                <div style={{ background: 'var(--background)', border: '1px solid var(--card-border)' }} className="rounded-lg p-4 space-y-3">
                  <div>
                    <label style={{ color: 'var(--text-muted)' }} className="block text-[11px] mb-1.5">{t('tiers.minReservations')} <span className="opacity-60">(blank = no req.)</span></label>
                    <input type="number" min="0" value={form.minReservations} onChange={e => setForm({ ...form, minReservations: e.target.value })} placeholder="e.g. 3"
                      className="w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-muted)' }} className="block text-[11px] mb-1.5">{t('tiers.minSpend')} <span className="opacity-60">(blank = no req.)</span></label>
                    <input type="number" min="0" step="0.01" value={form.minSpend} onChange={e => setForm({ ...form, minSpend: e.target.value })} placeholder="e.g. 5000"
                      className="w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Sort order */}
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{t('tiers.sortOrder')} <span style={{ color: 'var(--text-muted)' }} className="normal-case font-normal">(higher = better)</span></label>
                <input type="number" min="0" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
              </div>
            </div>

            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--card-border)' }}>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                className="flex-1 px-4 py-2.5 rounded-md text-[12.5px] font-medium hover:opacity-80">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={saving || !form.code || !form.name}
                style={{ background: 'var(--gold)', color: 'var(--background)' }}
                className="flex-1 px-4 py-2.5 rounded-md text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? t('common.saving') : editing ? t('common.update') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
