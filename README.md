# Hotel CMS Platform

Full-stack hotel management system built with GraphQL Federation, Event Sourcing, AI-powered chat, and real-time webhook delivery.

```
                          +-----------+     +-----------------+
                          | Frontend  |     | Admin Frontend  |
                          | :3000     |     | :3001           |
                          +-----+-----+     +--------+--------+
                                |                    |
                                +--------+-----------+
                                         |
                                +--------v--------+
                                | Apollo Gateway  |
                                | :8080           |
                                +--------+--------+
                                         |
                      +------------------+------------------+
                      |                                     |
              +-------v--------+                 +----------v-------+
              | Backend        |                 | Gateway           |
              | (Subgraph)     |                 | (Event Sourcing)  |
              | :4001          |                 |                   |
              +---+--------+---+                 +---------+--------+
                  |        |                               |
                  |        +--------> PostgreSQL <----------+
                  |                   (Event Store)
                  +--------> RabbitMQ (domain_events) <----+
                             |                             |
                    +--------v--------+          +---------+--------+
                    | Webhooks        |          | LLM Service      |
                    | :4002           |          | :4010            |
                    +--------+--------+          +---------+--------+
                             |                             |
                    External subscribers          +--------v--------+
                                                  | MCP Server      |
                                                  | (stdio)         |
                                                  +-----------------+
```

---

## Features

### Reservation Management
- Full reservation lifecycle: create, confirm, cancel, assign rooms
- Event-sourced aggregates with version history
- CQRS pattern with command/query separation
- Interactive room calendar with week/month views and drag-and-drop

### Guest Management
- Guest profiles with passport/visa tracking
- Address and contact information
- Reservation history per guest
- Police report PDF generation (Czech/English bilingual via PDFKit)

### Room & Rate Management
- Room CRUD with status tracking (Available, Occupied, Maintenance)
- Room type categories (Standard, Deluxe, Suite, etc.)
- Rate code management with versioning

### Wellness & Spa
- Service catalog management
- Therapist scheduling
- Wellness room types and bookings
- Bitmask-based availability filtering

### Vouchers
- Gift voucher lifecycle (create, use, cancel, mark paid)
- Customer and gift recipient data
- Usage tracking with event sourcing

### Email Campaigns
- Template management with reusable layouts
- Audience targeting with guest filters
- Batch sending with retry logic via Resend API
- Open/click tracking through tracking pixels and link rewriting
- Test email delivery

### AI Chat Assistant
- OpenAI SDK with streaming responses (requesty.ai compatible)
- MCP (Model Context Protocol) tool calling over stdio transport
- 12 tools: reservations, rooms, guests, rate codes, navigation
- RAG pipeline: MongoDB vector embeddings (text-embedding-3-small) with cosine similarity search
- Real-time Socket.IO streaming with tool call visualization
- Auto-indexing worker for reservation/room/rate code data

### Webhook Delivery
- RabbitMQ consumer for reservation events
- HMAC-SHA256 signed payloads for subscriber verification
- Retry engine: immediate, 30s, 5min backoff
- Circuit breaker: auto-disables after 10 consecutive failures
- Admin REST API with OpenAPI/Swagger docs at `/api/docs`
- Supported events: `reservation.created`, `reservation.confirmed`, `reservation.cancelled`, `reservation.room_assigned`

### Event Sourcing & CQRS
- PostgreSQL append-only event store with optimistic concurrency
- RabbitMQ event bus (`domain_events` exchange, topic routing)
- Event relayer: polls event store, publishes to RabbitMQ with at-least-once delivery
- Aggregate roots: Guest, Reservation, Voucher, Wellness
- Read model projections rebuilt from events

### Authentication & Authorization
- JWT access + refresh tokens with HTTP-only cookies
- Role-based access control: Admin, User, Viewer
- Email verification and password reset flows via Resend API
- bcrypt password hashing

### Frontend
- Next.js 15 with App Router and React 19
- Dark mode across all 21 pages (Tailwind CSS `dark:` classes)
- i18n: English + Czech (~490 translation keys)
- Framer Motion animations
- Statistics dashboards with revenue timeline and occupancy analytics

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, Framer Motion |
| API | Apollo Gateway, Apollo Server 4, GraphQL Federation v2 |
| Backend | Express, TypeScript 5, Node.js |
| Data | PostgreSQL (event store + auth), MongoDB (RAG vectors), RabbitMQ |
| AI | OpenAI SDK, MCP Protocol, RAG (text-embedding-3-small) |
| Email | Resend API |
| PDF | PDFKit |
| Observability | Pino (logging), OpenTelemetry (tracing) |
| Tooling | npm workspaces, Lerna, ts-node-dev |

---

## Packages

```
packages/
├── frontend/          Next.js 15 customer UI                    :3000
├── admin-frontend/    Admin dashboard                           :3001
├── api/               Apollo Federation Gateway                 :8080
├── backend/           Hotel GraphQL subgraph                    :4001
├── gateway/           Event sourcing (CQRS demo)
├── webhooks/          Webhook delivery service                  :4002
├── llm/               LLM service (chat + RAG + MCP client)    :4010
├── mcp/               MCP server (12 tools, stdio transport)
├── shared-schema/     GraphQL schemas + codegen
├── telemetry/         Pino + OpenTelemetry
└── common/            Shared utilities
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- RabbitMQ
- MongoDB (for RAG features)

### Installation

```bash
npm install
```

### Build

```bash
# Build all packages
npm run devel:build

# Generate GraphQL types (run first if schema changes)
cd packages/shared-schema && npm run codegen

# Build individual package
cd packages/<package-name> && npm run build
```

### Running Services

Start services in this order (each in a separate terminal):

```bash
# 1. Backend subgraph (must start first)
cd packages/backend && npm run dev          # :4001

# 2. API Gateway (requires backend)
cd packages/api && npm run build && npm start  # :8080

# 3. Event sourcing gateway (requires PG + RabbitMQ)
cd packages/gateway && npm run dev

# 4. Webhook delivery (requires PG + RabbitMQ)
cd packages/webhooks && npm run dev         # :4002

# 5. LLM service (requires MCP build)
cd packages/mcp && npm run build
cd packages/llm && npm run dev              # :4010

# 6. Frontend
cd packages/frontend && npm run dev         # :3000

# 7. Admin frontend
cd packages/admin-frontend && npm run dev   # :3001
```

---

## GraphQL Schema

Schema-first approach. Source of truth lives in `packages/shared-schema/schema/*.graphql`:

| Schema | Entities |
|---|---|
| `auth.graphql` | User, roles, login/register/password reset |
| `reservation.graphql` | Reservation lifecycle, event history, filters |
| `room.graphql` | Rooms with status/type/rate code relations |
| `room-type.graphql` | Room categories |
| `rate-code.graphql` | Pricing categories |
| `guest.graphql` | Guest profiles, passport/visa data |
| `campaign.graphql` | Email templates, campaigns, sends, targeting |
| `voucher.graphql` | Gift vouchers, usage tracking |
| `wellness.graphql` | Services, therapists, bookings |
| `statistics.graphql` | Revenue timeline, occupancy, analytics |
| `hotel.graphql` | Hotel entity (federation @key) |

Run `cd packages/shared-schema && npm run codegen` to regenerate TypeScript types.

---

## API Endpoints

| Service | Endpoint | Description |
|---|---|---|
| GraphQL | `http://localhost:8080/graphql` | Federated API (via gateway) |
| GraphQL (direct) | `http://localhost:4001/graphql` | Backend subgraph |
| Webhooks API | `http://localhost:4002/api/webhooks` | Webhook CRUD (admin JWT) |
| Webhooks Docs | `http://localhost:4002/api/docs` | OpenAPI/Swagger UI |
| LLM Chat | `ws://localhost:4010` | Socket.IO streaming chat |
| Health | `http://localhost:4002/health` | Webhook service health |

---

## License

Private project
