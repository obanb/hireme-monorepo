# API Gateway

Apollo Federation Gateway that composes multiple GraphQL subgraphs into a unified supergraph.

## Overview

This package acts as the central API gateway for the Hotel CMS platform, using Apollo Gateway to compose federated subgraphs from multiple services.

## Features

- Apollo Gateway with `IntrospectAndCompose`
- Express server with CORS and JSON parsing
- Health check endpoint (`/health`)
- GraphQL endpoint (`/graphql`)
- Telemetry integration (logging and tracing)
- Automatic subgraph composition

## Architecture

```
API Gateway
    ↓
Composes Subgraphs:
  - hotels (backend service)
  - reservations (gateway service)
  - ... (more subgraphs)
    ↓
Unified GraphQL API
```

## Setup

### Install Dependencies

```bash
npm install
```

### Environment Variables

```env
PORT=8080
SERVICE_NAME=api-gateway
HOTEL_SUBGRAPH_URL=http://localhost:4001/graphql
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

### Run

```bash
# Development
npm run build && npm start

# Or with ts-node
ts-node src/index.ts
```

## Endpoints

- `GET /health` - Health check with federation status
- `GET /hello` - Simple test endpoint
- `POST /graphql` - GraphQL endpoint (federated)

## Dependencies

- `@apollo/gateway` - Apollo Federation Gateway
- `@apollo/server` - Apollo Server
- `express` - Web server
- `telemetry` - Logging and tracing
- `common` - Shared utilities

## Notes

- Gateway requires all subgraphs to be running before it can start
- Uses `IntrospectAndCompose` to automatically discover subgraph schemas
- Telemetry is integrated for observability

