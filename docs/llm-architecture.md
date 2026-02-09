# LLM Architecture

Overview of the AI assistant system spanning `packages/llm` and `packages/mcp`.

## System Diagram

```
                        Frontend (Next.js)
                        port 3000
                            |
                        Socket.IO
                            |
                            v
                +-----------------------+
                |   LLM Service         |
                |   packages/llm        |
                |   port 4010           |
                |                       |
                |  server/server.ts     |  Express + Socket.IO
                |       |               |
                |       v               |
                |  chat/service.ts      |  Session mgmt, streaming, tool-call loop
                |       |               |
                |  +----+----+          |
                |  |         |          |
                |  v         v          |
                | RAG      MCP Client   |
                | Pipeline  mcp-client.ts
                |  |         |          |
                +--|---------|---------+
                   |         |
          +--------+    +----+--------+
          |              |             |
          v              v             v
    +-----------+   +-----------+  +-----------------+
    | PostgreSQL|   | MCP Server|  | OpenAI API      |
    | pgvector  |   | packages/ |  | (requesty.ai    |
    | port 5432 |   | mcp       |  |  router)        |
    |           |   | (stdio)   |  |                 |
    | embeddings|   +-----+-----+  | - Chat LLM     |
    | table     |         |        | - Embeddings    |
    +-----------+         v        +-----------------+
                    +-----------+
                    | GraphQL   |
                    | Gateway   |
                    | port 8080 |
                    +-----+-----+
                          |
                          v
                    +-----------+
                    | Backend   |
                    | Subgraph  |
                    | port 4001 |
                    +-----------+
```

## Components

### LLM Service (`packages/llm`)

Entry point: `src/index.ts` -> `server/server.ts`

| Module | Path | Responsibility |
|--------|------|----------------|
| **Server** | `src/server/server.ts` | Express + Socket.IO, lifecycle orchestration |
| **Chat Service** | `src/chat/service.ts` | Session management, OpenAI streaming, tool-call loop |
| **Chat Prompts** | `src/chat/prompts.ts` | System prompt definition |
| **MCP Client** | `src/mcp/mcp-client.ts` | Spawns MCP server as child process, proxies tool calls |
| **OpenAI Client** | `src/openai/openaiClient.ts` | Direct OpenAI SDK client (for embeddings) |
| **Config** | `src/config/index.ts` | All environment-based configuration |
| **RAG Pipeline** | `src/rag/*` | Vector search subsystem (see below) |

### MCP Server (`packages/mcp`)

Stdio-based MCP server exposing hotel data as tools. Spawned by `packages/llm` as a child process.

**Tools exposed:**
- `get_reservations` - Search reservations with filters
- `get_reservation_by_id` - Single reservation lookup
- `get_rooms` - List rooms (filter by type/status)
- `get_room_types` - List room type categories
- `get_rate_codes` - List rate/pricing codes
- `create_reservation` - Create a new reservation
- `confirm_reservation` - Confirm a pending reservation
- `cancel_reservation` - Cancel a reservation

All tools query the GraphQL Gateway (`port 8080`) under the hood.

### RAG Pipeline (`packages/llm/src/rag/`)

Provides semantic search context to augment LLM responses.

| Module | Responsibility |
|--------|----------------|
| `database.ts` | PostgreSQL pool + pgvector schema (`embeddings` table, HNSW index) |
| `embeddings.ts` | OpenAI `text-embedding-3-small` wrapper (single + batch) |
| `text-builder.ts` | Converts hotel entities to human-readable text documents |
| `indexer.ts` | Periodic indexer: GraphQL fetch -> embed -> pgvector upsert |
| `search.ts` | Cosine similarity search against embeddings |

**Embeddings table schema:**
```
embeddings
  id            BIGSERIAL PK
  entity_type   VARCHAR(50)     -- reservation, room, room_type, rate_code
  entity_id     UUID            -- unique per (entity_type, entity_id)
  content       TEXT            -- human-readable summary
  embedding     vector(1536)    -- text-embedding-3-small output
  metadata      JSONB
  indexed_at    TIMESTAMPTZ
```

## Request Flow

### Chat Message (with RAG + MCP)

```
1. User sends message via Socket.IO
2. server.ts receives 'chat:message' event
3. chat/service.ts handleChatMessage():
   a. Generate embedding for user message (OpenAI)
   b. Search pgvector for top-5 similar documents
   c. Build augmented system prompt = SYSTEM_PROMPT + relevant context
   d. Send to LLM (OpenAI via requesty.ai) with augmented prompt + MCP tools
   e. If LLM returns tool_calls:
      - Execute each tool via MCP client -> MCP server -> GraphQL
      - Append tool results to conversation
      - Loop back to (d) with plain SYSTEM_PROMPT (no re-embedding)
   f. If LLM returns text:
      - Stream chunks to frontend via Socket.IO
      - Store in session history
```

### RAG Indexing (Background)

```
1. On startup (if RAG_ENABLED):
   a. Initialize pgvector schema (CREATE EXTENSION + table + indexes)
   b. Start indexer (immediate run + setInterval every 5 min)
2. Each indexing cycle:
   a. Fetch all entities via GraphQL (reservations, rooms, room types, rate codes)
   b. Convert to text documents via text-builder
   c. Batch generate embeddings (OpenAI text-embedding-3-small)
   d. Upsert into embeddings table (ON CONFLICT update)
```

## Configuration

All configuration via environment variables in `src/config/index.ts`:

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PORT` | `4010` | LLM service HTTP port |
| `LLM_BASE_URL` | `https://router.requesty.ai/v1` | OpenAI-compatible API base |
| `LLM_API_KEY` | (required) | API key for LLM provider |
| `LLM_MODEL` | `anthropic/claude-sonnet-4-20250514` | Chat model |
| `LLM_MAX_TOKENS` | `4096` | Max response tokens |
| `LLM_TEMPERATURE` | `0.7` | Sampling temperature |
| `OPENAI_API_KEY` | (required) | OpenAI API key (for embeddings) |
| `MCP_SERVER_COMMAND` | `node` | MCP server executable |
| `MCP_SERVER_ARGS` | `packages/mcp/dist/index.js` | MCP server script path |
| `GRAPHQL_ENDPOINT` | `http://localhost:8080/graphql` | GraphQL Gateway URL |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host (for RAG) |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `postgres` | PostgreSQL database |
| `POSTGRES_USER` | `postgres` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `RAG_ENABLED` | `true` | Enable/disable RAG pipeline |
| `RAG_INDEX_INTERVAL_MS` | `300000` | Indexing interval (5 min) |
| `RAG_SEARCH_TOP_K` | `5` | Number of similar docs to retrieve |
| `RAG_SIMILARITY_THRESHOLD` | `0.3` | Minimum cosine similarity |

## Dependencies Between Packages

```
packages/llm
  ├── spawns ──> packages/mcp (stdio child process)
  ├── calls  ──> OpenAI API (chat + embeddings)
  ├── reads  ──> PostgreSQL/pgvector (RAG search)
  └── writes ──> PostgreSQL/pgvector (RAG indexing)

packages/mcp
  └── calls  ──> GraphQL Gateway (port 8080)
                    └── Backend Subgraph (port 4001)
                          └── PostgreSQL (event store + read models)
```
