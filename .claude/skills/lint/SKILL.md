---
description: Run linting on frontend packages. Use when asked to lint, check for lint errors, or before committing frontend changes.
allowed-tools: Bash
argument-hint: "[frontend|admin-frontend|all]"
---

Run ESLint on the specified frontend package.

## Usage
- `/lint` or `/lint all` → lint both frontends
- `/lint frontend` → lint `packages/frontend` only
- `/lint admin-frontend` → lint `packages/admin-frontend` only

## Commands

```bash
# frontend
cd /c/hireme/packages/frontend && npm run lint

# admin-frontend
cd /c/hireme/packages/admin-frontend && npm run lint
```

After running, summarize any errors or warnings found and suggest fixes for them.
