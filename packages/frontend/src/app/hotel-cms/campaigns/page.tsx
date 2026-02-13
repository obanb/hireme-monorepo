'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
}

interface Campaign {
  id: string;
  name: string;
  template: EmailTemplate;
  targetingRules: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  createdAt: string;
}

interface CampaignStats {
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
}

interface AudiencePreview {
  count: number;
  sampleRecipients: Array<{ email: string; name: string | null }>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-stone-100 text-stone-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  SENDING: 'bg-amber-100 text-amber-700',
  SENT: 'bg-lime-100 text-lime-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function CampaignsPage() {
  const { t } = useLocale();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showStatsModal, setShowStatsModal] = useState<string | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formRules, setFormRules] = useState({
    checkOutFrom: '',
    checkOutTo: '',
    checkInFrom: '',
    checkInTo: '',
    status: '',
    minAmount: '',
    maxAmount: '',
  });

  const gqlFetch = useCallback(async (query: string, variables?: Record<string, unknown>) => {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await gqlFetch(`query { campaigns { id name template { id name subject } targetingRules status scheduledAt sentAt totalRecipients totalSent totalFailed createdAt } }`);
      setCampaigns(data.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [gqlFetch]);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await gqlFetch(`query { emailTemplates { id name subject } }`);
      setTemplates(data.emailTemplates);
    } catch {
      // templates not critical for listing
    }
  }, [gqlFetch]);

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
  }, [fetchCampaigns, fetchTemplates]);

  const handleCreateOrUpdate = async () => {
    setError('');
    try {
      const rules: Record<string, unknown> = {};
      if (formRules.checkOutFrom) rules.checkOutFrom = formRules.checkOutFrom;
      if (formRules.checkOutTo) rules.checkOutTo = formRules.checkOutTo;
      if (formRules.checkInFrom) rules.checkInFrom = formRules.checkInFrom;
      if (formRules.checkInTo) rules.checkInTo = formRules.checkInTo;
      if (formRules.status) rules.status = formRules.status;
      if (formRules.minAmount) rules.minAmount = parseFloat(formRules.minAmount);
      if (formRules.maxAmount) rules.maxAmount = parseFloat(formRules.maxAmount);

      if (editingCampaign) {
        await gqlFetch(
          `mutation UpdateCampaign($id: ID!, $input: UpdateCampaignInput!) { updateCampaign(id: $id, input: $input) { id } }`,
          { id: editingCampaign.id, input: { name: formName, templateId: formTemplateId, targetingRules: JSON.stringify(rules) } }
        );
      } else {
        await gqlFetch(
          `mutation CreateCampaign($input: CreateCampaignInput!) { createCampaign(input: $input) { id } }`,
          { input: { name: formName, templateId: formTemplateId, targetingRules: JSON.stringify(rules) } }
        );
      }

      setShowModal(false);
      resetForm();
      fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm('Are you sure you want to send this campaign? This action cannot be undone.')) return;
    try {
      await gqlFetch(`mutation SendCampaign($id: ID!) { sendCampaign(id: $id) { id status } }`, { id });
      fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send campaign');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await gqlFetch(`mutation DeleteCampaign($id: ID!) { deleteCampaign(id: $id) }`, { id });
      fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
    }
  };

  const handleViewStats = async (campaignId: string) => {
    try {
      const data = await gqlFetch(
        `query CampaignStats($campaignId: ID!) { campaignStats(campaignId: $campaignId) { totalRecipients totalSent totalFailed totalOpened totalClicked openRate clickRate } }`,
        { campaignId }
      );
      setStats(data.campaignStats);
      setShowStatsModal(campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    }
  };

  const handlePreviewAudience = async () => {
    try {
      const rules: Record<string, unknown> = {};
      if (formRules.checkOutFrom) rules.checkOutFrom = formRules.checkOutFrom;
      if (formRules.checkOutTo) rules.checkOutTo = formRules.checkOutTo;
      if (formRules.checkInFrom) rules.checkInFrom = formRules.checkInFrom;
      if (formRules.checkInTo) rules.checkInTo = formRules.checkInTo;
      if (formRules.status) rules.status = formRules.status;
      if (formRules.minAmount) rules.minAmount = parseFloat(formRules.minAmount);
      if (formRules.maxAmount) rules.maxAmount = parseFloat(formRules.maxAmount);

      const data = await gqlFetch(
        `query Preview($targetingRules: String!) { previewTargetAudience(targetingRules: $targetingRules) { count sampleRecipients { email name } } }`,
        { targetingRules: JSON.stringify(rules) }
      );
      setAudiencePreview(data.previewTargetAudience);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview audience');
    }
  };

  const openEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormName(campaign.name);
    setFormTemplateId(campaign.template.id);
    const rules = JSON.parse(campaign.targetingRules);
    setFormRules({
      checkOutFrom: rules.checkOutFrom || '',
      checkOutTo: rules.checkOutTo || '',
      checkInFrom: rules.checkInFrom || '',
      checkInTo: rules.checkInTo || '',
      status: rules.status || '',
      minAmount: rules.minAmount?.toString() || '',
      maxAmount: rules.maxAmount?.toString() || '',
    });
    setAudiencePreview(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingCampaign(null);
    setFormName('');
    setFormTemplateId('');
    setFormRules({ checkOutFrom: '', checkOutTo: '', checkInFrom: '', checkInTo: '', status: '', minAmount: '', maxAmount: '' });
    setAudiencePreview(null);
  };

  const filtered = statusFilter
    ? campaigns.filter((c) => c.status === statusFilter)
    : campaigns;

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{t('campaigns.title')}</h1>
              <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">{t('campaigns.subtitle')}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/hotel-cms/campaigns/templates"
                className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                {t('campaigns.manageTemplates')}
              </Link>
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
              >
                {t('campaigns.newCampaign')}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
              <button onClick={() => setError('')} className="ml-2 font-bold">x</button>
            </div>
          )}

          {/* Status filters */}
          <div className="flex gap-2 mb-6">
            {['', 'DRAFT', 'SENT', 'SENDING', 'SCHEDULED', 'FAILED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
                }`}
              >
                {s || t('common.all')}
              </button>
            ))}
          </div>

          {/* Campaigns table */}
          {loading ? (
            <div className="text-center py-12 text-stone-400">{t('common.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              {t('campaigns.noCampaigns')}
            </div>
          ) : (
            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 border border-stone-200 dark:border-stone-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100 dark:border-stone-700">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('common.name')}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('campaigns.template')}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('common.status')}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('campaigns.sent')}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('common.created')}</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-stone-50 dark:border-stone-700 hover:bg-stone-50/50 dark:hover:bg-stone-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-stone-900 dark:text-stone-100">{campaign.name}</td>
                      <td className="px-6 py-4 text-sm text-stone-600 dark:text-stone-300">{campaign.template.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_COLORS[campaign.status] || 'bg-stone-100 text-stone-600'}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600 dark:text-stone-300">
                        {campaign.totalSent > 0 ? `${campaign.totalSent}/${campaign.totalRecipients}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500 dark:text-stone-400">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {campaign.status === 'SENT' && (
                            <button
                              onClick={() => handleViewStats(campaign.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-lime-50 text-lime-700 hover:bg-lime-100 transition-colors"
                            >
                              {t('campaigns.stats')}
                            </button>
                          )}
                          {campaign.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => openEdit(campaign)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                              >
                                {t('common.edit')}
                              </button>
                              <button
                                onClick={() => handleSend(campaign.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                              >
                                {t('campaigns.send')}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Campaign Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-stone-100 dark:border-stone-700">
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {editingCampaign ? t('campaigns.editCampaign') : t('campaigns.newCampaign')}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">{t('campaigns.campaignName')}</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-100 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    placeholder="e.g. Winter Special"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">{t('campaigns.template')}</label>
                  <select
                    value={formTemplateId}
                    onChange={(e) => setFormTemplateId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-100 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  >
                    <option value="">{t('campaigns.selectTemplate')}</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name} — {tpl.subject}</option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-stone-100 dark:border-stone-700 pt-4">
                  <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">{t('campaigns.targetingRules')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">{t('filters.checkOutFrom')}</label>
                      <input type="date" value={formRules.checkOutFrom} onChange={(e) => setFormRules({ ...formRules, checkOutFrom: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">{t('filters.checkOutTo')}</label>
                      <input type="date" value={formRules.checkOutTo} onChange={(e) => setFormRules({ ...formRules, checkOutTo: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">{t('filters.checkInFrom')}</label>
                      <input type="date" value={formRules.checkInFrom} onChange={(e) => setFormRules({ ...formRules, checkInFrom: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">{t('filters.checkInTo')}</label>
                      <input type="date" value={formRules.checkInTo} onChange={(e) => setFormRules({ ...formRules, checkInTo: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">{t('common.status')}</label>
                      <select value={formRules.status} onChange={(e) => setFormRules({ ...formRules, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100">
                        <option value="">{t('common.all')}</option>
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">{t('campaigns.minAmount')}</label>
                      <input type="number" value={formRules.minAmount} onChange={(e) => setFormRules({ ...formRules, minAmount: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100" />
                    </div>
                  </div>

                  <button
                    onClick={handlePreviewAudience}
                    className="mt-3 px-4 py-2 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                  >
                    {t('campaigns.previewAudience')}
                  </button>

                  {audiencePreview && (
                    <div className="mt-3 p-3 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                      <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{audiencePreview.count} {t('campaigns.recipientsMatch')}</p>
                      {audiencePreview.sampleRecipients.length > 0 && (
                        <ul className="mt-2 text-xs text-stone-500 dark:text-stone-400 space-y-1">
                          {audiencePreview.sampleRecipients.map((r, i) => (
                            <li key={i}>{r.email} {r.name ? `(${r.name})` : ''}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-stone-100 dark:border-stone-700 flex gap-3 justify-end">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCreateOrUpdate}
                  disabled={!formName || !formTemplateId}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {editingCampaign ? t('campaigns.saveChanges') : t('campaigns.createCampaign')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Modal */}
        {showStatsModal && stats && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-stone-100 dark:border-stone-700">
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">{t('campaigns.campaignStats')}</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900">
                    <p className="text-xs text-stone-500 dark:text-stone-400">{t('campaigns.recipients')}</p>
                    <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{stats.totalRecipients}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-lime-50">
                    <p className="text-xs text-lime-600">{t('campaigns.sent')}</p>
                    <p className="text-2xl font-bold text-lime-700">{stats.totalSent}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50">
                    <p className="text-xs text-blue-600">{t('campaigns.opened')}</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.totalOpened}</p>
                    <p className="text-xs text-blue-500 mt-1">{(stats.openRate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-violet-50">
                    <p className="text-xs text-violet-600">{t('campaigns.clicked')}</p>
                    <p className="text-2xl font-bold text-violet-700">{stats.totalClicked}</p>
                    <p className="text-xs text-violet-500 mt-1">{(stats.clickRate * 100).toFixed(1)}%</p>
                  </div>
                </div>
                {stats.totalFailed > 0 && (
                  <div className="p-4 rounded-xl bg-red-50">
                    <p className="text-xs text-red-600">{t('campaigns.failed')}</p>
                    <p className="text-2xl font-bold text-red-700">{stats.totalFailed}</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-stone-100 dark:border-stone-700 flex justify-end">
                <button
                  onClick={() => { setShowStatsModal(null); setStats(null); }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
