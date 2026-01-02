# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Build all packages (from root)
npm run devel:build

# Generate GraphQL types (run first if schema changes)
cd packages/shared-schema && npm run codegen

# Build individual package
cd packages/<package-name> && npm run build
```

## Development

```bash
# Frontend (customer) - http://localhost:3000
cd packages/frontend && npm run dev

# Admin Frontend - http://localhost:3001
cd packages/admin-frontend && npm run dev

# Backend subgraph - http://localhost:4001/graphql
cd packages/backend && npm run dev

# API Gateway - http://localhost:8080/graphql (requires backend running)
cd packages/api && npm run build && npm start

# Event sourcing gateway (requires PostgreSQL + RabbitMQ)
cd packages/gateway && npm run dev
```

## Linting

```bash
cd packages/frontend && npm run lint
cd packages/admin-frontend && npm run lint
```

## Architecture

This is a **monorepo** (npm workspaces + Lerna) for a Hotel CMS platform.

### GraphQL Federation Pattern
```
Frontend Apps (Next.js 15)
        ↓
API Gateway (Apollo Gateway) - port 8080
        ↓
    Subgraphs:
    - backend (Hotels) - port 4001
    - gateway (Event Sourcing)
```

The API gateway uses `IntrospectAndCompose` to compose subgraphs at runtime. Backend subgraph must be running before starting the gateway.

### Event Sourcing (packages/gateway)
- **Event Store**: PostgreSQL with versioned events table
- **Event Bus**: RabbitMQ for async event distribution
- **Pattern**: CQRS with aggregate roots in `domain/`, handlers in `application/`, persistence in `infrastructure/`

### Schema-First GraphQL (packages/shared-schema)
GraphQL schemas in `schema/*.graphql` are the source of truth. Run `npm run codegen` to generate TypeScript types in `generated/types.ts`. All backend packages import types from this package.

### Package Dependencies
- `shared-schema` → generates types used by `backend`, `api`
- `telemetry`, `common` → shared utilities used by backend services
- `llm` → LLM integrations (Ollama, OpenAI, LangChain, MCP)

## Key Technologies

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Framer Motion
- **Backend**: Apollo Server 4, Apollo Gateway, Express, TypeScript 5
- **Data**: PostgreSQL (events), RabbitMQ (event bus), MongoDB (llm)
- **Observability**: Pino (logging), OpenTelemetry (tracing)

## Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Admin Frontend | 3001 |
| Backend Subgraph | 4001 |
| API Gateway | 8080 |
| PostgreSQL | 5432 |
| RabbitMQ | 5672, 15672 (mgmt) |
