'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HotelSidebar from '@/components/HotelSidebar';

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
    <div className="flex min-h-screen bg-stone-50">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Email Campaigns</h1>
              <p className="text-stone-500 text-sm mt-1">Create and manage email campaigns for your guests</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/hotel-cms/campaigns/templates"
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                Manage Templates
              </Link>
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
              >
                + New Campaign
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
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          {/* Campaigns table */}
          {loading ? (
            <div className="text-center py-12 text-stone-400">Loading campaigns...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              No campaigns found. Create your first campaign to get started.
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Template</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Sent</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Created</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-stone-900">{campaign.name}</td>
                      <td className="px-6 py-4 text-sm text-stone-600">{campaign.template.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_COLORS[campaign.status] || 'bg-stone-100 text-stone-600'}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        {campaign.totalSent > 0 ? `${campaign.totalSent}/${campaign.totalRecipients}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {campaign.status === 'SENT' && (
                            <button
                              onClick={() => handleViewStats(campaign.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-lime-50 text-lime-700 hover:bg-lime-100 transition-colors"
                            >
                              Stats
                            </button>
                          )}
                          {campaign.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => openEdit(campaign)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleSend(campaign.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                              >
                                Send
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Delete
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-stone-100">
                <h2 className="text-lg font-bold text-stone-900">
                  {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Campaign Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    placeholder="e.g. Winter Special"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Template</label>
                  <select
                    value={formTemplateId}
                    onChange={(e) => setFormTemplateId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  >
                    <option value="">Select a template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-stone-100 pt-4">
                  <h3 className="text-sm font-semibold text-stone-700 mb-3">Targeting Rules</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Check-out from</label>
                      <input type="date" value={formRules.checkOutFrom} onChange={(e) => setFormRules({ ...formRules, checkOutFrom: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Check-out to</label>
                      <input type="date" value={formRules.checkOutTo} onChange={(e) => setFormRules({ ...formRules, checkOutTo: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Check-in from</label>
                      <input type="date" value={formRules.checkInFrom} onChange={(e) => setFormRules({ ...formRules, checkInFrom: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Check-in to</label>
                      <input type="date" value={formRules.checkInTo} onChange={(e) => setFormRules({ ...formRules, checkInTo: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Status</label>
                      <select value={formRules.status} onChange={(e) => setFormRules({ ...formRules, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm">
                        <option value="">Any</option>
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Min amount</label>
                      <input type="number" value={formRules.minAmount} onChange={(e) => setFormRules({ ...formRules, minAmount: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
                    </div>
                  </div>

                  <button
                    onClick={handlePreviewAudience}
                    className="mt-3 px-4 py-2 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                  >
                    Preview Audience
                  </button>

                  {audiencePreview && (
                    <div className="mt-3 p-3 rounded-lg bg-stone-50 border border-stone-200">
                      <p className="text-sm font-medium text-stone-700">{audiencePreview.count} recipient(s) match</p>
                      {audiencePreview.sampleRecipients.length > 0 && (
                        <ul className="mt-2 text-xs text-stone-500 space-y-1">
                          {audiencePreview.sampleRecipients.map((r, i) => (
                            <li key={i}>{r.email} {r.name ? `(${r.name})` : ''}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-stone-100 flex gap-3 justify-end">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrUpdate}
                  disabled={!formName || !formTemplateId}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {editingCampaign ? 'Save Changes' : 'Create Campaign'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Modal */}
        {showStatsModal && stats && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-stone-100">
                <h2 className="text-lg font-bold text-stone-900">Campaign Stats</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-stone-50">
                    <p className="text-xs text-stone-500">Recipients</p>
                    <p className="text-2xl font-bold text-stone-900">{stats.totalRecipients}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-lime-50">
                    <p className="text-xs text-lime-600">Sent</p>
                    <p className="text-2xl font-bold text-lime-700">{stats.totalSent}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50">
                    <p className="text-xs text-blue-600">Opened</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.totalOpened}</p>
                    <p className="text-xs text-blue-500 mt-1">{(stats.openRate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-violet-50">
                    <p className="text-xs text-violet-600">Clicked</p>
                    <p className="text-2xl font-bold text-violet-700">{stats.totalClicked}</p>
                    <p className="text-xs text-violet-500 mt-1">{(stats.clickRate * 100).toFixed(1)}%</p>
                  </div>
                </div>
                {stats.totalFailed > 0 && (
                  <div className="p-4 rounded-xl bg-red-50">
                    <p className="text-xs text-red-600">Failed</p>
                    <p className="text-2xl font-bold text-red-700">{stats.totalFailed}</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-stone-100 flex justify-end">
                <button
                  onClick={() => { setShowStatsModal(null); setStats(null); }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
