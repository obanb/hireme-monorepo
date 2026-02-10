import { getPool } from '../event-sourcing/database';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  preview_text: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function createTemplate(data: {
  name: string;
  subject: string;
  htmlBody: string;
  previewText?: string;
}): Promise<EmailTemplate> {
  const result = await getPool().query(
    `INSERT INTO email_templates (name, subject, html_body, preview_text)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.subject, data.htmlBody, data.previewText || null]
  );
  return result.rows[0];
}

export async function findTemplateById(id: string): Promise<EmailTemplate | null> {
  const result = await getPool().query('SELECT * FROM email_templates WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateTemplate(
  id: string,
  data: { name?: string; subject?: string; htmlBody?: string; previewText?: string; isActive?: boolean }
): Promise<EmailTemplate | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx++}`); values.push(data.name); }
  if (data.subject !== undefined) { sets.push(`subject = $${idx++}`); values.push(data.subject); }
  if (data.htmlBody !== undefined) { sets.push(`html_body = $${idx++}`); values.push(data.htmlBody); }
  if (data.previewText !== undefined) { sets.push(`preview_text = $${idx++}`); values.push(data.previewText); }
  if (data.isActive !== undefined) { sets.push(`is_active = $${idx++}`); values.push(data.isActive); }

  if (sets.length === 0) return findTemplateById(id);

  sets.push(`updated_at = NOW()`);
  values.push(id);

  const result = await getPool().query(
    `UPDATE email_templates SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const result = await getPool().query('DELETE FROM email_templates WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listTemplates(includeInactive?: boolean): Promise<EmailTemplate[]> {
  const query = includeInactive
    ? 'SELECT * FROM email_templates ORDER BY created_at DESC'
    : 'SELECT * FROM email_templates WHERE is_active = true ORDER BY created_at DESC';
  const result = await getPool().query(query);
  return result.rows;
}

export async function templateCount(): Promise<number> {
  const result = await getPool().query('SELECT COUNT(*) as count FROM email_templates');
  return parseInt(result.rows[0].count, 10);
}
