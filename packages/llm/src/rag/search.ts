import { config } from '../config';
import { getRagPool } from './database';
import { generateEmbedding } from './embeddings';

export interface SearchResult {
  entityType: string;
  entityId: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export async function searchSimilar(
  query: string,
  topK: number = config.rag.searchTopK,
  entityTypes?: string[],
  similarityThreshold: number = config.rag.similarityThreshold,
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);
  const pool = getRagPool();

  const vectorStr = `[${embedding.join(',')}]`;

  let sql = `
    SELECT entity_type, entity_id, content, metadata,
           1 - (embedding <=> $1::vector) AS similarity
    FROM embeddings
    WHERE 1 - (embedding <=> $1::vector) >= $2
  `;
  const params: any[] = [vectorStr, similarityThreshold];

  if (entityTypes && entityTypes.length > 0) {
    sql += ` AND entity_type = ANY($3)`;
    params.push(entityTypes);
  }

  sql += ` ORDER BY embedding <=> $1::vector ASC LIMIT $${params.length + 1}`;
  params.push(topK);

  const result = await pool.query(sql, params);

  return result.rows.map((row) => ({
    entityType: row.entity_type,
    entityId: row.entity_id,
    content: row.content,
    metadata: row.metadata,
    similarity: parseFloat(row.similarity),
  }));
}
