# Project Changelog

This file tracks major changes and additions to the Hotel CMS platform.

## [Unreleased]

### New Packages Created

#### `api` - Apollo Federation Gateway
- Apollo Gateway implementation
- Composes hotel and reservation subgraphs
- Health check endpoint
- Telemetry integration
- See `packages/api/CHANGELOG.md` for details

#### `backend` - Hotel GraphQL Subgraph
- Apollo Federation v2 subgraph
- Hotel domain queries
- Integration with shared-schema
- See `packages/backend/CHANGELOG.md` for details

#### `gateway` - Event Sourcing Service
- Complete event sourcing implementation
- PostgreSQL event store
- RabbitMQ event bus
- CQRS pattern with projections
- See `packages/gateway/CHANGELOG.md` for details

#### `shared-schema` - GraphQL Schema Package
- Schema-first GraphQL approach
- GraphQL Code Generator setup
- Federation schema definitions
- TypeScript type generation
- See `packages/shared-schema/CHANGELOG.md` for details

#### `telemetry` - Observability Package
- Structured logging with Pino
- Distributed tracing with OpenTelemetry
- Service instrumentation
- See `packages/telemetry/CHANGELOG.md` for details

#### `admin-frontend` - Admin Dashboard
- Next.js 15 admin interface
- Dashboard with statistics
- Activity monitoring
- System status
- See `packages/admin-frontend/CHANGELOG.md` for details

### Frontend Enhancements

#### `frontend` - Customer UI
- Hotel CMS dashboard page
- Room availability calendar component
- API documentation page
- Server components for data fetching
- See `packages/frontend/CHANGELOG.md` for details

### Architecture Decisions

- **GraphQL Federation**: Using Apollo Federation v2 for microservices
- **Event Sourcing**: PostgreSQL + RabbitMQ for event-driven architecture
- **CQRS**: Command Query Responsibility Segregation pattern
- **Schema-First**: GraphQL schemas as source of truth
- **Type Safety**: Generated TypeScript types from GraphQL schemas
- **Observability**: Centralized logging and tracing

### Infrastructure

- Monorepo structure with npm workspaces
- Shared packages for common functionality
- Type-safe GraphQL schemas
- Event sourcing for auditability
- Distributed tracing for debugging

### Documentation

- README files for all packages
- CHANGELOG files documenting what was created
- Architecture documentation
- Setup and usage guides

