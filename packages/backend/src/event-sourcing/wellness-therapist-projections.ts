/**
 * WellnessTherapist Projections
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';

export async function applyWellnessTherapistProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  switch (event.type) {
    case 'WellnessTherapistCreated':
      await handleCreated(client, streamId, event);
      break;
    case 'WellnessTherapistUpdated':
      await handleUpdated(client, streamId, event);
      break;
    case 'WellnessTherapistDeleted':
      await handleDeleted(client, streamId, event);
      break;
  }
}

async function handleCreated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    code: string;
    name: string;
    serviceTypesBitMask?: number;
    isVirtual?: boolean;
  };

  await client.query(
    `INSERT INTO wellness_therapists (
      id, code, name, service_types_bit_mask, is_virtual, is_active, version, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code, name = EXCLUDED.name,
      service_types_bit_mask = EXCLUDED.service_types_bit_mask,
      is_virtual = EXCLUDED.is_virtual, is_active = EXCLUDED.is_active,
      version = EXCLUDED.version, updated_at = NOW()`,
    [streamId, data.code, data.name, data.serviceTypesBitMask ?? 0, data.isVirtual ?? false, true, event.version]
  );
}

async function handleUpdated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    code?: string;
    name?: string;
    serviceTypesBitMask?: number;
    isVirtual?: boolean;
    isActive?: boolean;
  };

  const updates: string[] = ['version = $2', 'updated_at = NOW()'];
  const params: (string | number | boolean)[] = [streamId, event.version];

  if (data.code !== undefined) { params.push(data.code); updates.push(`code = $${params.length}`); }
  if (data.name !== undefined) { params.push(data.name); updates.push(`name = $${params.length}`); }
  if (data.serviceTypesBitMask !== undefined) { params.push(data.serviceTypesBitMask); updates.push(`service_types_bit_mask = $${params.length}`); }
  if (data.isVirtual !== undefined) { params.push(data.isVirtual); updates.push(`is_virtual = $${params.length}`); }
  if (data.isActive !== undefined) { params.push(data.isActive); updates.push(`is_active = $${params.length}`); }

  await client.query(`UPDATE wellness_therapists SET ${updates.join(', ')} WHERE id = $1`, params);
}

async function handleDeleted(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  await client.query(
    `UPDATE wellness_therapists SET is_active = false, version = $2, updated_at = NOW() WHERE id = $1`,
    [streamId, event.version]
  );
}

export async function getWellnessTherapist(client: PoolClient, id: string) {
  const result = await client.query(`SELECT * FROM wellness_therapists WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    serviceTypesBitMask: row.service_types_bit_mask,
    isVirtual: row.is_virtual,
    isActive: row.is_active,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listWellnessTherapists(client: PoolClient, includeInactive: boolean = false) {
  let query = 'SELECT * FROM wellness_therapists';
  if (!includeInactive) query += ' WHERE is_active = true';
  query += ' ORDER BY name ASC';
  const result = await client.query(query);
  return result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    serviceTypesBitMask: row.service_types_bit_mask,
    isVirtual: row.is_virtual,
    isActive: row.is_active,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
