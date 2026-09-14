---
name: frontend-specialist
description: MotoGest frontend engineering guide for this repository — feature-layered architecture, mandatory code-review checklist, prohibited actions that break structure or cause silent bugs, SOLID/DRY standards, and test-coverage/performance requirements. Use this skill for ANY change inside src/ — new components, hooks, API endpoints, forms, permission gating, routes, PDF/document generation — no matter how small, and before treating a change as finished. Also consult it when reviewing someone else's diff in this repo, when unsure whether an endpoint/field is real (verify against the live OpenAPI spec before writing code that assumes it exists), or when a pattern feels like it might already exist elsewhere in the codebase (permission gating, disabled-field cascade, shared item editor, CRUD hook factory).
---

# MotoGest Frontend Engineering Guide

MotoGest UI is a multi-tenant SaaS frontend (React 18 + TypeScript + Vite) for
auto-repair-shop management, consuming a live Spring Boot backend. This skill
is the accumulated, project-specific engineering knowledge for working in this
codebase correctly — not generic React advice.

Read the reference files below on demand; don't front-load all of them into
every task. Read `reference/architecture.md` before touching anything you
haven't touched before in this session. Read `reference/prohibited-actions.md`
before any change involving permissions, forms, shared components, or the
backend contract. Read `reference/coding-standards.md` when writing or
reviewing anything non-trivial.

## Why this exists

This backend and frontend are both actively evolving, sometimes by different
people at the same time. The failure mode this guide defends against isn't
"code that doesn't compile" — `tsc` and the test suite already catch that. It's
**silent** bugs: a permission gate that quietly hides data instead of erroring,
a stale form that shows the wrong record, a fabricated endpoint that "works"
until it hits real data, a shared component whose behavior nobody re-checked
in its other call site. Every rule below traces back to one of those.

## 1. Before writing code

1. **If the change touches anything backend-shaped** (a new field, a new
   endpoint, a status transition, a permission requirement) — verify it
   against the **live** OpenAPI spec first (`curl -sS
   http://localhost:8080/v3/api-docs`), not from memory of a past
   conversation or from `openapi.json` if the backend may have moved since it
   was last synced. See `reference/architecture.md#verifying-the-backend-contract`.
2. **Look for an existing pattern before writing a new one.** This codebase
   has a CRUD hook factory, a shared item editor, a shared PDF renderer, a
   shared permission-gating convention. Grep for something similar before
   inventing a parallel implementation. See `reference/architecture.md`.
3. **If a user-provided spec conflicts with verified backend reality**, say so
   clearly, with evidence (the actual API response, the actual schema) —
   don't silently implement a fictional version, and don't silently ignore
   the request either. Report the gap and let the human decide.

## 2. Mandatory self-review before calling a change done

Run through this before you consider any task finished — not just before a
PR. Skipping it is how a "small fix" becomes tomorrow's silent regression.

- [ ] `npx tsc --noEmit` is clean.
- [ ] `npm run test` passes; you added/updated tests for the behavior you
      changed (see `reference/coding-standards.md#testing--coverage`).
- [ ] You checked every other call site of anything shared you touched
      (a hook from `factory.ts`, `ItemsEditor`, `useOficina.ts`, a status-meta
      map) — not just the one screen you were looking at.
- [ ] You did not reintroduce, or newly introduce, anything on the
      `reference/prohibited-actions.md` list.
- [ ] If you changed permission-gated behavior, you checked it against a
      profile that has the permission and one that doesn't.
- [ ] If you changed a status/state-machine-driven flow, you verified the
      transition against the live backend (not assumed from the frontend
      code alone) — this backend enforces its own transition rules and
      rejects invalid ones with 4xx, which is the ground truth.
- [ ] You verified the change live (browser), not just via `tsc`/tests, for
      anything with a visible UI effect.
- [ ] For a significant change (see below), you invoked the
      `tech-debt-reviewer` subagent before wrapping up. See §7.

## 3. Prohibited actions

Full list with the real incidents behind each rule: `reference/prohibited-actions.md`.
Read it before touching permissions, shared components, forms, or anything
backend-facing — it is short and each entry explains the *why*, not just the rule.

## 4. Code quality: SOLID, DRY, readability

`reference/coding-standards.md` covers how SOLID and DRY concretely apply to
this codebase's own patterns (the hook factory, shared components, the API
client), plus naming/comment conventions already in use here.

## 5. Testing and coverage

`reference/coding-standards.md#testing--coverage` — includes the coverage
tooling, how to run it, and what's actually expected (no test theater: cover
behavior, not lines).

## 6. Performance

`reference/coding-standards.md#performance` — React Query caching/staleTime,
avoiding request waterfalls, pagination and debouncing conventions already
established in this codebase.

## 7. Technical-debt review and audit trail

**After any significant change**, invoke the `tech-debt-reviewer` subagent
(via the Agent tool) before treating the work as finished. "Significant"
means any of:

- A new feature or screen, not a one-line fix.
- A change to shared code: `hooks/factory.ts`, `features/shared/*`,
  `api/client.ts`, `store/authStore.ts`, `lib/*`.
- A change to permission gating, a status/approval workflow, or anything
  touching money/stock quantities.
- A change spanning more than ~3 files, or one you're not fully confident in.

A quick one-line fix with an obvious, contained blast radius doesn't need it
— use judgment, but bias toward invoking it when unsure.

**Audit trail**: when you finish a change, the commit message or hand-off
summary should state *why*, not just *what* (the codebase's own commit
history and comments follow this — see any `useX.ts` hook for examples of
comments explaining a non-obvious constraint rather than restating the code).
Don't write a comment or commit message that just repeats the diff.

**Continuous improvement**: if you notice technical debt while working
(duplicated logic, a pattern that should be extracted, a stale comment) that
isn't in scope for the current task, don't silently fix it inline in an
unrelated change — flag it (to the user, or via `spawn_task` if available)
rather than scope-creeping the current change or letting it rot unmentioned.
