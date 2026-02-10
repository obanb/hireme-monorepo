'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HotelSidebar from '@/components/HotelSidebar';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await gqlFetch(`mutation DeleteTemplate($id: ID!) { deleteEmailTemplate(id: $id) }`, { id });
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
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
      <div className="flex min-h-screen bg-stone-50">
        <HotelSidebar />
        <main className="flex-1 ml-72 flex flex-col h-screen">
          {/* Editor header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEditor(false)}
                className="text-stone-500 hover:text-stone-900 text-sm font-medium"
              >
                &larr; Back
              </button>
              <h2 className="text-lg font-bold text-stone-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
            </div>
            <button
              onClick={handleSave}
              disabled={!formName || !formSubject || !formHtml}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              Save Template
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* Metadata inputs */}
          <div className="px-6 py-4 bg-white border-b border-stone-100 flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Template Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm"
                placeholder="e.g. Welcome"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Subject Line</label>
              <input
                type="text"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm"
                placeholder="e.g. Welcome to {{hotel_name}}"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Preview Text</label>
              <input
                type="text"
                value={formPreviewText}
                onChange={(e) => setFormPreviewText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm"
                placeholder="Brief preview shown in inbox"
              />
            </div>
          </div>

          {/* Split pane: HTML editor + Preview */}
          <div className="flex-1 flex overflow-hidden">
            {/* HTML editor */}
            <div className="w-1/2 flex flex-col border-r border-stone-200">
              <div className="px-4 py-2 bg-stone-100 text-xs font-medium text-stone-500 border-b border-stone-200">
                HTML Source
              </div>
              <textarea
                value={formHtml}
                onChange={(e) => setFormHtml(e.target.value)}
                className="flex-1 p-4 font-mono text-sm text-stone-800 resize-none focus:outline-none bg-white"
                placeholder="Enter HTML email template..."
                spellCheck={false}
              />
            </div>

            {/* Live preview */}
            <div className="w-1/2 flex flex-col">
              <div className="px-4 py-2 bg-stone-100 text-xs font-medium text-stone-500 border-b border-stone-200">
                Preview
              </div>
              <div className="flex-1 bg-stone-50 overflow-auto">
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
    <div className="flex min-h-screen bg-stone-50">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link href="/hotel-cms/campaigns" className="text-stone-400 hover:text-stone-600 text-sm">&larr; Campaigns</Link>
              </div>
              <h1 className="text-2xl font-bold text-stone-900">Email Templates</h1>
              <p className="text-stone-500 text-sm mt-1">Create and edit HTML email templates</p>
            </div>
            <button
              onClick={() => openEditor()}
              className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
            >
              + New Template
            </button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
              <button onClick={() => setError('')} className="ml-2 font-bold">x</button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-stone-400">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              No templates yet. Seed templates will be created when the backend starts.
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <div key={template.id} className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-stone-900">{template.name}</h3>
                        {!template.isActive && (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-500">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-stone-600 mt-1">{template.subject}</p>
                      {template.previewText && (
                        <p className="text-xs text-stone-400 mt-1">{template.previewText}</p>
                      )}
                      <p className="text-xs text-stone-400 mt-2">Updated {new Date(template.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPreview(showPreview === template.id ? null : template.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                      >
                        {showPreview === template.id ? 'Hide' : 'Preview'}
                      </button>
                      <button
                        onClick={() => openEditor(template)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {showPreview === template.id && (
                    <div className="mt-4 border-t border-stone-100 pt-4">
                      <div className="rounded-xl border border-stone-200 overflow-hidden" style={{ height: 400 }}>
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
                          className="px-3 py-2 rounded-lg border border-stone-200 text-sm flex-1"
                          placeholder="Send test to email..."
                        />
                        <button
                          onClick={() => handleSendTest(template.id)}
                          disabled={!testEmail || sending}
                          className="px-4 py-2 rounded-lg text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors disabled:opacity-50"
                        >
                          {sending ? 'Sending...' : 'Send Test'}
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
