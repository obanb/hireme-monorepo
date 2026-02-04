/**
 * WellnessService Projections
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';

export async function applyWellnessServiceProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  switch (event.type) {
    case 'WellnessServiceCreated':
      await handleCreated(client, streamId, event);
      break;
    case 'WellnessServiceUpdated':
      await handleUpdated(client, streamId, event);
      break;
    case 'WellnessServiceDeleted':
      await handleDeleted(client, streamId, event);
      break;
  }
}

async function handleCreated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    name: string;
    priceNormal: number;
    priceOBE?: number;
    priceOVE?: number;
    vatCharge: number;
    serviceTypeBitMask?: number;
    duration: number;
    pauseBefore?: number;
    pauseAfter?: number;
    needsTherapist?: boolean;
    needsRoom?: boolean;
  };

  await client.query(
    `INSERT INTO wellness_services (
      id, name, price_normal, price_obe, price_ove, vat_charge, service_type_bit_mask,
      duration, pause_before, pause_after, needs_therapist, needs_room,
      is_active, version, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, price_normal = EXCLUDED.price_normal,
      price_obe = EXCLUDED.price_obe, price_ove = EXCLUDED.price_ove,
      vat_charge = EXCLUDED.vat_charge, service_type_bit_mask = EXCLUDED.service_type_bit_mask,
      duration = EXCLUDED.duration, pause_before = EXCLUDED.pause_before,
      pause_after = EXCLUDED.pause_after, needs_therapist = EXCLUDED.needs_therapist,
      needs_room = EXCLUDED.needs_room, is_active = EXCLUDED.is_active,
      version = EXCLUDED.version, updated_at = NOW()`,
    [
      streamId, data.name, data.priceNormal, data.priceOBE ?? null, data.priceOVE ?? null,
      data.vatCharge, data.serviceTypeBitMask ?? 0, data.duration,
      data.pauseBefore ?? 0, data.pauseAfter ?? 0,
      data.needsTherapist ?? true, data.needsRoom ?? true, true, event.version
    ]
  );
}

async function handleUpdated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    name?: string;
    priceNormal?: number;
    priceOBE?: number;
    priceOVE?: number;
    vatCharge?: number;
    serviceTypeBitMask?: number;
    duration?: number;
    pauseBefore?: number;
    pauseAfter?: number;
    needsTherapist?: boolean;
    needsRoom?: boolean;
    isActive?: boolean;
  };

  const updates: string[] = ['version = $2', 'updated_at = NOW()'];
  const params: (string | number | boolean | null)[] = [streamId, event.version];

  if (data.name !== undefined) { params.push(data.name); updates.push(`name = $${params.length}`); }
  if (data.priceNormal !== undefined) { params.push(data.priceNormal); updates.push(`price_normal = $${params.length}`); }
  if (data.priceOBE !== undefined) { params.push(data.priceOBE); updates.push(`price_obe = $${params.length}`); }
  if (data.priceOVE !== undefined) { params.push(data.priceOVE); updates.push(`price_ove = $${params.length}`); }
  if (data.vatCharge !== undefined) { params.push(data.vatCharge); updates.push(`vat_charge = $${params.length}`); }
  if (data.serviceTypeBitMask !== undefined) { params.push(data.serviceTypeBitMask); updates.push(`service_type_bit_mask = $${params.length}`); }
  if (data.duration !== undefined) { params.push(data.duration); updates.push(`duration = $${params.length}`); }
  if (data.pauseBefore !== undefined) { params.push(data.pauseBefore); updates.push(`pause_before = $${params.length}`); }
  if (data.pauseAfter !== undefined) { params.push(data.pauseAfter); updates.push(`pause_after = $${params.length}`); }
  if (data.needsTherapist !== undefined) { params.push(data.needsTherapist); updates.push(`needs_therapist = $${params.length}`); }
  if (data.needsRoom !== undefined) { params.push(data.needsRoom); updates.push(`needs_room = $${params.length}`); }
  if (data.isActive !== undefined) { params.push(data.isActive); updates.push(`is_active = $${params.length}`); }

  await client.query(`UPDATE wellness_services SET ${updates.join(', ')} WHERE id = $1`, params);
}

async function handleDeleted(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  await client.query(
    `UPDATE wellness_services SET is_active = false, version = $2, updated_at = NOW() WHERE id = $1`,
    [streamId, event.version]
  );
}

export async function getWellnessService(client: PoolClient, id: string) {
  const result = await client.query(`SELECT * FROM wellness_services WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id, name: row.name, priceNormal: parseFloat(row.price_normal),
    priceOBE: row.price_obe ? parseFloat(row.price_obe) : null,
    priceOVE: row.price_ove ? parseFloat(row.price_ove) : null,
    vatCharge: parseFloat(row.vat_charge), serviceTypeBitMask: row.service_type_bit_mask,
    duration: row.duration, pauseBefore: row.pause_before, pauseAfter: row.pause_after,
    needsTherapist: row.needs_therapist, needsRoom: row.needs_room,
    isActive: row.is_active, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function listWellnessServices(client: PoolClient, includeInactive: boolean = false) {
  let query = 'SELECT * FROM wellness_services';
  if (!includeInactive) query += ' WHERE is_active = true';
  query += ' ORDER BY name ASC';
  const result = await client.query(query);
  return result.rows.map((row) => ({
    id: row.id, name: row.name, priceNormal: parseFloat(row.price_normal),
    priceOBE: row.price_obe ? parseFloat(row.price_obe) : null,
    priceOVE: row.price_ove ? parseFloat(row.price_ove) : null,
    vatCharge: parseFloat(row.vat_charge), serviceTypeBitMask: row.service_type_bit_mask,
    duration: row.duration, pauseBefore: row.pause_before, pauseAfter: row.pause_after,
    needsTherapist: row.needs_therapist, needsRoom: row.needs_room,
    isActive: row.is_active, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
  }));
}
