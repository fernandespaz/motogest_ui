# Prohibited Actions

Each of these is a real incident from this codebase, not a hypothetical.
They're listed as prohibitions because the failure mode is *silent* — nothing
throws, nothing red in `tsc`, the page looks fine until someone with the
wrong permission, the wrong browser, or the wrong sequence of clicks hits it.

## 1. Don't rely on `<fieldset disabled>` to cascade into descendants when the fieldset uses `className="contents"`

`display: contents` on a `<fieldset>` breaks native `disabled` propagation to
descendant form controls in this environment — the fieldset itself reports
`disabled === true` while a nested `<input>`/`<button>` still reports
`disabled === false`. This looked fine visually (still styled as if
disabled-adjacent) but a "read-only" record was actually still editable.

**Do instead**: drop the `<fieldset disabled>` wrapper, keep the
`className="contents"` div for layout if needed, and pass `disabled={readOnly}`
explicitly to every control (see `OrdemServicoFormPage.tsx` and
`OrcamentoFormPage.tsx` for the fixed pattern). This applies to `ItemsEditor`
too — its `disabled` prop must be threaded from the parent form, not assumed
from an ancestor fieldset.

## 2. Don't let a page-level query fire unconditionally when the data it fetches is permission-gated

`useOficinaAtual()`, `useUsuarios()`, `useServicos()`/`useProdutos()` inside
`ItemsEditor` are all real examples: some profiles (Mecânico, Consultor
Técnico) lack the permission behind these endpoints. An un-gated query 403s
on every page load for those profiles and surfaces a global "sem permissão"
toast the user can't dismiss or fix.

**Do instead**: `enabled: hasPermission('X_READ')` on the query. If the UI
still needs to *show* something (e.g. the previously-assigned name in a
select whose options list didn't load), fall back to a synthetic
single-option list built from data already on the record itself — see
`responsavelOptions` in `OrdemServicoFormPage.tsx`.

## 3. Don't reuse the same route element for two different records without a remount key

`/orcamentos/novo` and `/orcamentos/:id` both render `<OrcamentoFormPage />`.
React Router reuses the component instance when navigating between routes
that resolve to the same element — `useForm`'s state survives, so navigating
from editing one record to creating a new one (or to a different record)
shows stale data from whatever was open before.

**Do instead**: split into an outer component that reads the route param and
renders an inner component with `key={id ?? 'novo'}`, forcing a full remount
(and fresh `useForm`) whenever the target changes.

## 4. Don't fabricate a backend endpoint, field, or status value that hasn't been verified against the live spec

A user-provided spec (or a plausible-sounding REST convention) is not
evidence an endpoint exists. This project has repeatedly received specs
referencing endpoints like `/api/os/...` or fields that don't exist in the
real backend.

**Do instead**: check `curl -sS http://localhost:8080/v3/api-docs` (or the
synced `openapi.json`) before writing code that assumes a contract. If the
spec conflicts with reality, say so with evidence and ask how to proceed —
don't silently build the fictional version, and don't silently drop the
request either.

## 5. Don't assume a field's presence in a shared DTO means it's actually persisted for every resource that DTO is used by

`ItemRequest`/`ItemResponse` is shared between Orçamento and Ordem de Serviço
items and declares `tempoVendidoMinutos` on both — but the backend, at one
point, persisted it correctly for OS items while silently dropping it for
Orçamento items (200 response, field just absent, no error). Schema presence
is not proof of working persistence.

**Do instead**: after wiring a field to a form, actually save a real record
through the UI (or a raw authenticated request) and re-fetch it to confirm
the value round-trips, before trusting the schema alone.

## 6. Don't remove a UI action just because it looks redundant in the one status you observed it in

"Enviar para aprovação" showing on a freshly-created OS looked pointless in
isolation — but the same underlying mechanism (`tokenAprovacao`, generated
only by that action) is what a later edit-triggered revert-to-approval relies
on to notify the client of a changed price. Removing the button broke a
second, unrelated-looking feature that depended on its side effect.

**Do instead**: before removing or hiding an action, grep for every place
that reads the state it produces (a token, a flag, a cache key) and confirm
none of them still need it. When a backend enforces a state machine (this one
rejects invalid transitions with a 4xx and a message naming the required
source status), that message is ground truth for what's actually reachable —
test the transition live, don't infer it from the frontend's own status list.

## 7. Don't trust the profile *name* for anything security-relevant

`perfil`/`perfilNome` is free text a tenant admin can rename to anything via
Perfis de Acesso. `isMecanico()` in `lib/perfil.ts` exists purely as a UX
shortcut (menu shape, landing page, technician-picker filtering) and is
explicitly documented as not a security boundary. Never gate an actual
capability (what data loads, what a mutation is allowed to do) on a name
match — only on `hasPermission(codigo)`.

## 8. Don't regenerate `schema.d.ts` from a stale `openapi.json`

`npm run gen:api` reproduces whatever `openapi.json` currently says. If the
backend has changed since that file was last pulled, regenerating without
refreshing it first just re-encodes the drift instead of fixing it — and
gives false confidence that types are in sync when they aren't.

## 9. Don't make a runtime permission/profile change and assume it survives

Backend restarts in this project have, in practice, reset to a fresh/reseeded
dataset — wiping uploaded files (like an oficina's logo) and any ad-hoc
runtime changes made through the API. After any backend restart, re-verify
state you depend on (permissions you added, uploaded assets, test records)
rather than assuming it's still there.

## 10. Don't let a "cosmetic" failure (logo, avatar, optional branding) break the primary flow

Logo loading for PDFs and the sidebar is intentionally wrapped so any failure
(no logo uploaded, permission gap, CORS on an external URL) degrades to "no
logo" rather than failing the whole PDF/page render. Keep new cosmetic
data-fetches to this same standard — try/catch, return `undefined`/`null` on
failure, never let an optional visual element throw past the caller.

## 11. Don't duplicate a hook/helper that already exists

Before writing a new `isX(perfil)`-style check, a new date/currency
formatter, a new CRUD hook set, or a new disabled-cascade workaround — grep
for it first. `lib/perfil.ts`, `lib/formatters.ts`, and `hooks/factory.ts`
exist specifically so this kind of logic has exactly one home. A second,
slightly-different copy is how the two copies quietly drift apart.

## 12. Don't take a destructive or hard-to-reverse action against the live backend without confirming scope first

This includes: modifying a shared Perfis de Acesso profile, deleting records,
or any raw authenticated request that mutates data outside of what the
current task explicitly calls for. Test/throwaway records created while
verifying a change should be cleaned up (or clearly flagged if they can't
be, e.g. no delete endpoint exists for that resource) rather than left as
silent clutter in a shared dataset.
