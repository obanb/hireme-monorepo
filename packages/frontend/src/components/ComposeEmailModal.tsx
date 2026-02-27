'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '../context/LocaleContext';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

interface ComposeEmailModalProps {
  to: string;
  toName?: string | null;
  onClose: () => void;
}

const QUICK_TEMPLATES = [
  {
    label: 'Welcome',
    subject: 'Welcome to our hotel',
    body: 'Dear {name},\n\nWe are delighted to welcome you to our hotel. Please do not hesitate to contact us if you need anything during your stay.\n\nWarm regards,\nHotel Reception',
  },
  {
    label: 'Check-in reminder',
    subject: 'Your upcoming check-in',
    body: 'Dear {name},\n\nThis is a friendly reminder about your upcoming reservation with us. We look forward to welcoming you.\n\nIf you have any special requests or questions, please feel free to reach out.\n\nWarm regards,\nHotel Reception',
  },
  {
    label: 'Check-out info',
    subject: 'Check-out information',
    body: 'Dear {name},\n\nWe hope you enjoyed your stay with us. As a reminder, check-out time is 11:00 AM.\n\nIf you need a late check-out or have any questions, please contact the reception.\n\nWarm regards,\nHotel Reception',
  },
  {
    label: 'Invoice ready',
    subject: 'Your invoice is ready',
    body: 'Dear {name},\n\nYour invoice for your recent stay is now ready. Please visit the reception or reply to this email if you have any questions regarding the charges.\n\nThank you for staying with us.\n\nWarm regards,\nHotel Reception',
  },
];

export default function ComposeEmailModal({ to, toName, onClose }: ComposeEmailModalProps) {
  const { t } = useLocale();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    const name = toName ?? to;
    setSubject(tpl.subject);
    setBody(tpl.body.replace(/{name}/g, name));
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation SendEmail($to: String!, $toName: String, $subject: String!, $body: String!) {
            sendGuestEmail(to: $to, toName: $toName, subject: $subject, body: $body)
          }`,
          variables: { to, toName: toName ?? null, subject, body },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setSent(true);
      setTimeout(onClose, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="p-6 border-b border-stone-100 dark:border-stone-700 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {t('email.compose')}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-stone-400">{t('email.to')}:</span>
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  {toName ? `${toName} <${to}>` : to}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Quick templates */}
          <div>
            <div className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
              {t('email.templates')}
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => applyTemplate(tpl)}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-600 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700 hover:border-stone-300 dark:hover:border-stone-500 transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              {t('email.subject')}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('email.subjectPlaceholder')}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-300"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              {t('email.body')}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('email.bodyPlaceholder')}
              rows={8}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-300 resize-none font-mono"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Sent confirmation */}
          {sent && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
              <span className="text-lg">✓</span> {t('email.sent')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-100 dark:border-stone-700 flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 text-sm font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || sent || !subject.trim() || !body.trim()}
            className="px-5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white dark:border-stone-900 border-t-transparent rounded-full animate-spin" />
                {t('email.sending')}
              </>
            ) : (
              <>
                <span>✉</span>
                {t('email.send')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
