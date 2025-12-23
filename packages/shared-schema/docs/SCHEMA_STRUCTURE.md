# Shared Schema - Schema Structure

## Current Schemas

### hotel.graphql
Federated hotel subgraph schema with:
- `Hotel` type with `@key` directive
- `Query` type with hotel queries
- Federation v2 directives

### common.graphql
Shared directives and types (currently empty, ready for extensions)

## Schema Organization

```
schema/
├── hotel.graphql          # Hotel subgraph
├── reservation.graphql    # Reservation subgraph (future)
├── booking.graphql        # Booking subgraph (future)
└── common.graphql         # Shared types/directives
```

## Generated Types

### Location
`generated/types.ts` - Auto-generated from GraphQL schemas

### Types Generated
- `Hotel` - Hotel entity
- `Query` - Query root type
- `QueryHotelArgs` - Hotel query arguments
- `QueryFeaturedHotelsArgs` - Featured hotels arguments
- `Resolvers` - Resolver types
- `HotelResolvers` - Hotel resolver types

## Code Generation

### Configuration
`codegen.yml` - GraphQL Code Generator config

### Plugins
- `typescript` - TypeScript types
- `typescript-resolvers` - Resolver types

### Settings
- `federation: true` - Federation-aware generation
- `useIndexSignature: true` - Flexible types
- `enumsAsTypes: true` - Enum handling

## Usage Pattern

### In Services
```typescript
import { getHotelSchema } from 'shared-schema';
import { Hotel, QueryHotelArgs } from 'shared-schema';

const typeDefs = gql(getHotelSchema());
const resolvers = {
  Query: {
    hotel: (_: unknown, args: QueryHotelArgs) => { }
  }
};
```

## Schema Ownership

- Each service owns its subgraph schema
- Gateway composes all schemas
- Frontend uses composed supergraph

