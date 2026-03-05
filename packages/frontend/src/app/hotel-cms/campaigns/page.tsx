'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

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

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  DRAFT:     { color: 'var(--text-muted)',  bg: 'rgba(160,160,140,0.1)' },
  SCHEDULED: { color: '#60B8D4',             bg: 'rgba(96,184,212,0.1)' },
  SENDING:   { color: '#FBBF24',             bg: 'rgba(251,191,36,0.1)' },
  SENT:      { color: '#4ADE80',             bg: 'rgba(74,222,128,0.1)' },
  FAILED:    { color: '#FB7185',             bg: 'rgba(251,113,133,0.1)' },
};

const inputStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--card-border)',
  color: 'var(--text-primary)',
};

export default function CampaignsPage() {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showStatsModal, setShowStatsModal] = useState<string | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formRules, setFormRules] = useState({
    checkOutFrom: '', checkOutTo: '',
    checkInFrom: '', checkInTo: '',
    status: '', minAmount: '', maxAmount: '',
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
      toast.error(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [gqlFetch]);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await gqlFetch(`query { emailTemplates { id name subject } }`);
      setTemplates(data.emailTemplates);
    } catch { /* not critical */ }
  }, [gqlFetch]);

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
  }, [fetchCampaigns, fetchTemplates]);

  const handleCreateOrUpdate = async () => {
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
      toast.success(editingCampaign ? 'Campaign updated.' : 'Campaign created.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save campaign');
    }
  };

  const handleSend = async (id: string) => {
    if (!(await confirm({ title: 'Send Campaign', message: 'Are you sure you want to send this campaign? This action cannot be undone.', confirmLabel: 'Send' }))) return;
    try {
      await gqlFetch(`mutation SendCampaign($id: ID!) { sendCampaign(id: $id) { id status } }`, { id });
      fetchCampaigns();
      toast.success('Campaign sent.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send campaign');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ message: 'Delete this campaign?', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await gqlFetch(`mutation DeleteCampaign($id: ID!) { deleteCampaign(id: $id) }`, { id });
      fetchCampaigns();
      toast.success('Campaign deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete campaign');
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
      toast.error(err instanceof Error ? err.message : 'Failed to load stats');
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
      toast.error(err instanceof Error ? err.message : 'Failed to preview audience');
    }
  };

  const openEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormName(campaign.name);
    setFormTemplateId(campaign.template.id);
    const rules = JSON.parse(campaign.targetingRules);
    setFormRules({
      checkOutFrom: rules.checkOutFrom || '', checkOutTo: rules.checkOutTo || '',
      checkInFrom: rules.checkInFrom || '', checkInTo: rules.checkInTo || '',
      status: rules.status || '', minAmount: rules.minAmount?.toString() || '',
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

  const filtered = statusFilter ? campaigns.filter((c) => c.status === statusFilter) : campaigns;

  const thStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '12px 20px',
    textAlign: 'left',
  };

  const tdStyle: React.CSSProperties = {
    padding: '14px 20px',
    borderTop: '1px solid var(--card-border)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <HotelSidebar />
      <main style={{ flex: 1, marginLeft: 'var(--sidebar-width, 280px)', padding: '32px', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {t('campaigns.title')}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('campaigns.subtitle')}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                href="/hotel-cms/campaigns/templates"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', borderRadius: 10,
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
                  textDecoration: 'none', transition: 'border-color 0.15s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/>
                </svg>
                {t('campaigns.manageTemplates')}
              </Link>
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'var(--gold)', color: '#1a1a14', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {t('campaigns.newCampaign')}
              </button>
            </div>
          </div>


          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {['', 'DRAFT', 'SENT', 'SENDING', 'SCHEDULED', 'FAILED'].map((s) => {
              const cfg = s ? STATUS_CONFIG[s] : null;
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: isActive ? 'none' : '1px solid var(--card-border)',
                    background: isActive ? (cfg ? cfg.bg : 'var(--surface-hover)') : 'transparent',
                    color: isActive ? (cfg ? cfg.color : 'var(--text-primary)') : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {s || t('common.all')}
                </button>
              );
            })}
          </div>

          {/* Campaigns table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>{t('campaigns.noCampaigns')}</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{t('common.name')}</th>
                    <th style={thStyle}>{t('campaigns.template')}</th>
                    <th style={thStyle}>{t('common.status')}</th>
                    <th style={thStyle}>{t('campaigns.sent')}</th>
                    <th style={thStyle}>{t('common.created')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((campaign) => {
                    const cfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;
                    const isHovered = hoveredRow === campaign.id;
                    return (
                      <tr
                        key={campaign.id}
                        onMouseEnter={() => setHoveredRow(campaign.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{ background: isHovered ? 'var(--surface-hover)' : 'transparent', transition: 'background 0.15s' }}
                      >
                        <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 500 }}>{campaign.name}</td>
                        <td style={tdStyle}>{campaign.template.name}</td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                            fontSize: 11, fontWeight: 600,
                            color: cfg.color, background: cfg.bg,
                          }}>
                            {campaign.status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {campaign.totalSent > 0 ? `${campaign.totalSent}/${campaign.totalRecipients}` : '—'}
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {campaign.status === 'SENT' && (
                              <button
                                onClick={() => handleViewStats(campaign.id)}
                                style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: 'none', background: 'rgba(74,222,128,0.1)', color: '#4ADE80', cursor: 'pointer' }}
                              >
                                {t('campaigns.stats')}
                              </button>
                            )}
                            {campaign.status === 'DRAFT' && (
                              <>
                                <button
                                  onClick={() => openEdit(campaign)}
                                  style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 500, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                >
                                  {t('common.edit')}
                                </button>
                                <button
                                  onClick={() => handleSend(campaign.id)}
                                  style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: 'none', background: 'var(--gold)', color: '#1a1a14', cursor: 'pointer' }}
                                >
                                  {t('campaigns.send')}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 500, border: 'none', background: 'rgba(251,113,133,0.08)', color: '#FB7185', cursor: 'pointer' }}
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ background: 'var(--sidebar-bg)', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--card-border)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {editingCampaign ? t('campaigns.editCampaign') : t('campaigns.newCampaign')}
                </h2>
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('campaigns.campaignName')}</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Winter Special"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box', ...inputStyle }}
                    className="focus:ring-1 focus:ring-[#C9A96E]"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('campaigns.template')}</label>
                  <select
                    value={formTemplateId}
                    onChange={(e) => setFormTemplateId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box', ...inputStyle }}
                    className="focus:ring-1 focus:ring-[#C9A96E]"
                  >
                    <option value="">{t('campaigns.selectTemplate')}</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name} — {tpl.subject}</option>
                    ))}
                  </select>
                </div>

                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 16 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('campaigns.targetingRules')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: t('filters.checkOutFrom'), key: 'checkOutFrom' },
                      { label: t('filters.checkOutTo'), key: 'checkOutTo' },
                      { label: t('filters.checkInFrom'), key: 'checkInFrom' },
                      { label: t('filters.checkInTo'), key: 'checkInTo' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</label>
                        <input
                          type="date"
                          value={formRules[key as keyof typeof formRules]}
                          onChange={(e) => setFormRules({ ...formRules, [key]: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box', ...inputStyle }}
                        />
                      </div>
                    ))}
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{t('common.status')}</label>
                      <select
                        value={formRules.status}
                        onChange={(e) => setFormRules({ ...formRules, status: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box', ...inputStyle }}
                      >
                        <option value="">{t('common.all')}</option>
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{t('campaigns.minAmount')}</label>
                      <input
                        type="number"
                        value={formRules.minAmount}
                        onChange={(e) => setFormRules({ ...formRules, minAmount: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box', ...inputStyle }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePreviewAudience}
                    style={{ marginTop: 12, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    {t('campaigns.previewAudience')}
                  </button>

                  {audiencePreview && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 9, background: 'rgba(96,184,212,0.06)', border: '1px solid rgba(96,184,212,0.2)' }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#60B8D4', marginBottom: 4 }}>
                        {audiencePreview.count} {t('campaigns.recipientsMatch')}
                      </p>
                      {audiencePreview.sampleRecipients.length > 0 && (
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {audiencePreview.sampleRecipients.map((r, i) => (
                            <li key={i} style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.email} {r.name ? `(${r.name})` : ''}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCreateOrUpdate}
                  disabled={!formName || !formTemplateId}
                  style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'var(--gold)', color: '#1a1a14', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!formName || !formTemplateId) ? 0.5 : 1 }}
                >
                  {editingCampaign ? t('campaigns.saveChanges') : t('campaigns.createCampaign')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Modal */}
        {showStatsModal && stats && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ background: 'var(--sidebar-bg)', borderRadius: 16, width: '100%', maxWidth: 420, border: '1px solid var(--card-border)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{t('campaigns.campaignStats')}</h2>
              </div>
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: t('campaigns.recipients'), value: stats.totalRecipients, color: 'var(--text-primary)', bg: 'var(--background)' },
                  { label: t('campaigns.sent'), value: stats.totalSent, color: '#4ADE80', bg: 'rgba(74,222,128,0.08)' },
                  { label: t('campaigns.opened'), value: stats.totalOpened, sub: `${(stats.openRate * 100).toFixed(1)}%`, color: '#60B8D4', bg: 'rgba(96,184,212,0.08)' },
                  { label: t('campaigns.clicked'), value: stats.totalClicked, sub: `${(stats.clickRate * 100).toFixed(1)}%`, color: '#A78BFA', bg: 'rgba(167,139,250,0.08)' },
                ].map(({ label, value, sub, color, bg }) => (
                  <div key={label} style={{ padding: 16, borderRadius: 10, background: bg, border: '1px solid var(--card-border)' }}>
                    <p style={{ fontSize: 11, color, marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 24, fontWeight: 700, color }}>{value}</p>
                    {sub && <p style={{ fontSize: 11, color, opacity: 0.7, marginTop: 2 }}>{sub}</p>}
                  </div>
                ))}
                {stats.totalFailed > 0 && (
                  <div style={{ gridColumn: '1/-1', padding: 16, borderRadius: 10, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)' }}>
                    <p style={{ fontSize: 11, color: '#FB7185', marginBottom: 4 }}>{t('campaigns.failed')}</p>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#FB7185' }}>{stats.totalFailed}</p>
                  </div>
                )}
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowStatsModal(null); setStats(null); }}
                  style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
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
