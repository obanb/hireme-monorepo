# AI Hotel Assistant - Implementation Proposal

## Overview

An intelligent conversational assistant integrated into the Hotel CMS that enables natural language queries across all hotel data. Users can ask questions like "Who lives in room 101?" or "Show me all reservations for next week" and receive instant, accurate answers.

---

## Technology Recommendations

### LLM Models

| Use Case | Recommended Model | Why |
|----------|-------------------|-----|
| **Local (Ollama)** | `llama3.1:8b` or `mistral:7b` | Best balance of quality, speed, and VRAM usage. Supports function calling. |
| **Local (High Quality)** | `llama3.1:70b` or `qwen2.5:32b` | Superior reasoning for complex queries. Requires 48GB+ VRAM. |
| **Remote (Production)** | `gpt-4o-mini` or `claude-3-haiku` | Low latency, excellent function calling, cost-effective. |
| **Remote (Complex)** | `gpt-4o` or `claude-3.5-sonnet` | Best reasoning for ambiguous queries and multi-step operations. |

**Recommendation:** Start with `llama3.1:8b` via Ollama for development, with optional fallback to `gpt-4o-mini` for production reliability.

### Vector Database

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **pgvector** | Uses existing PostgreSQL, simple setup, ACID compliant | Limited advanced features | **Best for this project** |
| **Qdrant** | Fast, feature-rich, good filtering | Another service to manage | Good alternative |
| **ChromaDB** | Easy Python integration, embedded mode | Less mature, Node.js support limited | Development only |
| **Pinecone** | Fully managed, scales well | Vendor lock-in, cost | Enterprise option |

**Recommendation:** `pgvector` extension on existing PostgreSQL. Single database for events, read models, and embeddings.

### Database Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL                               │
├─────────────────────────────────────────────────────────────┤
│  events          │ Event store (existing)                   │
│  reservations    │ Read model (existing)                    │
│  rooms           │ Read model (existing)                    │
│  guests          │ New - guest profiles                     │
│  embeddings      │ Vector store for semantic search         │
│  chat_sessions   │ Conversation history                     │
└─────────────────────────────────────────────────────────────┘
```

**Hybrid Query Strategy:**
1. **Structured queries** → Direct SQL via function calling
2. **Semantic queries** → Vector similarity search
3. **Complex queries** → Combine both approaches

---

## Architecture

### High-Level Design

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend                                   │
│  ┌─────────────┐    ┌─────────────────────────────────────────┐  │
│  │ Chat Popup  │    │           Full Chat Page                │  │
│  │ (Global)    │    │      /hotel-cms/assistant               │  │
│  └──────┬──────┘    └───────────────┬─────────────────────────┘  │
│         │                           │                             │
│         └───────────┬───────────────┘                             │
└─────────────────────┼────────────────────────────────────────────┘
                      │ WebSocket / REST
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (llm package)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   AI Orchestrator                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │ LLM Router  │  │  Tool       │  │  Context            │ │ │
│  │  │ (Ollama/    │  │  Registry   │  │  Manager            │ │ │
│  │  │  OpenAI)    │  │             │  │                     │ │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │ │
│  └─────────┼────────────────┼────────────────────┼────────────┘ │
│            │                │                    │               │
│  ┌─────────▼────────────────▼────────────────────▼────────────┐ │
│  │                    Tool Implementations                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │ │
│  │  │ SQL      │  │ Vector   │  │ Event    │  │ Actions    │ │ │
│  │  │ Query    │  │ Search   │  │ History  │  │ (Confirm,  │ │ │
│  │  │ Tool     │  │ Tool     │  │ Tool     │  │  Cancel)   │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ PostgreSQL  │  │ pgvector    │  │ Event Store             │ │
│  │ (SQL)       │  │ (Semantic)  │  │ (Audit)                 │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Tool Definitions (Function Calling)

```typescript
const tools = [
  {
    name: "query_reservations",
    description: "Search reservations by guest name, room, dates, or status",
    parameters: {
      guestName: "string?",
      roomNumber: "string?",
      roomId: "string?",
      status: "PENDING | CONFIRMED | CANCELLED?",
      checkInFrom: "date?",
      checkInTo: "date?",
    }
  },
  {
    name: "query_rooms",
    description: "Get room information by number, type, or availability",
    parameters: {
      roomNumber: "string?",
      type: "SINGLE | DOUBLE | SUITE | DELUXE | PENTHOUSE?",
      status: "AVAILABLE | OCCUPIED | MAINTENANCE?",
    }
  },
  {
    name: "get_room_occupant",
    description: "Find who is currently staying in a specific room",
    parameters: {
      roomNumber: "string!",
      date: "date? (defaults to today)"
    }
  },
  {
    name: "semantic_search",
    description: "Search across all data using natural language",
    parameters: {
      query: "string!",
      limit: "number? (default 5)"
    }
  },
  {
    name: "confirm_reservation",
    description: "Confirm a pending reservation",
    parameters: {
      reservationId: "string!"
    }
  },
  {
    name: "cancel_reservation",
    description: "Cancel a reservation with a reason",
    parameters: {
      reservationId: "string!",
      reason: "string!"
    }
  }
]
```

---

## Data Flow Example

**User Query:** "Who is staying in room 101?"

```
1. User sends message
   │
2. LLM analyzes intent → decides to call `get_room_occupant`
   │
3. Tool executes SQL:
   │  SELECT r.guest_name, r.check_in_date, r.check_out_date
   │  FROM reservations r
   │  JOIN rooms rm ON r.room_id = rm.id
   │  WHERE rm.room_number = '101'
   │    AND r.status = 'CONFIRMED'
   │    AND r.check_in_date <= CURRENT_DATE
   │    AND r.check_out_date > CURRENT_DATE
   │
4. Tool returns: { guestName: "John Doe", checkIn: "2026-01-18", checkOut: "2026-01-22" }
   │
5. LLM formats response: "Room 101 is currently occupied by John Doe,
   │                       who checked in on January 18th and will check out on January 22nd."
   │
6. Response sent to user
```

---

## Implementation Plan

### Phase 1: Foundation (Backend)
**Estimated effort: 3-4 days**

1. **Database Setup**
   - Add pgvector extension to PostgreSQL
   - Create `embeddings` table for vector storage
   - Create `chat_sessions` table for conversation history

2. **LLM Integration (packages/llm)**
   - Create `LLMRouter` class supporting Ollama and OpenAI
   - Implement streaming response support
   - Add function calling abstraction layer

3. **Tool Framework**
   - Create `ToolRegistry` for registering tools
   - Implement base tools: `query_reservations`, `query_rooms`, `get_room_occupant`
   - Add SQL query builder with parameterized queries (security)

### Phase 2: Vector Search
**Estimated effort: 2-3 days**

1. **Embedding Pipeline**
   - Create embedding service using `nomic-embed-text` (Ollama) or `text-embedding-3-small` (OpenAI)
   - Index existing reservations and rooms
   - Set up event listener to auto-index new data

2. **Semantic Search Tool**
   - Implement `semantic_search` tool
   - Add hybrid search (vector + SQL filtering)

### Phase 3: Frontend Integration
**Estimated effort: 3-4 days**

1. **Chat Page** (`/hotel-cms/assistant`)
   - Full-page chat interface
   - Message history with tool call visualization
   - Suggested prompts / quick actions

2. **Global Popup**
   - Floating action button (FAB) in bottom-right
   - Collapsible chat widget
   - Persist across page navigation

3. **Context Awareness**
   - Auto-inject current page context (e.g., on room page, know which room)
   - Support for "@" mentions (e.g., "@room101")

### Phase 4: Actions & Polish
**Estimated effort: 2-3 days**

1. **Action Tools**
   - Implement `confirm_reservation`, `cancel_reservation`
   - Add confirmation dialogs for destructive actions
   - Audit logging for AI-triggered actions

2. **UX Improvements**
   - Streaming responses with typing indicator
   - Error handling and retry logic
   - Keyboard shortcuts (Cmd/Ctrl + K to open)

---

## File Structure

```
packages/
├── llm/
│   ├── src/
│   │   ├── assistant/
│   │   │   ├── orchestrator.ts      # Main AI coordinator
│   │   │   ├── llm-router.ts        # Ollama/OpenAI abstraction
│   │   │   ├── tool-registry.ts     # Tool management
│   │   │   ├── context-manager.ts   # Conversation context
│   │   │   └── tools/
│   │   │       ├── query-reservations.ts
│   │   │       ├── query-rooms.ts
│   │   │       ├── get-room-occupant.ts
│   │   │       ├── semantic-search.ts
│   │   │       └── actions.ts
│   │   ├── embeddings/
│   │   │   ├── embedding-service.ts
│   │   │   └── vector-store.ts
│   │   └── index.ts
│   └── package.json
│
├── frontend/
│   └── src/
│       ├── app/hotel-cms/assistant/
│       │   └── page.tsx             # Full chat page
│       └── components/
│           ├── AIAssistantPopup.tsx # Global floating widget
│           └── ChatMessage.tsx      # Message component
│
└── backend/
    └── src/
        └── assistant-resolvers.ts   # GraphQL resolvers for chat
```

---

## GraphQL Schema

```graphql
type ChatMessage {
  id: ID!
  role: ChatRole!
  content: String!
  toolCalls: [ToolCall!]
  timestamp: String!
}

type ToolCall {
  name: String!
  arguments: String!
  result: String
}

enum ChatRole {
  USER
  ASSISTANT
  SYSTEM
}

type ChatSession {
  id: ID!
  messages: [ChatMessage!]!
  createdAt: String!
  updatedAt: String!
}

input SendMessageInput {
  sessionId: ID
  message: String!
  context: ChatContextInput
}

input ChatContextInput {
  currentPage: String
  selectedRoomId: ID
  selectedReservationId: ID
}

type SendMessageResult {
  sessionId: ID!
  message: ChatMessage!
  # For streaming, use subscriptions instead
}

extend type Query {
  chatSession(id: ID!): ChatSession
  chatSessions(limit: Int): [ChatSession!]!
}

extend type Mutation {
  sendMessage(input: SendMessageInput!): SendMessageResult!
  clearChatSession(id: ID!): Boolean!
}

extend type Subscription {
  messageStream(sessionId: ID!): ChatMessage!
}
```

---

## Configuration

```typescript
// packages/llm/src/config.ts

export const assistantConfig = {
  // LLM Provider
  provider: process.env.LLM_PROVIDER || 'ollama', // 'ollama' | 'openai'

  // Ollama settings
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
  },

  // OpenAI settings (fallback/production)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  },

  // Vector search
  vectorSearch: {
    dimensions: 768, // nomic-embed-text dimensions
    similarityThreshold: 0.7,
    maxResults: 10,
  },

  // Safety
  maxTokensPerRequest: 4096,
  actionConfirmationRequired: true,
};
```

---

## Security Considerations

1. **SQL Injection Prevention**
   - All SQL queries use parameterized statements
   - Tool arguments are validated and sanitized

2. **Action Authorization**
   - Destructive actions require user confirmation
   - All AI actions are logged with audit trail

3. **Rate Limiting**
   - Max requests per user per minute
   - Token usage tracking

4. **Data Access**
   - Assistant only accesses data user is authorized to see
   - No cross-tenant data leakage

---

## Example Interactions

| User Query | Tool Used | Response |
|------------|-----------|----------|
| "Who is in room 101?" | `get_room_occupant` | "John Doe is staying in room 101 until Jan 22nd" |
| "Show pending reservations" | `query_reservations` | "You have 3 pending reservations: [list]" |
| "Find reservations for Smith" | `query_reservations` + `semantic_search` | "Found 2 matches: Jane Smith (Room 205), Bob Smith (Room 312)" |
| "Which rooms are available this weekend?" | `query_rooms` + `query_reservations` | "Rooms 103, 107, and 201 are available for Jan 25-26" |
| "Confirm reservation for John Doe" | `confirm_reservation` | "[Confirmation dialog] → Reservation confirmed!" |
| "Tell me about our busiest period" | `semantic_search` + SQL aggregation | "Based on historical data, your peak occupancy is typically..." |

---

## Next Steps

1. Review and approve this proposal
2. Set up pgvector on PostgreSQL
3. Begin Phase 1 implementation
4. Create technical spike for LLM function calling with Ollama

---

## Questions for Decision

1. **Action permissions:** Should the AI be able to confirm/cancel reservations, or only read data?
2. **Authentication:** Should chat history be per-user or shared across staff?
3. **Fallback strategy:** Auto-fallback to OpenAI if Ollama is unavailable?
4. **Embedding scope:** Index only current data or historical data too?
