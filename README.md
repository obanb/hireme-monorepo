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
- Email composition directly from guest detail or reception card (Resend API)

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

### Loyalty Tiers
- Configurable loyalty tier system (Bronze, Silver, Gold, etc.) with custom colors and badge display
- Automatic tier evaluation per guest based on reservation count and total spend thresholds
- Tier badges shown inline in guest list, guest detail modal, and reception reservation cards
- Sort-order-based priority: guest is assigned the highest-priority tier they qualify for

### Parking Management
- Visual parking map: 30 spaces across 5 rows, color-coded by status (free/occupied/VIP/disabled)
- Assign spaces to vehicles with owner name, email, license plate, arrival/departure times and notes
- Release occupancy with full history preserved (soft delete)
- Live statistics: occupancy rate, today's arrivals and departures
- Search highlight and currently-parked table with quick release

### Room Maintenance
- Housekeeping board: all rooms displayed as color-coded cards by maintenance status
- Four statuses: Dirty (red), Clean (green), Maintenance (amber), Checked (blue)
- Click any room card to update its status, add notes, and record which staff member updated it
- Multi-select and bulk status update for floor-wide or whole-hotel resets
- Stats bar doubles as a filter: click a status count to filter the board to that status only

### Arrival Intelligence (Predictions)
- Receptionist-facing forecast page (`/hotel-cms/predictions`) showing expected arrivals and departures for the next 1–3 days
- Hourly bar chart built from an industry-standard check-in/check-out distribution model applied to daily reservation totals (actual timestamps not stored, see [`docs/predictions-feature.md`](docs/predictions-feature.md))
- Peak time callouts per day: "arrival peak 15:00 / departure peak 11:00"
- Intensity classification: Quiet / Moderate / Busy / Peak based on total guest movement
- Guest roster tabs (arrivals / departures) with direct links to booking detail
- 1D / 2D / 3D selector, live clock, currently in-house count
- Linked from Reception page and sidebar

### Activity Feed & Audit Trail
- Human-readable event timeline on every booking detail page — maps raw event-sourced events to labelled entries with icons, actor names, and relative timestamps ("Room assigned · 14:32 · by Jana")
- Global Recent Activity panel on the bookings list page shows the last 30 events across all reservations
- Events covered: reservation created, confirmed, cancelled, rooms assigned, account opened
- Backed by `recentActivity` and `guestActivity` GraphQL queries joining the event store with guest data

### Statistics & Analytics
- Revenue by room type: horizontal bar chart with booking count and average stay length per type
- Occupancy rate over time: line chart using `generate_series` to compute daily occupancy across selected date range
- KPI cards: Total Revenue, ADR (Average Daily Rate), RevPAR, Cancellation Rate %, Average Stay, Occupancy Rate
- All queries filter by `check_in_date` (not `created_at`) for accurate date-range results

### AI Chat Assistant
- OpenAI SDK with streaming responses (requesty.ai compatible)
- MCP (Model Context Protocol) tool calling over stdio transport
- 13 tools: reservations, rooms, guests, rate codes, navigation, **web search**
- **Web search via Tavily API**: answers questions about local events, attractions, ski conditions, weather, restaurants near the hotel — anything requiring live internet data
- RAG pipeline: MongoDB vector embeddings (text-embedding-3-small) with cosine similarity search
- Real-time Socket.IO streaming with tool call visualization
- Auto-indexing worker for reservation/room/rate code data
- See [`docs/tavily.md`](docs/tavily.md) for web search implementation details

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
- Dark mode across all pages (Tailwind CSS `dark:` classes)
- i18n: English + Czech (~540 translation keys)
- Framer Motion animations
- Statistics dashboards with revenue timeline, occupancy analytics, ADR, RevPAR
- Arrival Intelligence page with hourly forecast charts and guest rosters
- Booking detail event timeline with human-readable audit trail
- Reception page: keyboard navigation (↑↓/Enter), Check-In Wizard, Predictions shortcut
- Reusable `ComposeEmailModal` component wired into guest detail and reception cards

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, Framer Motion |
| API | Apollo Gateway, Apollo Server 4, GraphQL Federation v2 |
| Backend | Express, TypeScript 5, Node.js |
| Data | PostgreSQL (event store + auth), MongoDB (RAG vectors), RabbitMQ |
| AI | OpenAI SDK, MCP Protocol, RAG (text-embedding-3-small), Tavily (web search) |
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
├── mcp/               MCP server (13 tools, stdio transport)
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
| `account.graphql` | Billing accounts linked to reservations |
| `rental.graphql` | Rental item catalog and bookings |
| `tiers.graphql` | Loyalty tiers, guest tier evaluation |
| `parking.graphql` | Parking spaces and vehicle occupancies |
| `maintenance.graphql` | Room housekeeping status |
| `forecast.graphql` | Arrival intelligence — daily forecast with hourly guest distribution |

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

## Developer Tools

### RabbitMQ Management UI

Built into the Docker image (`rabbitmq:3-management-alpine`) — no extra install required.

**Open in browser:** [`http://localhost:15672`](http://localhost:15672)

```
Username: guest
Password: guest
```

What you can do there:
- **Queues** — see all queues, message counts, consumer counts, memory usage
- **Exchanges** — inspect the `domain_events` topic exchange and its bindings
- **Messages** — publish test messages manually, or peek at queued messages without consuming them (Get Messages button)
- **Connections / Channels** — see which services are connected and their channel states
- **Overview** — global throughput charts (publish rate, deliver rate, ack rate)

> The project uses a `domain_events` topic exchange. Reservation events are routed with keys like `reservation.created`, `reservation.confirmed`, `reservation.cancelled`, `reservation.room_assigned`.

---

### GraphQL Sandbox (Apollo)

Apollo Server 4 ships with Apollo Sandbox in development mode. Open the backend subgraph directly in a browser:

**Open in browser:** [`http://localhost:4001/graphql`](http://localhost:4001/graphql)

You get a full schema explorer, query builder, and response inspector — no install needed.

---

### PostgreSQL

The easiest cross-platform option is **TablePlus** (free tier available) or **DBeaver** (fully free). Connect with:

```
Host:     localhost
Port:     5432
Database: postgres
User:     postgres
Password: postgres
```

Alternatively, run queries directly via Docker:

```bash
docker exec -it hireme-postgres psql -U postgres -d postgres
```

---

## License

Private project
