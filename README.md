# Hotel CMS Platform

Monorepo containing a complete Hotel CMS platform with GraphQL Federation, Event Sourcing, and modern frontend applications.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                       │
├─────────────────────────────────────────────────────────┤
│  frontend/          admin-frontend/                     │
│  (Customer UI)      (Admin Dashboard)                   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  API Gateway Layer                      │
├─────────────────────────────────────────────────────────┤
│  api/                                                   │
│  (Apollo Federation Gateway)                            │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌─────────▼────────┐
│  Backend       │            │  Gateway         │
│  (Hotels)      │            │  (Event Sourcing)│
└────────────────┘            └──────────────────┘
        │                               │
        └───────────────┬───────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│              Shared & Infrastructure                    │
├─────────────────────────────────────────────────────────┤
│  shared-schema/  telemetry/  common/                    │
└─────────────────────────────────────────────────────────┘
```

## Packages

### Frontend Applications

- **`frontend`** - Customer-facing Hotel CMS interface
  - Hotel dashboard with room calendar
  - API documentation
  - Next.js 15 application

- **`admin-frontend`** - Administration dashboard
  - Admin interface with statistics
  - Activity monitoring
  - System status dashboard

### Backend Services

- **`api`** - Apollo Federation Gateway
  - Composes multiple GraphQL subgraphs
  - Unified GraphQL API
  - Health monitoring

- **`backend`** - Hotel GraphQL Subgraph
  - Apollo Federation v2 subgraph
  - Hotel domain queries
  - Uses shared schema

- **`gateway`** - Event Sourcing Service
  - Complete event sourcing implementation
  - PostgreSQL event store
  - RabbitMQ event bus
  - CQRS pattern

### Shared Packages

- **`shared-schema`** - GraphQL Schema & Types
  - Federation schemas
  - Generated TypeScript types
  - Schema-first approach

- **`telemetry`** - Observability
  - Structured logging (Pino)
  - Distributed tracing (OpenTelemetry)
  - Service instrumentation

- **`common`** - Shared Utilities
  - Common utilities
  - Logging helpers
  - Type definitions

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (for event sourcing)
- RabbitMQ (for event bus)
- Docker (optional, for services)

### Installation

```bash
# Install all dependencies
npm install

# Or install per package
cd packages/api && npm install
cd packages/backend && npm install
# ... etc
```

### Running Services

1. **Start Backend Subgraph**
   ```bash
   cd packages/backend
   npm run dev
   # Runs on http://localhost:4001/graphql
   ```

2. **Start API Gateway**
   ```bash
   cd packages/api
   npm run start
   # Runs on http://localhost:8080/graphql
   ```

3. **Start Event Sourcing Service** (requires PostgreSQL & RabbitMQ)
   ```bash
   cd packages/gateway
   npm run dev
   ```

4. **Start Frontend**
   ```bash
   cd packages/frontend
   npm run dev
   # Runs on http://localhost:3000
   ```

5. **Start Admin Frontend**
   ```bash
   cd packages/admin-frontend
   npm run dev
   # Runs on http://localhost:3001
   ```

## Project Structure

```
packages/
├── frontend/          # Customer UI
├── admin-frontend/    # Admin Dashboard
├── api/              # Federation Gateway
├── backend/          # Hotel Subgraph
├── gateway/          # Event Sourcing Service
├── shared-schema/    # GraphQL Schemas
├── telemetry/        # Observability
└── common/           # Shared Utilities
```

## Key Technologies

- **GraphQL**: Apollo Federation v2
- **Event Sourcing**: PostgreSQL + RabbitMQ
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Node.js, TypeScript, Express
- **Observability**: OpenTelemetry, Pino

## Documentation

Each package contains:
- `README.md` - Package overview and usage
- `CHANGELOG.md` - What was created/changed

See individual package READMEs for detailed documentation.

## Development

This is a monorepo using npm workspaces. Each package can be developed independently or together.

```bash
# Build all packages
npm run build

# Run tests (when added)
npm test
```

## License

Private project

