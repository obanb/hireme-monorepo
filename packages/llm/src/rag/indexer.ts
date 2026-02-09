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

async function graphqlQuery<T>(query: string): Promise<T> {
  const response = await fetch(config.graphql.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP error: ${response.status}`);
  }

  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${json.errors.map((e: any) => e.message).join(', ')}`);
  }

  return json.data;
}

async function fetchAllEntities(): Promise<EmbeddingDocument[]> {
  const docs: EmbeddingDocument[] = [];

  try {
    const resData = await graphqlQuery<{ reservations: any[] }>(`{
      reservations(limit: 500) {
        id guestName status checkInDate checkOutDate
        totalAmount currency room { roomNumber }
      }
    }`);
    docs.push(...resData.reservations.map(reservationToDocument));
  } catch (e) {
    console.warn('[rag-indexer] Failed to fetch reservations:', e);
  }

  try {
    const roomData = await graphqlQuery<{ rooms: any[] }>(`{
      rooms {
        id name roomNumber type capacity status
        roomTypeEntity { name }
        rateCode { name }
      }
    }`);
    docs.push(...roomData.rooms.map(roomToDocument));
  } catch (e) {
    console.warn('[rag-indexer] Failed to fetch rooms:', e);
  }

  try {
    const rtData = await graphqlQuery<{ roomTypes: any[] }>(`{
      roomTypes(includeInactive: true) { id code name isActive }
    }`);
    docs.push(...rtData.roomTypes.map(roomTypeToDocument));
  } catch (e) {
    console.warn('[rag-indexer] Failed to fetch room types:', e);
  }

  try {
    const rcData = await graphqlQuery<{ rateCodes: any[] }>(`{
      rateCodes(includeInactive: true) { id code name description isActive }
    }`);
    docs.push(...rcData.rateCodes.map(rateCodeToDocument));
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
