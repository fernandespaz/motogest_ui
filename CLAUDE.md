# MotoGest UI

Multi-tenant SaaS frontend (React 18 + TypeScript + Vite) for auto-repair-shop
management, consuming a live Spring Boot backend at `http://localhost:8080`
(OpenAPI spec: `curl -sS http://localhost:8080/v3/api-docs`; committed copy at
`openapi.json`).

## Before working in `src/`

Load the **`frontend-specialist`** skill (`.claude/skills/frontend-specialist/`).
It has this project's real architecture, a mandatory pre-done checklist, a
prohibited-actions list drawn from actual past incidents, and the coding/
testing/performance standards this codebase follows. Don't skip it because a
change looks small — several of the incidents behind the prohibited-actions
list started as small changes.

## After a significant change

Invoke the `tech-debt-reviewer` subagent before treating the work as done —
see the skill's §7 for what counts as "significant." It checks the diff
against this project's own standards and reports risks, debt, and cleanup
items.

## Quick commands

```bash
npx tsc --noEmit          # type-check
npm run test              # vitest
npm run gen:api           # regenerate src/api/schema.d.ts from openapi.json — refresh openapi.json from the live backend first
```
