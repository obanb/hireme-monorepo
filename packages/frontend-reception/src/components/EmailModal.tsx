'use client';

import { useState } from 'react';

// ── Templates ──────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    subject: 'We look forward to welcoming you',
    body: `Dear {{guestName}},

We are delighted to confirm your upcoming stay at {{hotelName}} from {{arrival}} to {{departure}}.

To ensure everything is perfect for your arrival, please let us know if you have any special requests or preferences. Our team is ready to make your stay exceptional.

If you would like to complete your pre-check-in online, simply reply to this email and we will send you the secure link.

We look forward to welcoming you.`,
  },
  {
    id: 'precheckin',
    label: 'Pre-Check-In Reminder',
    subject: 'Pre-check-in available for your upcoming stay',
    body: `Dear {{guestName}},

Your arrival at {{hotelName}} is just around the corner ({{arrival}}).

To save you time at the front desk, you can complete your pre-check-in now. Please fill in your personal details and we will prepare everything for your smooth arrival.

Your estimated check-in time is 15:00. If you need early check-in, please let us know in advance and we will do our best to accommodate you.

We are looking forward to your visit!`,
  },
  {
    id: 'upsell',
    label: 'Special Offer',
    subject: 'Exclusive offers for your stay',
    body: `Dear {{guestName}},

We are excited to share some exclusive enhancements available for your stay at {{hotelName}}:

• Room upgrade — enjoy more space and views
• Spa & wellness day pass — relax before or after your journey
• Romantic package — flowers, champagne & turndown service
• Late checkout until 14:00

To take advantage of any of these offers, simply reply to this email or call our front desk. Prices available on request.

We hope to make your stay truly memorable.`,
  },
  {
    id: 'departure',
    label: 'Departure Reminder',
    subject: 'Reminder: your departure from {{hotelName}}',
    body: `Dear {{guestName}},

We hope you have enjoyed your stay at {{hotelName}}. As a reminder, your departure is scheduled for {{departure}}.

Standard checkout is by 11:00. If you need a late checkout, please contact the front desk and we will do our best to assist you.

We would love to hear about your experience — a short review on your preferred platform means a great deal to us and our team.

Safe travels and we hope to welcome you back soon!`,
  },
];

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EmailModalProps {
  guestName: string;
  ownerEmail: string;
  hotelName: string;
  arrival: string;
  departure: string;
  bookingId: number;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function EmailModal({
  guestName, ownerEmail, hotelName, arrival, departure, bookingId, onClose,
}: EmailModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [sent, setSent]         = useState(false);

  const vars = {
    guestName,
    hotelName,
    arrival:   fmtDate(arrival),
    departure: fmtDate(departure),
  };

  const applyTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl.id);
    setSubject(fillTemplate(tpl.subject, vars));
    setBody(fillTemplate(tpl.body, vars));
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    setSubject('');
    setBody('');
  };

  const handleSend = () => {
    console.log('[Email] send to', ownerEmail, {
      bookingId,
      subject,
      body,
      template: selectedTemplate ?? 'custom',
    });
    setSent(true);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 901,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', maxWidth: 620, maxHeight: '90vh',
          background: 'var(--bg)', borderRadius: 14,
          border: '1px solid var(--border-strong)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          pointerEvents: 'all', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 20px', flexShrink: 0,
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#3B82F6',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                Email to {guestName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>
                {ownerEmail} · booking #{bookingId}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                border: '1px solid var(--border)', background: 'var(--bg-surface)',
                color: 'var(--fg-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {sent ? (
            /* ── Sent state ── */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, padding: 40,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#F0FDF4', border: '2px solid #86EFAC',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>Email sent</div>
              <div style={{ fontSize: 12, color: 'var(--fg-subtle)', textAlign: 'center' }}>
                Mock send to <strong>{ownerEmail}</strong><br/>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>"{subject}"</span>
              </div>
              <button
                onClick={onClose}
                style={{
                  marginTop: 8, padding: '8px 22px', borderRadius: 8,
                  border: 'none', background: 'var(--accent)', color: '#fff',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Template picker */}
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 8,
                  }}>
                    Template
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {/* No template option */}
                    <button
                      onClick={clearTemplate}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 12,
                        cursor: 'pointer', fontWeight: selectedTemplate === null ? 600 : 400,
                        background: selectedTemplate === null ? '#1E293B' : 'var(--bg-surface)',
                        color: selectedTemplate === null ? '#fff' : 'var(--fg-muted)',
                        border: `1px solid ${selectedTemplate === null ? '#1E293B' : 'var(--border)'}`,
                        transition: 'all 0.12s',
                      }}
                    >
                      ✏ Custom
                    </button>
                    {TEMPLATES.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl)}
                        style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 12,
                          cursor: 'pointer', fontWeight: selectedTemplate === tpl.id ? 600 : 400,
                          background: selectedTemplate === tpl.id ? '#3B82F6' : 'var(--bg-surface)',
                          color: selectedTemplate === tpl.id ? '#fff' : 'var(--fg-muted)',
                          border: `1px solid ${selectedTemplate === tpl.id ? '#3B82F6' : 'var(--border)'}`,
                          transition: 'all 0.12s',
                        }}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--fg-subtle)', marginBottom: 6,
                  }}>
                    Subject
                  </label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Email subject…"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '8px 12px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg-surface)',
                      color: 'var(--fg)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none',
                    }}
                  />
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--fg-subtle)', marginBottom: 6,
                  }}>
                    Message
                  </label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Write your message…"
                    rows={10}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 12px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg-surface)',
                      color: 'var(--fg)', fontSize: 12.5, fontFamily: 'var(--font-body)',
                      lineHeight: 1.6, resize: 'vertical', outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 20px', flexShrink: 0,
                borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ flex: 1, fontSize: 11, color: 'var(--fg-subtle)' }}>
                  To: <span style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{ownerEmail}</span>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    padding: '8px 16px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg-surface)',
                    color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 13,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={!subject.trim() || !body.trim()}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: !subject.trim() || !body.trim() ? 'var(--border)' : '#3B82F6',
                    color: !subject.trim() || !body.trim() ? 'var(--fg-subtle)' : '#fff',
                    cursor: !subject.trim() || !body.trim() ? 'default' : 'pointer',
                    fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Send Email
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
