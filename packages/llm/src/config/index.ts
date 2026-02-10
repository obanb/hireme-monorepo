export const config = {
  port: parseInt(process.env.LLM_PORT || '4010', 10),
  llm: {
    baseUrl: process.env.LLM_BASE_URL || 'https://router.requesty.ai/v1',
    apiKey: process.env.LLM_API_KEY || 'REMOVED_SECRET',
    model: process.env.LLM_MODEL || 'bedrock/claude-haiku-4-5',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  },
  mcp: {
    serverCommand: process.env.MCP_SERVER_COMMAND || 'node',
    serverArgs: (process.env.MCP_SERVER_ARGS || 'packages/mcp/dist/index.js').split(' '),
  },
  graphql: {
    endpoint: process.env.GRAPHQL_ENDPOINT || 'http://localhost:8080/graphql',
  },
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  },
  rag: {
    enabled: process.env.RAG_ENABLED !== 'false',
    indexIntervalMs: parseInt(process.env.RAG_INDEX_INTERVAL_MS || '300000', 10),
    searchTopK: parseInt(process.env.RAG_SEARCH_TOP_K || '5', 10),
    similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.3'),
  },
};
