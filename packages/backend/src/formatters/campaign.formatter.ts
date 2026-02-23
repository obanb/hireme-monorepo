export function formatEmailTemplate(t: {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  preview_text: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: t.id,
    name: t.name,
    subject: t.subject,
    htmlBody: t.html_body,
    previewText: t.preview_text,
    isActive: t.is_active,
    createdAt: t.created_at.toISOString(),
    updatedAt: t.updated_at.toISOString(),
  };
}

export function formatCampaign(c: {
  id: string;
  name: string;
  template_id: string;
  targeting_rules: Record<string, unknown>;
  status: string;
  scheduled_at: Date | null;
  sent_at: Date | null;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    templateId: c.template_id,
    targetingRules: JSON.stringify(c.targeting_rules),
    status: c.status,
    scheduledAt: c.scheduled_at?.toISOString() || null,
    sentAt: c.sent_at?.toISOString() || null,
    totalRecipients: c.total_recipients,
    totalSent: c.total_sent,
    totalFailed: c.total_failed,
    createdAt: c.created_at.toISOString(),
    updatedAt: c.updated_at.toISOString(),
  };
}

export function formatCampaignSend(s: {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  status: string;
  opened_at: Date | null;
  clicked_at: Date | null;
  sent_at: Date | null;
}) {
  return {
    id: s.id,
    recipientEmail: s.recipient_email,
    recipientName: s.recipient_name,
    status: s.status,
    openedAt: s.opened_at?.toISOString() || null,
    clickedAt: s.clicked_at?.toISOString() || null,
    sentAt: s.sent_at?.toISOString() || null,
  };
}
