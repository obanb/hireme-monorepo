import OpenAI from 'openai';
import { config } from '../config';

const embeddingsClient = new OpenAI({
  baseURL: config.embeddings.baseUrl,
  apiKey: config.embeddings.apiKey,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await embeddingsClient.embeddings.create({
    model: config.embeddings.model,
    input: text,
  });

  return response.data[0].embedding;
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await embeddingsClient.embeddings.create({
    model: config.embeddings.model,
    input: texts,
  });

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
