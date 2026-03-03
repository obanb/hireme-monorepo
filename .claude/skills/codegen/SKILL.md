---
description: Run GraphQL codegen to regenerate TypeScript types from schema files. Use whenever a .graphql schema file is added or changed.
allowed-tools: Bash, Read, Glob
---

Run GraphQL codegen for `packages/shared-schema` to regenerate `generated/types.ts`.

## When to use
- After adding or modifying any `.graphql` file in `packages/shared-schema/schema/`
- Before building backend or api packages that import from `shared-schema`

## Steps

1. Run codegen:
```bash
cd /c/hireme/packages/shared-schema && npm run codegen
```

2. Check the output in `packages/shared-schema/generated/types.ts` for the new types.

3. Report what changed (new types, modified types, etc.).

## Schema location
All GraphQL schemas live in `packages/shared-schema/schema/*.graphql`.
Generated types go to `packages/shared-schema/generated/types.ts`.
