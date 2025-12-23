# Telemetry

Enterprise-grade logging and distributed tracing library for backend services.

## Overview

Provides standardized logging and OpenTelemetry tracing across all backend services in the Hotel CMS platform.

## Features

- **Structured Logging**: Pino-based logging with configurable levels
- **Distributed Tracing**: OpenTelemetry integration with OTLP export
- **Service Context**: Automatic service name and environment tracking
- **Pretty Printing**: Development-friendly log formatting
- **Production Ready**: JSON logging for production environments

## Usage

### Basic Logging

```typescript
import { createLogger } from 'telemetry';

const logger = createLogger({ serviceName: 'my-service' });

logger.info('Service started');
logger.error({ error }, 'Operation failed');
logger.debug({ userId }, 'User action');
```

### Distributed Tracing

```typescript
import { initTracing, withSpan } from 'telemetry';

// Initialize tracing
initTracing({ serviceName: 'my-service' });

// Wrap operations in spans
const result = await withSpan('operation-name', async () => {
  // Your code here
  return data;
});
```

### Configuration

```typescript
const logger = createLogger({
  serviceName: 'my-service',
  level: 'info', // 'debug' | 'info' | 'warn' | 'error'
  prettyPrint: true // Auto-enabled in development
});

initTracing({
  serviceName: 'my-service',
  endpoint: 'http://localhost:4318/v1/traces', // OTLP endpoint
  environment: 'production'
});
```

## Environment Variables

- `LOG_LEVEL` - Logging level (default: `info`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OTLP trace exporter endpoint
- `NODE_ENV` - Environment (affects pretty printing)

## Dependencies

- `pino` - Fast JSON logger
- `pino-pretty` - Pretty log formatting
- `@opentelemetry/api` - OpenTelemetry API
- `@opentelemetry/sdk-trace-node` - Node.js tracing SDK
- `@opentelemetry/exporter-trace-otlp-http` - OTLP HTTP exporter

## Integration

Used by:
- `api` - API Gateway
- `backend` - Hotel subgraph
- `gateway` - Event sourcing service

