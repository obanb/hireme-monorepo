/**
 * Voucher Projections
 */
import { PoolClient } from 'pg';
import { StoredEvent } from './event-store';
import { CustomerData, GiftData } from './voucher-aggregate';

export async function applyVoucherProjection(
  client: PoolClient,
  streamId: string,
  event: StoredEvent
): Promise<void> {
  switch (event.type) {
    case 'VoucherCreated':
      await handleCreated(client, streamId, event);
      break;
    case 'VoucherUpdated':
      await handleUpdated(client, streamId, event);
      break;
    case 'VoucherCanceled':
      await handleCanceled(client, streamId, event);
      break;
    case 'VoucherUsed':
      await handleUsed(client, streamId, event);
      break;
    case 'VoucherPaid':
      await handlePaid(client, streamId, event);
      break;
    case 'VoucherDeleted':
      await handleDeleted(client, streamId, event);
      break;
  }
}

async function handleCreated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    code?: string;
    number: string;
    hotel?: number;
    lang?: string;
    createdAt: string;
    variableSymbol: number;
    price: number;
    purchasePrice?: number;
    currency?: string;
    validity: string;
    paymentType?: string;
    deliveryType?: string;
    deliveryPrice?: number;
    note?: string;
    format?: string;
    gift?: string;
    giftMessage?: string;
    applicableInBookolo?: boolean;
    isPrivateType?: boolean;
    isFreeType?: boolean;
    customerData?: Partial<CustomerData>;
    giftData?: Partial<GiftData>;
  };

  await client.query(
    `INSERT INTO vouchers (
      id, code, number, hotel, lang, created_at, variable_symbol,
      active, price, purchase_price, currency, validity, payment_type,
      delivery_type, delivery_price, note, format, gift, gift_message,
      value_total, value_remaining, value_used, applicable_in_bookolo,
      is_private_type, is_free_type, customer_data, gift_data, version, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW())
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code, number = EXCLUDED.number, hotel = EXCLUDED.hotel,
      lang = EXCLUDED.lang, created_at = EXCLUDED.created_at,
      variable_symbol = EXCLUDED.variable_symbol, active = EXCLUDED.active,
      price = EXCLUDED.price, purchase_price = EXCLUDED.purchase_price,
      currency = EXCLUDED.currency, validity = EXCLUDED.validity,
      payment_type = EXCLUDED.payment_type, delivery_type = EXCLUDED.delivery_type,
      delivery_price = EXCLUDED.delivery_price, note = EXCLUDED.note,
      format = EXCLUDED.format, gift = EXCLUDED.gift, gift_message = EXCLUDED.gift_message,
      value_total = EXCLUDED.value_total, value_remaining = EXCLUDED.value_remaining,
      value_used = EXCLUDED.value_used, applicable_in_bookolo = EXCLUDED.applicable_in_bookolo,
      is_private_type = EXCLUDED.is_private_type, is_free_type = EXCLUDED.is_free_type,
      customer_data = EXCLUDED.customer_data, gift_data = EXCLUDED.gift_data,
      version = EXCLUDED.version, updated_at = NOW()`,
    [
      streamId,
      data.code ?? null,
      data.number,
      data.hotel ?? 0,
      data.lang ?? 'cs',
      data.createdAt,
      data.variableSymbol,
      true,
      data.price,
      data.purchasePrice ?? data.price,
      data.currency ?? 'CZK',
      data.validity,
      data.paymentType ?? 'payment-online-card',
      data.deliveryType ?? 'email',
      data.deliveryPrice ?? 0,
      data.note ?? null,
      data.format ?? 'DL',
      data.gift ?? null,
      data.giftMessage ?? null,
      data.price,
      data.price,
      0,
      data.applicableInBookolo ?? false,
      data.isPrivateType ?? false,
      data.isFreeType ?? data.price === 0,
      JSON.stringify(data.customerData ?? {}),
      JSON.stringify(data.giftData ?? {}),
      event.version,
    ]
  );
}

async function handleUpdated(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    code?: string;
    price?: number;
    purchasePrice?: number;
    currency?: string;
    validity?: string;
    paymentType?: string;
    deliveryType?: string;
    deliveryPrice?: number;
    note?: string;
    format?: string;
    gift?: string;
    giftMessage?: string;
    active?: boolean;
    applicableInBookolo?: boolean;
    isPrivateType?: boolean;
    customerData?: Partial<CustomerData>;
    giftData?: Partial<GiftData>;
  };

  const updates: string[] = ['version = $2', 'updated_at = NOW()'];
  const params: (string | number | boolean | null)[] = [streamId, event.version];

  if (data.code !== undefined) { params.push(data.code); updates.push(`code = $${params.length}`); }
  if (data.price !== undefined) { params.push(data.price); updates.push(`price = $${params.length}`); }
  if (data.purchasePrice !== undefined) { params.push(data.purchasePrice); updates.push(`purchase_price = $${params.length}`); }
  if (data.currency !== undefined) { params.push(data.currency); updates.push(`currency = $${params.length}`); }
  if (data.validity !== undefined) { params.push(data.validity); updates.push(`validity = $${params.length}`); }
  if (data.paymentType !== undefined) { params.push(data.paymentType); updates.push(`payment_type = $${params.length}`); }
  if (data.deliveryType !== undefined) { params.push(data.deliveryType); updates.push(`delivery_type = $${params.length}`); }
  if (data.deliveryPrice !== undefined) { params.push(data.deliveryPrice); updates.push(`delivery_price = $${params.length}`); }
  if (data.note !== undefined) { params.push(data.note); updates.push(`note = $${params.length}`); }
  if (data.format !== undefined) { params.push(data.format); updates.push(`format = $${params.length}`); }
  if (data.gift !== undefined) { params.push(data.gift); updates.push(`gift = $${params.length}`); }
  if (data.giftMessage !== undefined) { params.push(data.giftMessage); updates.push(`gift_message = $${params.length}`); }
  if (data.active !== undefined) { params.push(data.active); updates.push(`active = $${params.length}`); }
  if (data.applicableInBookolo !== undefined) { params.push(data.applicableInBookolo); updates.push(`applicable_in_bookolo = $${params.length}`); }
  if (data.isPrivateType !== undefined) { params.push(data.isPrivateType); updates.push(`is_private_type = $${params.length}`); }
  if (data.customerData !== undefined) { params.push(JSON.stringify(data.customerData)); updates.push(`customer_data = $${params.length}`); }
  if (data.giftData !== undefined) { params.push(JSON.stringify(data.giftData)); updates.push(`gift_data = $${params.length}`); }

  await client.query(`UPDATE vouchers SET ${updates.join(', ')} WHERE id = $1`, params);
}

async function handleCanceled(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as { canceledAt: string };
  await client.query(
    `UPDATE vouchers SET active = false, canceled_at = $2, version = $3, updated_at = NOW() WHERE id = $1`,
    [streamId, data.canceledAt, event.version]
  );
}

async function handleUsed(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as {
    amount: number;
    usedAt: string;
    reservationNumber?: string;
    usedIn?: string;
  };

  // Get current values
  const current = await client.query(`SELECT value_remaining, value_used, used_at FROM vouchers WHERE id = $1`, [streamId]);
  if (current.rows.length === 0) return;

  const row = current.rows[0];
  const newValueUsed = parseFloat(row.value_used) + data.amount;
  const newValueRemaining = parseFloat(row.value_remaining) - data.amount;
  const usedAt = row.used_at || data.usedAt;
  const active = newValueRemaining > 0;

  const updates: string[] = [
    'value_used = $2',
    'value_remaining = $3',
    'used_at = $4',
    'active = $5',
    'version = $6',
    'updated_at = NOW()',
  ];
  const params: (string | number | boolean | null)[] = [
    streamId,
    newValueUsed,
    Math.max(0, newValueRemaining),
    usedAt,
    active,
    event.version,
  ];

  if (data.reservationNumber) {
    params.push(data.reservationNumber);
    updates.push(`reservation_number = $${params.length}`);
  }
  if (data.usedIn) {
    params.push(data.usedIn);
    updates.push(`used_in = $${params.length}`);
  }

  await client.query(`UPDATE vouchers SET ${updates.join(', ')} WHERE id = $1`, params);
}

async function handlePaid(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  const data = event.data as { paidAt: string };
  await client.query(
    `UPDATE vouchers SET paid_at = $2, version = $3, updated_at = NOW() WHERE id = $1`,
    [streamId, data.paidAt, event.version]
  );
}

async function handleDeleted(client: PoolClient, streamId: string, event: StoredEvent): Promise<void> {
  await client.query(
    `UPDATE vouchers SET active = false, version = $2, updated_at = NOW() WHERE id = $1`,
    [streamId, event.version]
  );
}

export async function getVoucher(client: PoolClient, id: string) {
  const result = await client.query(`SELECT * FROM vouchers WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  return mapRowToVoucher(result.rows[0]);
}

export async function listVouchers(
  client: PoolClient,
  options: {
    includeInactive?: boolean;
    hotel?: number;
    status?: string;
  } = {}
) {
  const conditions: string[] = [];
  const params: (string | number | boolean)[] = [];

  if (!options.includeInactive) {
    conditions.push('active = true');
  }

  if (options.hotel !== undefined) {
    params.push(options.hotel);
    conditions.push(`hotel = $${params.length}`);
  }

  if (options.status) {
    switch (options.status) {
      case 'active':
        conditions.push('active = true AND canceled_at IS NULL AND value_remaining > 0');
        break;
      case 'used':
        conditions.push('value_remaining = 0 AND value_used > 0');
        break;
      case 'canceled':
        conditions.push('canceled_at IS NOT NULL');
        break;
      case 'expired':
        conditions.push('validity < CURRENT_DATE AND active = true AND canceled_at IS NULL');
        break;
    }
  }

  let query = 'SELECT * FROM vouchers';
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  const result = await client.query(query, params);
  return result.rows.map(mapRowToVoucher);
}

function mapRowToVoucher(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    code: row.code as string | null,
    number: row.number as string,
    hotel: row.hotel as number,
    lang: row.lang as string,
    createdAt: row.created_at ? (row.created_at as Date).toISOString() : null,
    usedAt: row.used_at ? (row.used_at as Date).toISOString() : null,
    canceledAt: row.canceled_at ? (row.canceled_at as Date).toISOString() : null,
    paidAt: row.paid_at ? (row.paid_at as Date).toISOString() : null,
    variableSymbol: row.variable_symbol as number,
    active: row.active as boolean,
    price: parseFloat(row.price as string),
    purchasePrice: parseFloat(row.purchase_price as string),
    currency: row.currency as string,
    validity: row.validity as string,
    paymentType: row.payment_type as string,
    deliveryType: row.delivery_type as string,
    deliveryPrice: parseFloat(row.delivery_price as string),
    note: row.note as string | null,
    format: row.format as string,
    gift: row.gift as string | null,
    giftMessage: row.gift_message as string | null,
    usedIn: row.used_in as string | null,
    reservationNumber: row.reservation_number as string | null,
    valueTotal: parseFloat(row.value_total as string),
    valueRemaining: parseFloat(row.value_remaining as string),
    valueUsed: parseFloat(row.value_used as string),
    applicableInBookolo: row.applicable_in_bookolo as boolean,
    isPrivateType: row.is_private_type as boolean,
    isFreeType: row.is_free_type as boolean,
    customerData: typeof row.customer_data === 'string'
      ? JSON.parse(row.customer_data)
      : (row.customer_data || {}),
    giftData: typeof row.gift_data === 'string'
      ? JSON.parse(row.gift_data)
      : (row.gift_data || {}),
    version: row.version as number,
    updatedAt: row.updated_at ? (row.updated_at as Date).toISOString() : null,
  };
}
