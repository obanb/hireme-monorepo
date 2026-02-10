import { getPool } from '../event-sourcing/database';

export interface Campaign {
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
}

export async function createCampaign(data: {
  name: string;
  templateId: string;
  targetingRules: string;
  scheduledAt?: string;
}): Promise<Campaign> {
  const result = await getPool().query(
    `INSERT INTO campaigns (name, template_id, targeting_rules, scheduled_at)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING *`,
    [data.name, data.templateId, data.targetingRules, data.scheduledAt || null]
  );
  return result.rows[0];
}

export async function findCampaignById(id: string): Promise<Campaign | null> {
  const result = await getPool().query('SELECT * FROM campaigns WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateCampaign(
  id: string,
  data: { name?: string; templateId?: string; targetingRules?: string; scheduledAt?: string }
): Promise<Campaign | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx++}`); values.push(data.name); }
  if (data.templateId !== undefined) { sets.push(`template_id = $${idx++}`); values.push(data.templateId); }
  if (data.targetingRules !== undefined) { sets.push(`targeting_rules = $${idx++}::jsonb`); values.push(data.targetingRules); }
  if (data.scheduledAt !== undefined) { sets.push(`scheduled_at = $${idx++}`); values.push(data.scheduledAt); }

  if (sets.length === 0) return findCampaignById(id);

  sets.push(`updated_at = NOW()`);
  values.push(id);

  const result = await getPool().query(
    `UPDATE campaigns SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function updateCampaignStatus(
  id: string,
  status: string,
  extra?: { sentAt?: Date; totalRecipients?: number; totalSent?: number; totalFailed?: number }
): Promise<Campaign | null> {
  const sets: string[] = ['status = $2', 'updated_at = NOW()'];
  const values: unknown[] = [id, status];
  let idx = 3;

  if (extra?.sentAt !== undefined) { sets.push(`sent_at = $${idx++}`); values.push(extra.sentAt); }
  if (extra?.totalRecipients !== undefined) { sets.push(`total_recipients = $${idx++}`); values.push(extra.totalRecipients); }
  if (extra?.totalSent !== undefined) { sets.push(`total_sent = $${idx++}`); values.push(extra.totalSent); }
  if (extra?.totalFailed !== undefined) { sets.push(`total_failed = $${idx++}`); values.push(extra.totalFailed); }

  const result = await getPool().query(
    `UPDATE campaigns SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const result = await getPool().query('DELETE FROM campaigns WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const result = await getPool().query('SELECT * FROM campaigns ORDER BY created_at DESC');
  return result.rows;
}
