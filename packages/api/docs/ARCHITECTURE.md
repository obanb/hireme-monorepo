# API Gateway - Architecture & Structure

## Overview
Apollo Federation Gateway that composes multiple GraphQL subgraphs.

## Architecture Diagram
```
Client Request
    ↓
API Gateway (this service)
    ↓
IntrospectAndCompose
    ↓
┌───────────┬──────────────┬──────────────┐
│ Hotels    │ Reservations │ Bookings     │
│ Subgraph  │ Subgraph     │ Subgraph     │
└───────────┴──────────────┴──────────────┘
    ↓
Composed Supergraph
    ↓
Response to Client
```

## Current Subgraphs
- `hotels` - Hotel domain (backend service)
- `reservations` - Reservation domain (gateway service)

## File Structure
```
src/
└── index.ts          # Main gateway setup
    ├── Express app
    ├── Apollo Gateway
    ├── Health endpoint
    └── GraphQL endpoint
```

## Dependencies
- `@apollo/gateway` - Federation gateway
- `@apollo/server` - GraphQL server
- `express` - Web framework
- `telemetry` - Logging and tracing

## Environment Variables
- `PORT` - Server port (default: 8080)
- `SERVICE_NAME` - Service identifier
- `HOTEL_SUBGRAPH_URL` - Hotel subgraph endpoint
- `OTEL_EXPORTER_OTLP_ENDPOINT` - Tracing endpoint

## Integration Points
- Subgraphs: Introspects and composes schemas
- Telemetry: Logs requests and traces
- Common: Uses shared utilities

## Schema Composition
- Automatically composes subgraph schemas
- Handles federation directives (@key, @shareable)
- Creates unified supergraph schema

