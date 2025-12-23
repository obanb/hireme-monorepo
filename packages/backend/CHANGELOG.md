# Backend (Hotel Subgraph) Changelog

## [Unreleased]

### Added
- Apollo Federation v2 subgraph for hotels
- GraphQL schema with `Hotel` type and queries
- Federation directives (`@key`, `@shareable`)
- Express server with CORS and JSON parsing
- Sample hotel data (Aurora Grand, Marina Vista, Summit Lodge)
- Integration with `shared-schema` package
- Type-safe resolvers using generated types
- GraphQL context with request IDs

### Schema
- `Hotel` type with federation key (`id`)
- `Query.hotels` - List all hotels
- `Query.hotel(id: ID!)` - Get hotel by ID
- `Query.featuredHotels(limit: Int)` - Get featured hotels

### Integration
- Uses `shared-schema` for GraphQL schema and TypeScript types
- Exports schema via `getHotelSchema()` helper
- Uses generated types: `Hotel`, `QueryHotelArgs`, `QueryFeaturedHotelsArgs`

### Files Created
- `src/index.ts` - Main server file with GraphQL setup
- `src/test-schema-usage.ts` - Example usage of shared schema types

### Dependencies
- `@apollo/server` - GraphQL server
- `@apollo/subgraph` - Federation support
- `express` - Web framework
- `shared-schema` - Shared GraphQL schemas and types

