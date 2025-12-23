# Backend - GraphQL Schemas & Types

## Current Schema

### Hotel Type
```graphql
type Hotel @key(fields: "id") {
  id: ID!
  name: String!
  city: String!
  rating: Float!
  roomCount: Int! @shareable
}
```

### Queries
```graphql
type Query {
  hotels: [Hotel!]!
  hotel(id: ID!): Hotel
  featuredHotels(limit: Int = 2): [Hotel!]!
}
```

## Federation Directives
- `@key(fields: "id")` - Hotel is a federated entity
- `@shareable` - roomCount can be resolved by multiple subgraphs

## TypeScript Types
Generated from `shared-schema` package:
- `Hotel` - Hotel entity type
- `QueryHotelArgs` - Arguments for hotel query
- `QueryFeaturedHotelsArgs` - Arguments for featuredHotels query

## Schema Location
- Source: `packages/shared-schema/schema/hotel.graphql`
- Used via: `getHotelSchema()` from `shared-schema`

## Future Schema Additions
- Hotel details (address, amenities, etc.)
- Room types
- Availability queries
- Search and filter inputs

