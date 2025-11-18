# Shared Schema

GraphQL schema definitions and generated TypeScript types for the hotel CMS platform.

## Structure

- `schema/` - GraphQL SDL files (source of truth)
- `generated/` - Auto-generated TypeScript types (from codegen)
- `src/` - Manual TypeScript types and exports

## Setup

1. Install dependencies:
```bash
npm install
```

2. Generate TypeScript types from GraphQL schema:
```bash
npm run codegen
```

This creates the `generated/types.ts` file that other packages import.

## Usage

### Import in Services

```typescript
import { Hotel, Query, getHotelSchema, QueryHotelArgs } from "shared-schema";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";

// Load schema string
const typeDefs = gql(getHotelSchema());

// Use generated types in resolvers
const resolvers = {
  Query: {
    hotel: (_: unknown, args: QueryHotelArgs) => {
      // Type-safe args!
    }
  }
};
```

## Development

```bash
npm run codegen:watch  # Watch mode - regenerates types on schema changes
```

## Example Usage

See `packages/backend/src/test-schema-usage.ts` for examples of using the generated types.

