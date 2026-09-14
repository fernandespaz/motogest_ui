# Architecture Reference

## The layering

Every feature follows the same four layers, and code should stay in its lane:

```
features/<name>/*Page.tsx     View        — components, forms, no direct fetch calls
hooks/use<Name>.ts            ViewModel   — TanStack Query hooks, cache keys, mutations
api/endpoints/<name>.ts       Model/HTTP  — request builders, one file per resource
api/client.ts                 Transport   — the one axios instance, auth header, 401/403 handling
```

A component should never call `apiClient` or an `api/endpoints/*` function
directly — it goes through a hook. A hook should never build a URL string
itself — it goes through `api/routes.ts`.

## `api/routes.ts` — single source of truth for paths

```ts
export const API_ROUTES = {
  ordensServico: {
    base: '/api/v1/ordens-servico',
    aPartirDeOrcamento: (orcamentoId: number) => `/api/v1/ordens-servico/a-partir-de-orcamento/${orcamentoId}`,
    status: (id: number) => `/api/v1/ordens-servico/${id}/status`,
    enviar: (id: number) => `/api/v1/ordens-servico/${id}/enviar`,
    // ...
  },
};
```

Endpoint modules build requests from this object. If the backend changes a
path, exactly one file changes. Never inline a path string in an endpoint
module or a hook.

## `hooks/factory.ts` — the CRUD hook factory

Most resources (`orcamentos`, `ordens-servico`, `clientes`, `veiculos`,
`produtos`, `perfis`, `usuarios`, ...) are plain CRUD over a REST resource.
Don't hand-write `useList`/`useDetail`/`useCreate`/`useUpdate`/`useRemove` for
a new one of these — use `createCrudHooks`:

```ts
const hooks = createCrudHooks<OrcamentoResponse, OrcamentoRequest, PageParams>('orcamentos', orcamentosApi);
export const orcamentosKeys = hooks.keys;
export const useOrcamentos = hooks.useList;
export const useOrcamento = hooks.useDetail;
export const useCreateOrcamento = hooks.useCreate;
export const useUpdateOrcamento = hooks.useUpdate;
```

`useList` takes an optional second argument `{ enabled?: boolean }` — use it
for permission gating (see below) instead of writing a one-off `useQuery`.
Non-CRUD actions (status transitions, `/enviar`, `/aprovar`, timer
start/pause/resume) are added alongside the factory output in the same
`useX.ts` file, following the existing `useMutation` + `qc.invalidateQueries`
pattern — look at `useOrdensServico.ts` for the fullest example (transitions,
timer actions, and the orçamento→OS conversion mutation that invalidates
*both* resources' caches).

## Permission-code-driven UI gating

The JWT carries a `permissoes: string[]` array (permission codes like
`OFICINA_READ`, `ESTOQUE_WRITE`, `USUARIO_READ`). `useAuthStore.hasPermission(codigo)`
checks membership in that array — this is the **only** real access-control
mechanism. Permission codes are assigned to named "perfis" (Administrador,
Mecanico, Consultor Tecnico, ...) editable by the tenant themselves via
Perfis de Acesso; the set of codes is not fixed, and neither are the names.

```ts
const hasPermission = useAuthStore((s) => s.hasPermission);
const { data } = useProdutos({ size: 100 }, { enabled: hasPermission('ESTOQUE_READ') });
```

Gate any query that depends on a permission the current profile might lack —
an un-gated query that 403s surfaces a global error toast on every page load
for that profile, even though the "error" is really just "this profile
doesn't have that permission," which is not always actually wrong. Real
permission gaps found this way get fixed by *gating the query* (graceful
absence), not by suppressing the error some other way. See
`prohibited-actions.md` for what NOT to do here.

`perfil` (the free-text profile *name* on the JWT) is used in exactly one
place as a UX shortcut: `lib/perfil.ts#isMecanico()`, which drives menu
restriction and landing-page routing for the default seed data, and
technician-only filtering (e.g. the "Técnico Resp." picker only lists users
whose `perfilNome` matches). It is explicitly documented there as **not** a
security boundary — a tenant can rename any profile to anything.

## Forms: react-hook-form + zod + Controller

Every form: `useForm` + `zodResolver(schema)`, a `FormProvider` wrapping the
`<form>`, plain `register()` for simple inputs, `Controller` for anything with
custom value shape (a combobox, a masked input, a select whose change needs a
side effect like auto-filling price from the selected item).

**Read-only/disabled forms**: do not wrap the form in
`<fieldset disabled={readOnly} className="contents">` — see
`prohibited-actions.md` item 1. Pass `disabled={readOnly}` explicitly to every
control.

**Same-route-different-record**: if two routes render the same page component
for different records (`/orcamentos/novo` and `/orcamentos/:id`, both →
`<OrcamentoFormPage />`), React Router reuses the component instance across
navigations between them. Split into an outer component keyed by the route
param and an inner component that does the actual `useForm` — see
`OrcamentoFormPage.tsx`'s `key={id ?? 'novo'}` wrapper. Without this, stale
form state survives navigating from one record to another.

## Shared components worth knowing before you rebuild them

- `features/shared/ItemsEditor.tsx` — the serviço/produto line-item editor
  used by both Orçamento and OS forms. Takes `mostrarTempoVendido` and
  `disabled` props. Shows stock (`quantidadeDisponivel`) next to a selected
  product and clamps quantity to it. Any change here affects both forms —
  check both call sites.
- `components/ui/Combobox.tsx` — searchable async-option select (cliente,
  veículo pickers).
- `lib/formatters.ts` — `formatCurrency`, `formatMinutosParaHoras` /
  `parseHorasParaMinutos` / `maskHorasInput` (HH:MM ⇄ minutes for
  `tempoVendidoMinutos`), date formatters. Add new formatting/parsing helpers
  here, don't reinvent them per-component.
- `features/shared/pdf/osDocumentPdf.ts` + `logo.ts` — the shared PDF template
  and logo-loading helper used by both Orçamento and OS PDF builders
  (`orcamentoPdf.ts`, `ordemServicoPdf.ts`). Logo loading is intentionally
  best-effort (returns `null` on any failure) since it's cosmetic — do not
  make PDF generation fail because a logo couldn't load.
- `lib/downloadBlob.ts` — opening a generated PDF blob in a new tab.

## `api/client.ts` — the one axios instance

Auth header injection, session-expiry pre-check, and 401/403 handling live
here. `ApiForbiddenError` is thrown for 403s (unless the local session record
already says the token should be expired, in which case it's treated as a
401 and forces re-auth instead of showing a permanent "sem permissão" toast).
`extractErrorMessage(error, fallback)` is the standard way to turn a caught
error into user-facing text — use it in every mutation's `catch`, don't
hand-roll error-message extraction.

Mutations built through `createCrudHooks` set `meta: { hasLocalErrorHandling: true }`
— this suppresses the global error toast so the call site's own
`try { await mutateAsync(...) } catch { toast.error(extractErrorMessage(...)) }`
is the only toast shown. If you add a mutation outside the factory, set this
meta flag too, or you'll get a duplicate/generic toast alongside your
specific one.

## Verifying the backend contract

- Live spec: `curl -sS http://localhost:8080/v3/api-docs`
- Committed copy: `openapi.json` at repo root — keep it in sync before
  regenerating types (it can drift if the backend changed since it was last
  pulled).
- Generated types: `npm run gen:api` runs `openapi-typescript` against
  `openapi.json` → `src/api/schema.d.ts`. Always refresh `openapi.json` from
  the live backend *first*, then regenerate — regenerating from a stale file
  reproduces the drift instead of fixing it.
- When in doubt about whether a field/endpoint/status transition is real,
  check the live spec or make a real authenticated request and read the
  actual response — don't assume from a schema name that a feature is wired
  up end-to-end (a field can exist in a shared DTO for one resource but be
  silently dropped by the persistence layer for another — this has happened
  in this project; verify round-trip, not just presence in the schema).
