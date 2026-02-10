import { getPool } from '../event-sourcing/database';

export interface TargetingRules {
  checkInFrom?: string;
  checkInTo?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
  createdFrom?: string;
  createdTo?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  deduplicateByEmail?: boolean;
}

export interface TargetRecipient {
  email: string;
  name: string | null;
  reservationId?: string;
}

function buildTargetQuery(rules: TargetingRules): { sql: string; values: unknown[] } {
  const conditions: string[] = ['r.guest_email IS NOT NULL'];
  const values: unknown[] = [];
  let idx = 1;

  if (rules.checkInFrom) { conditions.push(`r.check_in_date >= $${idx++}`); values.push(rules.checkInFrom); }
  if (rules.checkInTo) { conditions.push(`r.check_in_date <= $${idx++}`); values.push(rules.checkInTo); }
  if (rules.checkOutFrom) { conditions.push(`r.check_out_date >= $${idx++}`); values.push(rules.checkOutFrom); }
  if (rules.checkOutTo) { conditions.push(`r.check_out_date <= $${idx++}`); values.push(rules.checkOutTo); }
  if (rules.createdFrom) { conditions.push(`r.created_at >= $${idx++}`); values.push(rules.createdFrom); }
  if (rules.createdTo) { conditions.push(`r.created_at <= $${idx++}`); values.push(rules.createdTo); }
  if (rules.status) { conditions.push(`r.status = $${idx++}`); values.push(rules.status); }
  if (rules.minAmount !== undefined) { conditions.push(`r.total_amount >= $${idx++}`); values.push(rules.minAmount); }
  if (rules.maxAmount !== undefined) { conditions.push(`r.total_amount <= $${idx++}`); values.push(rules.maxAmount); }
  if (rules.currency) { conditions.push(`r.currency = $${idx++}`); values.push(rules.currency); }

  const where = conditions.join(' AND ');
  const dedupe = rules.deduplicateByEmail !== false; // default true

  const sql = dedupe
    ? `SELECT DISTINCT ON (r.guest_email) r.guest_email as email, r.guest_name as name, r.id as reservation_id FROM reservations r WHERE ${where} ORDER BY r.guest_email, r.created_at DESC`
    : `SELECT r.guest_email as email, r.guest_name as name, r.id as reservation_id FROM reservations r WHERE ${where} ORDER BY r.created_at DESC`;

  return { sql, values };
}

export async function getTargetAudience(rules: TargetingRules): Promise<TargetRecipient[]> {
  const { sql, values } = buildTargetQuery(rules);
  const result = await getPool().query(sql, values);
  return result.rows.map((r: { email: string; name: string | null; reservation_id?: string }) => ({
    email: r.email,
    name: r.name,
    reservationId: r.reservation_id,
  }));
}

export async function previewAudience(rules: TargetingRules): Promise<{ count: number; sampleRecipients: TargetRecipient[] }> {
  const { sql, values } = buildTargetQuery(rules);

  // Get total count
  const countResult = await getPool().query(`SELECT COUNT(*) as count FROM (${sql}) sub`, values);
  const count = parseInt(countResult.rows[0].count, 10);

  // Get sample (first 10)
  const sampleResult = await getPool().query(`${sql} LIMIT 10`, values);
  const sampleRecipients = sampleResult.rows.map((r: { email: string; name: string | null }) => ({
    email: r.email,
    name: r.name,
  }));

  return { count, sampleRecipients };
}
