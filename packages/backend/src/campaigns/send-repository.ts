import { getPool } from '../event-sourcing/database';

export interface CampaignSend {
  id: string;
  campaign_id: string;
  recipient_email: string;
  recipient_name: string | null;
  reservation_id: string | null;
  status: string;
  resend_message_id: string | null;
  opened_at: Date | null;
  clicked_at: Date | null;
  error_message: string | null;
  sent_at: Date | null;
  created_at: Date;
}

export async function createSendBatch(
  campaignId: string,
  recipients: Array<{ email: string; name: string | null; reservationId?: string }>
): Promise<CampaignSend[]> {
  if (recipients.length === 0) return [];

  const values: unknown[] = [];
  const placeholders: string[] = [];
  let idx = 1;

  for (const r of recipients) {
    placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    values.push(campaignId, r.email, r.name, r.reservationId || null);
  }

  const result = await getPool().query(
    `INSERT INTO campaign_sends (campaign_id, recipient_email, recipient_name, reservation_id)
     VALUES ${placeholders.join(', ')}
     RETURNING *`,
    values
  );
  return result.rows;
}

export async function updateSendStatus(
  id: string,
  status: string,
  extra?: { resendMessageId?: string; errorMessage?: string }
): Promise<void> {
  const sets: string[] = ['status = $2'];
  const values: unknown[] = [id, status];
  let idx = 3;

  if (status === 'SENT') { sets.push(`sent_at = NOW()`); }
  if (extra?.resendMessageId) { sets.push(`resend_message_id = $${idx++}`); values.push(extra.resendMessageId); }
  if (extra?.errorMessage) { sets.push(`error_message = $${idx++}`); values.push(extra.errorMessage); }

  await getPool().query(
    `UPDATE campaign_sends SET ${sets.join(', ')} WHERE id = $1`,
    values
  );
}

export async function listSends(
  campaignId: string,
  limit?: number,
  offset?: number
): Promise<CampaignSend[]> {
  const result = await getPool().query(
    `SELECT * FROM campaign_sends WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [campaignId, limit || 100, offset || 0]
  );
  return result.rows;
}

export async function getSendById(id: string): Promise<CampaignSend | null> {
  const result = await getPool().query('SELECT * FROM campaign_sends WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function recordEvent(
  sendId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await getPool().query(
    `INSERT INTO campaign_events (send_id, event_type, metadata) VALUES ($1, $2, $3::jsonb)`,
    [sendId, eventType, metadata ? JSON.stringify(metadata) : null]
  );

  // Update the send record timestamps
  if (eventType === 'OPEN') {
    await getPool().query(
      `UPDATE campaign_sends SET opened_at = COALESCE(opened_at, NOW()) WHERE id = $1`,
      [sendId]
    );
  } else if (eventType === 'CLICK') {
    await getPool().query(
      `UPDATE campaign_sends SET clicked_at = COALESCE(clicked_at, NOW()) WHERE id = $1`,
      [sendId]
    );
  }
}

export interface CampaignStatsRow {
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStatsRow> {
  const result = await getPool().query(
    `SELECT
       c.total_recipients,
       c.total_sent,
       c.total_failed,
       COUNT(DISTINCT cs.id) FILTER (WHERE cs.opened_at IS NOT NULL)::int as total_opened,
       COUNT(DISTINCT cs.id) FILTER (WHERE cs.clicked_at IS NOT NULL)::int as total_clicked
     FROM campaigns c
     LEFT JOIN campaign_sends cs ON cs.campaign_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [campaignId]
  );
  return result.rows[0] || { total_recipients: 0, total_sent: 0, total_failed: 0, total_opened: 0, total_clicked: 0 };
}
