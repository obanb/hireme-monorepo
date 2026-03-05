'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const inputStyle = { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' };
const inputClass = 'w-full px-3 py-2 rounded-md text-[13px] outline-none focus:ring-1 focus:ring-[#C9A96E]';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  previewText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formHtml, setFormHtml] = useState('');
  const [formPreviewText, setFormPreviewText] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

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

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await gqlFetch(`query { emailTemplates(includeInactive: true) { id name subject htmlBody previewText isActive createdAt updatedAt } }`);
      setTemplates(data.emailTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [gqlFetch]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openEditor = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormName(template.name);
      setFormSubject(template.subject);
      setFormHtml(template.htmlBody);
      setFormPreviewText(template.previewText || '');
    } else {
      setEditingTemplate(null);
      setFormName('');
      setFormSubject('');
      setFormHtml('');
      setFormPreviewText('');
    }
    setShowEditor(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      if (editingTemplate) {
        await gqlFetch(
          `mutation UpdateTemplate($id: ID!, $input: UpdateEmailTemplateInput!) { updateEmailTemplate(id: $id, input: $input) { id } }`,
          { id: editingTemplate.id, input: { name: formName, subject: formSubject, htmlBody: formHtml, previewText: formPreviewText || null } }
        );
      } else {
        await gqlFetch(
          `mutation CreateTemplate($input: CreateEmailTemplateInput!) { createEmailTemplate(input: $input) { id } }`,
          { input: { name: formName, subject: formSubject, htmlBody: formHtml, previewText: formPreviewText || null } }
        );
      }
      setShowEditor(false);
      fetchTemplates();
      toast.success(editingTemplate ? 'Template updated.' : 'Template created.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ message: 'Delete this template?', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await gqlFetch(`mutation DeleteTemplate($id: ID!) { deleteEmailTemplate(id: $id) }`, { id });
      fetchTemplates();
      toast.success('Template deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleSendTest = async (templateId: string) => {
    if (!testEmail) return;
    setSending(true);
    try {
      await gqlFetch(
        `mutation SendTest($templateId: ID!, $recipientEmail: String!) { sendTestEmail(templateId: $templateId, recipientEmail: $recipientEmail) }`,
        { templateId, recipientEmail: testEmail }
      );
      setTestEmail('');
      alert('Test email sent (or logged to console if Resend is not configured)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  if (showEditor) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <HotelSidebar />
        <main
          className="flex-1 flex flex-col h-screen"
          style={{ marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}
        >
          {/* Editor header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEditor(false)}
                style={{ color: 'var(--text-secondary)' }}
                className="text-[13px] font-medium hover:opacity-70 transition-opacity"
              >
                ← {t('common.back')}
              </button>
              <h2
                style={{ color: 'var(--text-primary)' }}
                className="text-[18px] font-semibold leading-none"
              >
                {editingTemplate ? t('campaigns.editTemplate') : t('campaigns.newTemplate')}
              </h2>
            </div>
            <button
              onClick={handleSave}
              disabled={!formName || !formSubject || !formHtml}
              style={{ background: 'var(--gold)', color: 'var(--background)' }}
              className="px-5 py-2 text-[13px] font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {t('campaigns.saveTemplate')}
            </button>
          </div>

          {error && (
            <div
              style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }}
              className="mx-6 mt-4 px-4 py-3 rounded-md text-[13px] flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError('')} className="ml-4 hover:opacity-70">✕</button>
            </div>
          )}

          {/* Metadata inputs */}
          <div
            className="px-6 py-4 flex gap-4"
            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--card-border)' }}
          >
            <div className="flex-1">
              <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">
                {t('campaigns.templateName')}
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. Welcome"
              />
            </div>
            <div className="flex-1">
              <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">
                {t('campaigns.subjectLine')}
              </label>
              <input
                type="text"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. Welcome to {{hotel_name}}"
              />
            </div>
            <div className="flex-1">
              <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5">
                {t('campaigns.previewText')}
              </label>
              <input
                type="text"
                value={formPreviewText}
                onChange={(e) => setFormPreviewText(e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="Brief preview shown in inbox"
              />
            </div>
          </div>

          {/* Split pane: HTML editor + Preview */}
          <div className="flex-1 flex overflow-hidden">
            {/* HTML editor */}
            <div className="w-1/2 flex flex-col" style={{ borderRight: '1px solid var(--card-border)' }}>
              <div
                className="px-4 py-2 text-[10px] font-semibold tracking-[0.15em] uppercase"
                style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
              >
                {t('campaigns.htmlSource')}
              </div>
              <textarea
                value={formHtml}
                onChange={(e) => setFormHtml(e.target.value)}
                className="flex-1 p-4 font-mono text-[13px] resize-none focus:outline-none"
                style={{ background: 'var(--background)', color: 'var(--text-primary)' }}
                placeholder="Enter HTML email template..."
                spellCheck={false}
              />
            </div>

            {/* Live preview */}
            <div className="w-1/2 flex flex-col">
              <div
                className="px-4 py-2 text-[10px] font-semibold tracking-[0.15em] uppercase"
                style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
              >
                {t('campaigns.preview')}
              </div>
              <div className="flex-1 overflow-auto" style={{ background: 'var(--surface)' }}>
                <iframe
                  srcDoc={formHtml || '<p style="padding:40px;color:#999;text-align:center;">Enter HTML to see preview</p>'}
                  className="w-full h-full border-0"
                  title="Template Preview"
                  sandbox=""
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <HotelSidebar />
      <main
        className="flex-1 px-8 py-8"
        style={{ marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="max-w-[1380px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <Link
                href="/hotel-cms/campaigns"
                style={{ color: 'var(--text-muted)' }}
                className="text-[11px] font-medium hover:opacity-70 transition-opacity block mb-2"
              >
                ← {t('campaigns.backToCampaigns')}
              </Link>
              <h1
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                className="text-[2.75rem] font-bold tracking-tight mb-1"
              >
                {t('campaigns.emailTemplates')}
              </h1>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">
                {t('campaigns.templatesSubtitle')}
              </p>
            </div>
            <button
              onClick={() => openEditor()}
              style={{ background: 'var(--gold)', color: 'var(--background)' }}
              className="px-5 py-2.5 text-[13px] font-semibold rounded-md hover:opacity-90 transition-opacity"
            >
              {t('campaigns.newTemplate')}
            </button>
          </div>

          {error && (
            <div
              style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)', color: '#FB7185' }}
              className="px-4 py-3 rounded-md text-[13px] flex items-center justify-between mb-5"
            >
              <span>{error}</span>
              <button onClick={() => setError('')} className="ml-4 hover:opacity-70">✕</button>
            </div>
          )}

          {loading ? (
            <div style={{ color: 'var(--text-muted)' }} className="py-16 text-center text-[13px] animate-pulse">
              {t('common.loading')}
            </div>
          ) : templates.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }} className="py-16 text-center">
              <p style={{ color: 'var(--text-primary)' }} className="text-[15px] font-semibold mb-1">
                {t('campaigns.noTemplates')}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
                  className="rounded-xl p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          style={{ color: 'var(--text-primary)' }}
                          className="text-[18px] font-semibold leading-none"
                        >
                          {template.name}
                        </h3>
                        {!template.isActive && (
                          <span
                            style={{ color: '#FBBF24', background: 'rgba(251,191,36,0.10)' }}
                            className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-md"
                          >
                            {t('common.inactive')}
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-secondary)' }} className="text-[13px] mt-1">
                        {template.subject}
                      </p>
                      {template.previewText && (
                        <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-1">
                          {template.previewText}
                        </p>
                      )}
                      <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-2 tabular-nums">
                        Updated {new Date(template.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPreview(showPreview === template.id ? null : template.id)}
                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
                        className="px-3 py-1.5 rounded-md text-[12px] font-medium hover:opacity-80 transition-opacity"
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {showPreview === template.id ? t('campaigns.hide') : t('campaigns.preview')}
                      </button>
                      <button
                        onClick={() => openEditor(template)}
                        style={{ color: 'var(--gold)' }}
                        className="px-3 py-1.5 rounded-md text-[12px] font-semibold hover:opacity-70 transition-opacity"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        style={{ color: '#FB7185', background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.20)' }}
                        className="px-3 py-1.5 rounded-md text-[12px] font-medium hover:opacity-80 transition-opacity"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>

                  {showPreview === template.id && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                      <div className="rounded-xl overflow-hidden" style={{ height: 400, border: '1px solid var(--card-border)' }}>
                        <iframe
                          srcDoc={template.htmlBody}
                          className="w-full h-full border-0"
                          title={`Preview: ${template.name}`}
                          sandbox=""
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="px-3 py-2 rounded-md text-[13px] flex-1 outline-none focus:ring-1 focus:ring-[#C9A96E]"
                          style={inputStyle}
                          placeholder="Send test to email..."
                        />
                        <button
                          onClick={() => handleSendTest(template.id)}
                          disabled={!testEmail || sending}
                          style={{ background: 'var(--gold)', color: 'var(--background)' }}
                          className="px-4 py-2 rounded-md text-[12.5px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {sending ? t('auth.sending') : t('campaigns.sendTest')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
