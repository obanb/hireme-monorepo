import { config } from '../config';
import { getRagPool } from './database';
import { generateEmbeddingsBatch } from './embeddings';
import {
  EmbeddingDocument,
  reservationToDocument,
  roomToDocument,
  roomTypeToDocument,
  rateCodeToDocument,
} from './text-builder';

let indexerInterval: ReturnType<typeof setInterval> | null = null;

async function fetchAllEntities(): Promise<EmbeddingDocument[]> {
  const pool = getRagPool();
  const docs: EmbeddingDocument[] = [];

  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.guest_name, r.status, r.check_in_date, r.check_out_date,
             r.total_amount, r.currency, rm.room_number
      FROM reservations r
      LEFT JOIN rooms rm ON r.room_id = rm.id
      ORDER BY r.created_at DESC
      LIMIT 500
    `);
    docs.push(...rows.map((r: any) => reservationToDocument({
      id: r.id,
      guestName: r.guest_name,
      status: r.status,
      checkInDate: r.check_in_date ? new Date(r.check_in_date).toISOString().split('T')[0] : null,
      checkOutDate: r.check_out_date ? new Date(r.check_out_date).toISOString().split('T')[0] : null,
      totalAmount: r.total_amount != null ? parseFloat(r.total_amount) : null,
      currency: r.currency,
      room: r.room_number ? { roomNumber: r.room_number } : null,
    })));
  } catch (e) {
    console.warn('[rag-indexer] Failed to fetch reservations:', e);
  }

  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.name, r.room_number, r.type, r.capacity, r.status,
             rt.name AS room_type_name, rc.name AS rate_code_name
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN rate_codes rc ON r.rate_code_id = rc.id
    `);
    docs.push(...rows.map((r: any) => roomToDocument({
      id: r.id,
      roomNumber: r.room_number,
      name: r.name,
      type: r.type,
      capacity: r.capacity,
      status: r.status,
      roomTypeEntity: r.room_type_name ? { name: r.room_type_name } : null,
      rateCode: r.rate_code_name ? { name: r.rate_code_name } : null,
    })));
  } catch (e) {
    console.warn('[rag-indexer] Failed to fetch rooms:', e);
  }

  try {
    const { rows } = await pool.query(`SELECT id, code, name, is_active FROM room_types`);
    docs.push(...rows.map((r: any) => roomTypeToDocument({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: r.is_active,
    })));
  } catch (e) {
    console.warn('[rag-indexer] Failed to fetch room types:', e);
  }

  try {
    const { rows } = await pool.query(`SELECT id, code, name, description, is_active FROM rate_codes`);
    docs.push(...rows.map((r: any) => rateCodeToDocument({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isActive: r.is_active,
    })));
  } catch (e) {
    console.warn('[rag-indexer] Failed to fetch rate codes:', e);
  }

  return docs;
}

async function upsertDocuments(docs: EmbeddingDocument[], embeddings: number[][]): Promise<void> {
  const pool = getRagPool();

  const BATCH_SIZE = 100;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batchDocs = docs.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = embeddings.slice(i, i + BATCH_SIZE);

    const values: any[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batchDocs.length; j++) {
      const doc = batchDocs[j];
      const emb = batchEmbeddings[j];
      const offset = j * 5;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::vector, $${offset + 5}::jsonb)`
      );
      values.push(
        doc.entityType,
        doc.entityId,
        doc.content,
        `[${emb.join(',')}]`,
        JSON.stringify(doc.metadata),
      );
    }

    await pool.query(
      `INSERT INTO embeddings (entity_type, entity_id, content, embedding, metadata)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (entity_type, entity_id) DO UPDATE SET
         content = EXCLUDED.content,
         embedding = EXCLUDED.embedding,
         metadata = EXCLUDED.metadata,
         indexed_at = NOW()`,
      values,
    );
  }
}

export async function runIndexingCycle(): Promise<void> {
  const start = Date.now();

  const docs = await fetchAllEntities();
  if (docs.length === 0) {
    console.log('[rag-indexer] No documents to index');
    return;
  }

  const texts = docs.map((d) => d.content);
  const embeddings = await generateEmbeddingsBatch(texts);

  await upsertDocuments(docs, embeddings);

  console.log(`[rag-indexer] Indexed ${docs.length} documents in ${Date.now() - start}ms`);
}

export function startIndexer(): void {
  console.log(`[rag-indexer] Starting indexer (interval: ${config.rag.indexIntervalMs}ms)`);

  runIndexingCycle().catch((err) => {
    console.error('[rag-indexer] Initial indexing cycle failed:', err);
  });

  indexerInterval = setInterval(() => {
    runIndexingCycle().catch((err) => {
      console.error('[rag-indexer] Indexing cycle failed:', err);
    });
  }, config.rag.indexIntervalMs);
}

export function stopIndexer(): void {
  if (indexerInterval) {
    clearInterval(indexerInterval);
    indexerInterval = null;
    console.log('[rag-indexer] Indexer stopped');
  }
}
