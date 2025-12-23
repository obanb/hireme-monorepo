# Shared Schema Changelog

## [Unreleased]

### Added
- GraphQL schema-first approach with code generation
- Apollo Federation v2 schema definitions
- GraphQL Code Generator setup for TypeScript types
- Schema loader utilities for services
- Manual TypeScript types for API contracts

### Schema Files
- `schema/hotel.graphql` - Hotel subgraph schema with federation directives
- `schema/common.graphql` - Shared directives and types

### Generated Types
- TypeScript types generated from GraphQL schema
- Resolver types for type-safe GraphQL resolvers
- Federation-aware type generation

### Utilities
- `getHotelSchema()` - Helper to load hotel schema as string
- Type exports for use in services
- Manual types for commands and DTOs

### Integration
- Used by `backend` package for hotel subgraph
- Used by `api` gateway for schema composition
- Provides type safety across services

### Dependencies
- `graphql` - GraphQL runtime
- `graphql-tag` - GraphQL query parsing
- `@graphql-codegen/cli` - Code generation
- `@graphql-codegen/typescript` - TypeScript plugin
- `@graphql-codegen/typescript-resolvers` - Resolver types plugin

