'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

interface RateCode { id: string; code: string; name: string; description: string | null; isActive: boolean; version: number; createdAt?: string; updatedAt?: string; }
interface RateCodeFormData { code: string; name: string; description: string; }

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';
const emptyFormData: RateCodeFormData = { code: '', name: '', description: '' };
const mainStyle = { marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' };
const inputStyle = { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' };

export default function RateCodesPage() {
  const { t } = useLocale();
  const [rateCodes, setRateCodes] = useState<RateCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRateCode, setEditingRateCode] = useState<RateCode | null>(null);
  const [formData, setFormData] = useState<RateCodeFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<RateCode | null>(null);

  const fetchRateCodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `query($includeInactive:Boolean){rateCodes(includeInactive:$includeInactive){id code name description isActive version createdAt updatedAt}}`, variables: { includeInactive } }) });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setRateCodes(json.data?.rateCodes ?? []);
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  }, [includeInactive]);

  useEffect(() => { fetchRateCodes(); }, [fetchRateCodes]);
  useEffect(() => { if (successMessage) { const t = setTimeout(() => setSuccessMessage(null), 3000); return () => clearTimeout(t); } }, [successMessage]);

  const filteredRateCodes = rateCodes.filter(rc => !searchQuery || rc.code.toLowerCase().includes(searchQuery.toLowerCase()) || rc.name.toLowerCase().includes(searchQuery.toLowerCase()) || (rc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false));

  const openCreateModal = () => { setEditingRateCode(null); setFormData(emptyFormData); setFormError(null); setIsModalOpen(true); };
  const openEditModal = (rc: RateCode) => { setEditingRateCode(rc); setFormData({ code: rc.code, name: rc.name, description: rc.description ?? '' }); setFormError(null); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingRateCode(null); setFormData(emptyFormData); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null); setSaving(true);
    try {
      const query = editingRateCode
        ? `mutation($id:ID!,$input:UpdateRateCodeInput!){updateRateCode(id:$id,input:$input){rateCode{id code name description isActive version}}}`
        : `mutation($input:CreateRateCodeInput!){createRateCode(input:$input){rateCode{id code name description isActive version}}}`;
      const input = { code: formData.code, name: formData.name, description: formData.description || null };
      const variables = editingRateCode ? { id: editingRateCode.id, input } : { input };
      const res = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setSuccessMessage(`Rate code "${formData.name}" ${editingRateCode ? 'updated' : 'created'}`);
      closeModal(); fetchRateCodes();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (rc: RateCode) => {
    setSaving(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `mutation($id:ID!){deleteRateCode(id:$id){success}}`, variables: { id: rc.id } }) });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setSuccessMessage(`"${rc.name}" deactivated`); setDeleteConfirm(null); fetchRateCodes();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleReactivate = async (rc: RateCode) => {
    setSaving(true);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: `mutation($id:ID!,$input:UpdateRateCodeInput!){updateRateCode(id:$id,input:$input){rateCode{id isActive}}}`, variables: { id: rc.id, input: { isActive: true } } }) });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0]?.message);
      setSuccessMessage(`"${rc.name}" reactivated`); fetchRateCodes();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const thStyle = { color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)', fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' as const };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main className="flex-1 px-8 py-8" style={mainStyle}>
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }} className="text-[2.75rem] font-bold tracking-tight mb-1">{t('rateCodes.title')}</h1>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">{t('rateCodes.subtitle')}</p>
            </div>
            <button onClick={openCreateModal} style={{ background: 'var(--gold)', color: 'var(--background)' }} className="px-4 py-2 text-[12.5px] font-semibold rounded-md hover:opacity-90 flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" /><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" /></svg>
              {t('rateCodes.addRateCode')}
            </button>
          </div>

          {/* Alerts */}
          {successMessage && (
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ADE80' }} className="px-4 py-3 rounded-md text-[13px] mb-5 flex items-center justify-between">
              <span>{successMessage}</span><button onClick={() => setSuccessMessage(null)} className="opacity-70 hover:opacity-100 text-lg">&times;</button>
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }} className="px-4 py-3 rounded-md text-[13px] mb-5 flex items-center justify-between">
              <span>{error}</span><button onClick={() => setError(null)} className="opacity-70 hover:opacity-100 text-lg">&times;</button>
            </div>
          )}

          {/* Filters */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl p-4 mb-5 flex flex-wrap items-center gap-4">
            <input type="text" placeholder={t('rateCodes.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md text-[12px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} className="w-4 h-4 accent-[#C9A96E] rounded" />
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">{t('rateCodes.showInactive')}</span>
            </label>
            <button onClick={fetchRateCodes} disabled={loading} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
              className="px-3 py-1.5 rounded-md text-[12px] font-medium hover:opacity-80 disabled:opacity-50 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''}><path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t('common.refresh')}
            </button>
          </div>

          {/* Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48"><div className="animate-spin w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--gold)' }} /></div>
            ) : filteredRateCodes.length === 0 ? (
              <div className="p-16 text-center">
                <p style={{ color: 'var(--text-primary)' }} className="text-[17px] font-semibold mb-2">{t('rateCodes.noRateCodes')}</p>
                <p style={{ color: 'var(--text-muted)' }} className="text-[13px] mb-5">{rateCodes.length === 0 ? t('rateCodes.createFirst') : t('common.tryAdjusting')}</p>
                {rateCodes.length === 0 && <button onClick={openCreateModal} style={{ background: 'var(--gold)', color: 'var(--background)' }} className="px-5 py-2 rounded-md text-[12.5px] font-semibold hover:opacity-90">{t('rateCodes.addFirst')}</button>}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    {[t('common.code'), t('common.name'), t('common.description'), t('common.status'), t('common.actions')].map((h, i) => (
                      <th key={h} className="px-6 py-4 text-left" style={{ ...thStyle, textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRateCodes.map(rc => (
                    <tr key={rc.id} style={{ opacity: rc.isActive ? 1 : 0.6, borderBottom: '1px solid var(--card-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-6 py-4">
                        <span style={{ color: 'var(--text-muted)', background: 'var(--background)', border: '1px solid var(--card-border)' }} className="font-mono text-[11px] px-2 py-1 rounded-md">{rc.code}</span>
                      </td>
                      <td className="px-6 py-4"><span style={{ color: 'var(--text-primary)' }} className="text-[13px] font-semibold">{rc.name}</span></td>
                      <td className="px-6 py-4"><span style={{ color: 'var(--text-secondary)' }} className="text-[12px]">{rc.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }} className="text-[12px]">{t('rateCodes.noDescription')}</span>}</span></td>
                      <td className="px-6 py-4">
                        <span style={{ color: rc.isActive ? '#4ADE80' : '#FB7185', background: (rc.isActive ? '#4ADE80' : '#FB7185') + '1A' }}
                          className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md">
                          {rc.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(rc)} style={{ color: 'var(--gold)' }} className="px-3 py-1 text-[12px] font-semibold hover:opacity-80">{t('common.edit')}</button>
                          {rc.isActive
                            ? <button onClick={() => setDeleteConfirm(rc)} style={{ color: '#FB7185' }} className="px-3 py-1 text-[12px] font-medium hover:opacity-80">{t('common.deactivate')}</button>
                            : <button onClick={() => handleReactivate(rc)} disabled={saving} style={{ color: '#4ADE80' }} className="px-3 py-1 text-[12px] font-medium hover:opacity-80 disabled:opacity-50">{t('common.reactivate')}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!loading && filteredRateCodes.length > 0 && (
            <p style={{ color: 'var(--text-muted)' }} className="mt-4 text-[11px] text-center">Showing {filteredRateCodes.length} of {rateCodes.length} rate codes</p>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold">
                {editingRateCode ? t('rateCodes.editRateCode') : t('rateCodes.addNew')}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }} className="px-4 py-3 rounded-md text-[13px]">{formError}</div>}
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{t('common.code')}</label>
                <input type="text" required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g., RACK" maxLength={20}
                  className="w-full px-3 py-2 rounded-md font-mono uppercase text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
                <p style={{ color: 'var(--text-muted)' }} className="text-[10px] mt-1">{t('rateCodes.uniqueId')}</p>
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{t('common.name')}</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Rack Rate" maxLength={100}
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{t('rateCodes.descriptionOptional')}</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description..." rows={3}
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E] resize-none" style={inputStyle} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }} className="flex-1 px-4 py-2.5 rounded-md text-[12.5px] font-medium hover:opacity-80">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} style={{ background: 'var(--gold)', color: 'var(--background)' }} className="flex-1 px-4 py-2.5 rounded-md text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50">
                  {saving ? t('common.saving') : editingRateCode ? t('common.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }} className="rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h2 style={{ color: 'var(--text-primary)' }} className="text-[18px] font-semibold mb-2">{t('rateCodes.deactivateTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)' }} className="text-[13px] mb-6">Deactivate &quot;{deleteConfirm.name}&quot;? It will no longer be available.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }} className="flex-1 px-4 py-2.5 rounded-md text-[12.5px] font-medium hover:opacity-80">{t('common.cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={saving} style={{ background: '#FB7185', color: '#0a0a0a' }} className="flex-1 px-4 py-2.5 rounded-md text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? t('common.deactivating') : t('common.deactivate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
