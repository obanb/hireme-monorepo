# Common

Shared utilities and common functionality used across backend services.

## Overview

Provides reusable utilities, logging, and common types for the Hotel CMS platform.

## Features

- AsyncLocalStorage for request context
- Logging utilities
- UUID generation
- Basic authentication helpers
- Graceful shutdown utilities
- Common types and schemas

## Usage

```typescript
import { exportTest } from 'common';
import { logger } from 'common/logging';
import { generateUUID } from 'common/utils';

// Use shared utilities
const result = exportTest();
const id = generateUUID();
```

## Structure

- `asyncLocalStorage/` - Async local storage implementation
- `logging/` - Logging utilities
- `utils/` - Common utility functions
- `types/` - Shared TypeScript types

## Integration

Used by:
- `api` - API Gateway
- `backend` - Hotel subgraph
- Other backend services
