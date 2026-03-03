---
description: Scaffold a new full-stack feature for the hotel CMS. Use when asked to add a new entity, module, or feature end-to-end.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: "<feature-name>"
---

Scaffold a complete new feature called `$ARGUMENTS` following the existing patterns in this monorepo.

## Architecture pattern to follow

### 1. GraphQL Schema (`packages/shared-schema/schema/<feature>.graphql`)
- Define types, inputs, queries, mutations
- Use `extend type Query` and `extend type Mutation`
- Reference existing schemas for patterns (e.g. `reservation.graphql`, `room.graphql`)

### 2. Aggregate (`packages/backend/src/event-sourcing/<feature>-aggregate.ts`)
- Extend from the aggregate pattern (see `room-aggregate.ts` or `voucher-aggregate.ts`)
- Define state interface, events, static `create()` method

### 3. Projections (`packages/backend/src/event-sourcing/<feature>-projections.ts`)
- SQL INSERT/UPDATE handlers per event type
- `get<Feature>` and `list<Feature>` query functions
- Add `CREATE TABLE IF NOT EXISTS` to `initializeDatabase()` in `database.ts`

### 4. Repository (`packages/backend/src/event-sourcing/<feature>-repository.ts`)
- CRUD methods using `withTransaction` + `appendEvents` + projection
- Export a singleton instance

### 5. Formatter (`packages/backend/src/formatters/<feature>.formatter.ts`)
- Map DB rows to GraphQL shape (camelCase field names)

### 6. Resolver (`packages/backend/src/resolvers/<feature>.resolvers.ts`)
- Wire queries/mutations to repository + formatter
- Export `<feature>Resolvers`

### 7. Wire up
- Add to `packages/backend/src/resolvers/index.ts`
- Add to `packages/backend/src/event-sourcing/index.ts`

### 8. Frontend page (`packages/frontend/src/app/hotel-cms/<feature>/page.tsx`)
- Follow existing pages (e.g. `vouchers/page.tsx`, `parking/page.tsx`)
- Use `useLocale` for i18n, dark mode Tailwind classes
- Add locale keys to `packages/frontend/src/locales/en.ts` and `cs.ts`

### 9. Sidebar nav (`packages/frontend/src/components/HotelSidebar.tsx`)
- Add nav entry with a suitable Unicode icon

## Before starting
Read 2-3 existing feature implementations to match conventions exactly.
Run `/codegen` after adding the schema.
