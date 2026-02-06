# AI Assistant Implementation Plan

## Overview

Build an AI-powered chat assistant for the Hotel CMS that enables hotel staff to interact with the system through natural language queries. The assistant will be available as a floating chat window on every page of the frontend.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │               Floating Chat Widget (React Component)                 │    │
│  │  - Available on all pages via layout                                 │    │
│  │  - Expandable/collapsible                                            │    │
│  │  - Message history with streaming responses                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                           Socket.IO Client                                   │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ WebSocket
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LLM PACKAGE (packages/llm)                           │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐    │
│  │   Express +       │    │   Chat Service   │    │   RAG Service      │    │
│  │   Socket.IO       │◄──►│   (Orchestrator) │◄──►│   (pgvector)       │    │
│  │   Server          │    │                  │    │                    │    │
│  └──────────────────┘    └────────┬─────────┘    └────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│                    ┌──────────────────────────┐                             │
│                    │   LLM Gateway            │                             │
│                    │   (requesty.ai router)   │                             │
│                    │   EU Models, No Retention│                             │
│                    └──────────────────────────┘                             │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ MCP Protocol
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MCP PACKAGE (packages/mcp)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Hotel CMS MCP Server                              │    │
│  │                                                                      │    │
│  │   Tools:                           Resources:                        │    │
│  │   - get_reservations              - reservation://list              │    │
│  │   - get_reservation_by_id         - room://availability             │    │
│  │   - search_guests                 - guest://search                  │    │
│  │   - get_room_availability                                           │    │
│  │   - get_today_arrivals                                              │    │
│  │   - get_today_departures                                            │    │
│  │   - create_reservation                                              │    │
│  │   - update_reservation_status                                       │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                           GraphQL Client                                     │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXISTING BACKEND (port 8080)                            │
│                        Apollo Gateway (GraphQL)                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. LLM Package (packages/llm) - Core AI Service

**Purpose**: Central orchestration layer for AI interactions

**Port**: 4010

**Key Files**:
```
packages/llm/
├── src/
│   ├── index.ts                    # Entry point
│   ├── server/
│   │   ├── express.ts              # Express + Socket.IO server
│   │   └── routes.ts               # REST endpoints (health, etc)
│   ├── chat/
│   │   ├── service.ts              # Chat orchestration service
│   │   ├── handlers.ts             # Socket event handlers
│   │   ├── types.ts                # Message types, events
│   │   └── history.ts              # Conversation history manager
│   ├── llm/
│   │   ├── gateway.ts              # LLM API client (requesty.ai)
│   │   ├── prompts.ts              # System prompts, templates
│   │   └── streaming.ts            # Token streaming handler
│   ├── rag/
│   │   ├── pgvector.ts             # PostgreSQL pgvector client
│   │   ├── embeddings.ts           # Embedding generation
│   │   └── indexer.ts              # Document indexing service
│   ├── mcp/
│   │   ├── client.ts               # MCP client to connect to MCP server
│   │   └── tool-executor.ts        # Execute MCP tools
│   └── config/
│       └── index.ts                # Environment config
├── package.json
└── tsconfig.json
```

**Dependencies**:
```json
{
  "dependencies": {
    "express": "^5.1.0",
    "socket.io": "^4.8.1",
    "@modelcontextprotocol/sdk": "^1.9.0",
    "pg": "^8.13.0",
    "pgvector": "^0.2.0",
    "openai": "^4.8.0",
    "uuid": "^11.1.0",
    "pino": "^9.0.0"
  }
}
```

---

### 2. MCP Package (packages/mcp) - Hotel CMS MCP Server

**Purpose**: Exposes Hotel CMS data and actions to the LLM via MCP protocol

**Key Files**:
```
packages/mcp/
├── src/
│   ├── index.ts                    # Entry point, start MCP server
│   ├── server.ts                   # MCP server implementation
│   ├── tools/
│   │   ├── reservations.ts         # Reservation-related tools
│   │   ├── rooms.ts                # Room-related tools
│   │   ├── guests.ts               # Guest-related tools
│   │   └── analytics.ts            # Reports and analytics tools
│   ├── resources/
│   │   ├── reservation-resource.ts # Reservation resources
│   │   └── room-resource.ts        # Room resources
│   ├── graphql/
│   │   ├── client.ts               # GraphQL client to backend
│   │   └── queries.ts              # Pre-defined queries
│   └── types/
│       └── index.ts                # Type definitions
├── package.json
└── tsconfig.json
```

**MCP Tools Definition**:

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `get_reservations` | List reservations with filters | `{ status?, dateFrom?, dateTo?, limit? }` |
| `get_reservation_by_id` | Get single reservation details | `{ id }` |
| `search_guests` | Search guests by name | `{ query, limit? }` |
| `get_room_availability` | Check room availability | `{ dateFrom, dateTo, roomType? }` |
| `get_today_arrivals` | Get today's check-ins | `{}` |
| `get_today_departures` | Get today's check-outs | `{}` |
| `create_reservation` | Create new reservation | `{ guestName, checkIn, checkOut, roomId }` |
| `confirm_reservation` | Confirm a reservation | `{ reservationId }` |
| `cancel_reservation` | Cancel a reservation | `{ reservationId, reason }` |
| `get_room_types` | List available room types | `{}` |
| `get_rate_codes` | List rate codes | `{}` |

---

### 3. Frontend Chat Widget

**Purpose**: Floating chat interface available on all pages

**Key Files**:
```
packages/frontend/src/
├── components/
│   └── chat/
│       ├── ChatWidget.tsx          # Main floating widget
│       ├── ChatWindow.tsx          # Expandable chat window
│       ├── ChatMessage.tsx         # Message bubble component
│       ├── ChatInput.tsx           # Input with send button
│       ├── ChatHeader.tsx          # Header with minimize/close
│       └── TypingIndicator.tsx     # AI typing animation
├── hooks/
│   └── useChat.ts                  # Socket.IO hook for chat
├── contexts/
│   └── ChatContext.tsx             # Chat state provider
└── app/
    └── layout.tsx                  # Add ChatWidget here
```

**Features**:
- Floating bubble button (bottom-right corner)
- Expandable to full chat window
- Message streaming with typing indicator
- Message history persistence (localStorage)
- Markdown rendering for AI responses
- Data visualization for query results (tables, lists)
- Dark mode support
- Keyboard shortcuts (Escape to minimize, Enter to send)

---

### 4. Vector Database (pgvector)

**Purpose**: Semantic search and RAG for contextual understanding

**Schema** (add to existing PostgreSQL):
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table for reservation/guest data
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,      -- 'reservation', 'guest', 'room'
    entity_id VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,                  -- Searchable text content
    embedding vector(1536),                 -- OpenAI text-embedding-3-small
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_type, entity_id)
);

-- Index for similarity search
CREATE INDEX IF NOT EXISTS embeddings_vector_idx
ON embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,              -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    tool_calls JSONB,                       -- MCP tool calls made
    tool_results JSONB,                     -- Results from tools
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 5. LLM Provider (requesty.ai)

**Purpose**: Route to EU-hosted models with no data retention

**Configuration**:
```typescript
// packages/llm/src/config/index.ts
export const config = {
  llm: {
    provider: 'requesty',
    baseUrl: 'https://router.requesty.ai/v1',
    apiKey: process.env.REQUESTY_API_KEY,
    model: 'mistral/mistral-large-eu',     // EU-hosted, no retention
    fallbackModel: 'azure/gpt-4o-eu',      // Azure EU region
    maxTokens: 4096,
    temperature: 0.7,
  },
  embeddings: {
    model: 'text-embedding-3-small',        // For pgvector
    dimensions: 1536,
  }
};
```

**Recommended EU Models (from requesty.ai)**:
- `mistral/mistral-large-eu` - Mistral Large (EU)
- `azure/gpt-4o-eu` - GPT-4o via Azure EU
- `anthropic/claude-3-5-sonnet-eu` - Claude 3.5 (EU endpoint)

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Tasks**:
1. Set up `packages/mcp` with basic structure
2. Implement MCP server with 3-4 core tools (reservations, rooms)
3. Set up `packages/llm` with Express + Socket.IO
4. Create basic chat service with LLM gateway (requesty.ai)
5. Connect LLM package to MCP server as client

**Deliverables**:
- MCP server running with tools accessible
- LLM service accepting chat messages via WebSocket
- Basic tool calling working (e.g., "show me today's reservations")

---

### Phase 2: Frontend Chat Widget (Week 2-3)

**Tasks**:
1. Create ChatWidget component with floating button
2. Implement ChatWindow with message display
3. Add Socket.IO client hook (`useChat`)
4. Integrate into layout (available on all pages)
5. Add message streaming support
6. Style with Tailwind (match existing design)

**Deliverables**:
- Floating chat bubble on all pages
- Working two-way chat with AI
- Streaming responses with typing indicator

---

### Phase 3: RAG & Vector Search (Week 3-4)

**Tasks**:
1. Set up pgvector extension in PostgreSQL
2. Create embeddings service in LLM package
3. Build indexer for reservations/guests/rooms
4. Implement semantic search for context retrieval
5. Integrate RAG into chat flow

**Deliverables**:
- Automatic indexing of hotel data
- Context-aware responses using vector search
- Better answers for queries like "find reservations for John"

---

### Phase 4: Advanced Features (Week 4-5)

**Tasks**:
1. Add more MCP tools (analytics, reports)
2. Implement action confirmations (create/cancel reservation)
3. Add data visualization in chat (tables, calendars)
4. Chat history persistence
5. Multi-user session support

**Deliverables**:
- Full CRUD operations via chat
- Rich data displays in responses
- Persistent chat history per user

---

### Phase 5: Polish & Testing (Week 5-6)

**Tasks**:
1. Error handling and edge cases
2. Rate limiting and security
3. Performance optimization
4. Documentation
5. Integration testing

**Deliverables**:
- Production-ready AI assistant
- Full documentation
- Test coverage

---

## Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:message` | `{ sessionId, content }` | Send user message |
| `chat:cancel` | `{ sessionId }` | Cancel streaming response |
| `chat:history` | `{ sessionId }` | Request chat history |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:response:start` | `{ messageId }` | AI starting response |
| `chat:response:chunk` | `{ messageId, content }` | Streaming token |
| `chat:response:end` | `{ messageId }` | Response complete |
| `chat:response:error` | `{ error }` | Error occurred |
| `chat:tool:start` | `{ tool, params }` | Tool execution started |
| `chat:tool:result` | `{ tool, result }` | Tool execution complete |
| `chat:history:response` | `{ messages }` | Chat history |

---

## Environment Variables

```bash
# packages/llm/.env
PORT=4010
NODE_ENV=development

# LLM Provider
REQUESTY_API_KEY=your-requesty-api-key
LLM_MODEL=mistral/mistral-large-eu

# PostgreSQL (pgvector)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=hireme

# OpenAI (for embeddings only)
OPENAI_API_KEY=your-openai-key

# MCP Server
MCP_SERVER_PORT=4011
```

---

## Port Allocation

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Admin Frontend | 3001 |
| Backend Subgraph | 4001 |
| **LLM Service** | **4010** |
| **MCP Server** | **4011** |
| API Gateway | 8080 |
| PostgreSQL | 5432 |

---

## Security Considerations

1. **Authentication**: Socket.IO connections require valid session token
2. **Rate Limiting**: Max 20 messages per minute per user
3. **Input Sanitization**: Validate all user inputs before LLM
4. **Tool Permissions**: Role-based access to MCP tools
5. **Audit Logging**: Log all tool executions
6. **Data Privacy**: EU models only, no training on user data

---

## Example Interactions

**User**: "Show me today's check-ins"
```
AI: [Calls get_today_arrivals tool]

Here are today's arrivals (3 guests):

| Guest | Room | Check-in Time | Status |
|-------|------|---------------|--------|
| John Smith | 101 | 14:00 | Confirmed |
| Maria Garcia | 205 | 15:00 | Pending |
| Peter Brown | 302 | 16:00 | Confirmed |
```

**User**: "Create a reservation for Anna Weber, room 201, January 15-18"
```
AI: I'll create that reservation for you.

**Confirmation Required**
- Guest: Anna Weber
- Room: 201 (Deluxe Double)
- Check-in: January 15, 2026
- Check-out: January 18, 2026
- Total: 3 nights

Do you want me to proceed? [Confirm] [Cancel]
```

---

## Open Questions / Decisions Needed

1. **User Authentication**: How should users authenticate to the chat? (Same as frontend auth?)
2. **Role-based Access**: Should different user roles have access to different tools?
3. **Multi-language Support**: Should the AI respond in user's language?
4. **Notification Integration**: Should the chat notify about real-time events (new bookings)?
5. **Mobile Support**: Is a mobile-optimized chat view needed?

---

## Next Steps

1. Review and approve this implementation plan
2. Set up requesty.ai account and obtain API key
3. Enable pgvector extension in PostgreSQL
4. Begin Phase 1 implementation

