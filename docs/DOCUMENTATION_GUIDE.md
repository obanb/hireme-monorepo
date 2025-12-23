# Documentation Guide

This guide explains how to maintain documentation for AI assistants and team members.

## Documentation Structure

Each package should have a `docs/` folder with:

### Required Files

1. **`GOALS.md`** - Long-term goals and roadmap
   - Vision statement
   - Short-term goals (3 months)
   - Medium-term goals (3-6 months)
   - Long-term goals (6+ months)
   - Technical debt items
   - Notes and considerations

2. **`ARCHITECTURE.md`** or **`SCHEMAS.md`** - Technical reference
   - Architecture diagrams
   - File structure
   - Schema definitions
   - Data models
   - Integration points
   - Dependencies

### Optional Files

3. **`CONTEXT.md`** - AI assistant context
   - Key concepts
   - Important decisions
   - Common patterns
   - Gotchas and workarounds
   - Future considerations

4. **`API.md`** - API documentation (if applicable)
   - Endpoints
   - Request/response formats
   - Authentication
   - Examples

## File Naming Conventions

- Use UPPERCASE for important files: `GOALS.md`, `ARCHITECTURE.md`
- Use lowercase for specific topics: `event_schemas.md`, `api_reference.md`
- Use kebab-case for multi-word files: `schema-structure.md`

## Content Guidelines

### GOALS.md Format
```markdown
## Vision
One sentence vision statement

## Short Term (Next 3 Months)
- [ ] Goal 1
- [ ] Goal 2

## Medium Term (3-6 Months)
- [ ] Goal 1

## Long Term (6+ Months)
- [ ] Goal 1

## Technical Debt
- [ ] Item 1

## Notes
Additional context
```

### ARCHITECTURE.md Format
```markdown
## Overview
High-level description

## Architecture Diagram
ASCII or text diagram

## File Structure
```
src/
├── file1.ts
└── file2.ts
```

## Dependencies
- Package: Why it's used

## Integration Points
- Service: How we integrate
```

## Best Practices

1. **Keep it updated**: Update docs when making significant changes
2. **Be specific**: Include code examples and diagrams
3. **Link related docs**: Cross-reference between files
4. **Use checkboxes**: For goals and tasks
5. **Include context**: Explain "why" not just "what"

## For AI Assistants

When creating new features:
1. Check `GOALS.md` for long-term direction
2. Review `ARCHITECTURE.md` for structure
3. Update `CHANGELOG.md` with what was created
4. Add notes to relevant docs if patterns change

## Maintenance

- Review and update quarterly
- Remove completed goals
- Archive old decisions
- Keep schemas in sync with code

