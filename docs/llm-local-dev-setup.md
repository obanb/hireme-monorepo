# LLM Local Development Setup

How to start the full AI assistant stack: Backend -> API Gateway -> MCP Server -> LLM Service (with RAG).

## Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- API keys: `LLM_API_KEY` (requesty.ai) and `OPENAI_API_KEY` (for embeddings)

## Quick Start

```bash
# 1. Install all dependencies (from repo root)
npm install

# 2. Start PostgreSQL with pgvector
docker run -d --name hireme-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg15

# 3. Build everything
npm run devel:build

# 4. Start services (each in its own terminal)

# Terminal 1 - Backend subgraph (port 4001)
cd packages/backend && npm run dev

# Terminal 2 - API Gateway (port 8080, needs backend running)
cd packages/api && npm run build && npm start

# Terminal 3 - LLM Service (port 4010, needs gateway running)
cd packages/llm && node -r dotenv/config dist/index.js

# Terminal 4 - Frontend (port 3000)
cd packages/frontend && npm run dev
```

## Step-by-Step

### 1. PostgreSQL with pgvector

The RAG pipeline requires the `pgvector` extension. Use the `pgvector/pgvector` Docker image instead of plain `postgres`:

```bash
# If you already have hireme-postgres without pgvector, replace it:
docker rm -f hireme-postgres

# Start with pgvector support
docker run -d \
  --name hireme-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg15

# Verify pgvector is available
docker exec hireme-postgres psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 2. Build Packages

Build order matters. MCP must be built before LLM (LLM spawns MCP as a child process).

```bash
# From repo root - builds everything in correct order
npm run devel:build

# Or build individually:
cd packages/shared-schema && npm run codegen   # if schema changed
cd packages/shared-schema && npm run build
cd packages/backend && npm run build
cd packages/api && npm run build
cd packages/mcp && npm run build               # before LLM!
cd packages/llm && npm run build
```

### 3. Start Backend + Gateway

```bash
# Terminal 1: Backend subgraph
cd packages/backend && npm run dev
# -> http://localhost:4001/graphql

# Terminal 2: API Gateway (wait for backend to be ready)
cd packages/api && npm run build && npm start
# -> http://localhost:8080/graphql
```

Verify the gateway is working:
```bash
curl -s http://localhost:8080/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ rooms { id roomNumber } }"}' | head -c 200
```

### 4. Start LLM Service

```bash
# Terminal 3: LLM Service
cd packages/llm && node -r dotenv/config dist/index.js
```

You should see:
```
[mcp-client] Connected to MCP server
[server] MCP client initialized
[rag-db] RAG database schema initialized
[rag-indexer] Starting indexer (interval: 300000ms)
[server] RAG system initialized
[server] LLM service running at http://localhost:4010
[server] Socket.IO ready for connections
[rag-indexer] Indexed N documents in Xms
```

### 5. Start Frontend

```bash
# Terminal 4: Frontend
cd packages/frontend && npm run dev
# -> http://localhost:3000
```

Open `http://localhost:3000` and use the chat widget to talk to the AI assistant.

## Environment Variables

Create a `.env` file in `packages/llm/` (or export in your shell):

```bash
# Required - LLM provider
LLM_API_KEY=your-requesty-api-key
LLM_BASE_URL=https://router.requesty.ai/v1
LLM_MODEL=anthropic/claude-sonnet-4-20250514

# Required - OpenAI (for embeddings)
OPENAI_API_KEY=your-openai-api-key

# PostgreSQL (defaults work with Docker setup above)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# GraphQL endpoint (default)
GRAPHQL_ENDPOINT=http://localhost:8080/graphql

# RAG tuning (optional)
RAG_ENABLED=true
RAG_INDEX_INTERVAL_MS=300000
RAG_SEARCH_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.3
```

## Running Without RAG

If you don't have pgvector or don't want embeddings:

```bash
RAG_ENABLED=false node -r dotenv/config dist/index.js
```

The chat and MCP tools work normally; only the semantic search context is skipped.

## Verifying RAG

### Check embeddings table

```bash
docker exec hireme-postgres psql -U postgres -c "SELECT entity_type, COUNT(*) FROM embeddings GROUP BY entity_type;"
```

Expected output (numbers vary based on your data):
```
 entity_type | count
-------------+-------
 reservation |    12
 room        |     8
 room_type   |     3
 rate_code   |     4
```

### Check similarity search

```bash
docker exec hireme-postgres psql -U postgres -c "
  SELECT entity_type, content, 1 - (embedding <=> (
    SELECT embedding FROM embeddings LIMIT 1
  )) AS similarity
  FROM embeddings
  ORDER BY similarity DESC
  LIMIT 5;
"
```

## Service Ports Summary

| Service | Port | Package |
|---------|------|---------|
| Frontend | 3000 | `packages/frontend` |
| Backend Subgraph | 4001 | `packages/backend` |
| LLM Service | 4010 | `packages/llm` |
| API Gateway | 8080 | `packages/api` |
| PostgreSQL | 5432 | Docker |

## Troubleshooting

### "pgvector extension not found"
You're using plain `postgres` image. Switch to `pgvector/pgvector:pg15`.

### "MCP client failed to initialize"
Build MCP first: `cd packages/mcp && npm run build`. The LLM service spawns `packages/mcp/dist/index.js` as a child process.

### "GraphQL HTTP error: 500" in indexer logs
The backend subgraph or API gateway isn't running. Start them first (ports 4001 + 8080).

### RAG indexer shows 0 documents
No data in the system yet. Create some rooms/reservations via the frontend or GraphQL playground at `http://localhost:8080/graphql`.

### Embeddings fail with 401
Check that `OPENAI_API_KEY` is set and valid. Embeddings use the OpenAI API directly (not requesty.ai).
