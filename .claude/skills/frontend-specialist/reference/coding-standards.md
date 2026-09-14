# Coding Standards

## SOLID, applied to this codebase (not the abstract version)

- **Single Responsibility** — a `features/*Page.tsx` renders and wires up
  interaction; it does not build HTTP requests or own cache-invalidation
  logic. A `hooks/use*.ts` owns query keys, fetching, and mutations for one
  resource; it does not render JSX. An `api/endpoints/*.ts` module builds
  requests for one resource; it does not know about React Query. Keep new
  code inside the layer it belongs to (see `architecture.md`) instead of
  reaching across layers because it's convenient in the moment.
- **Open/Closed** — `createCrudHooks` is the concrete example: a new resource
  gets full CRUD hooks by calling the factory, not by copy-pasting and
  editing a similar resource's hook file. Extend by adding a new endpoint
  module + factory call, not by modifying the factory to special-case a
  resource.
- **Liskov substitution** — components sharing a prop contract (e.g. every
  `Field.tsx` input extending its native HTML element's props) should stay
  substitutable for that native element — don't add a prop that silently
  changes expected behavior (e.g. an `Input` that stops calling `onChange`
  for some value ranges) without documenting it loudly at the call site.
- **Interface segregation** — a hook or component should ask for only the
  props/params it actually uses. `ItemsEditor`'s `mostrarTempoVendido`/
  `disabled` props are optional and independent — a caller that doesn't need
  the time column doesn't have to think about it.
- **Dependency inversion** — components and hooks depend on `apiClient`
  (the abstraction) and on endpoint modules, never on `axios` directly or on
  a hardcoded base URL. This is what let the whole app's 401/403 handling and
  auth-header injection live in exactly one place (`api/client.ts`).

## DRY: reuse over re-derivation

If you're about to write logic that resembles something already in
`hooks/factory.ts`, `lib/formatters.ts`, `lib/perfil.ts`, or a `features/shared/*`
component, extend or reuse it instead of writing a parallel version — see
prohibited action #11. When you do extract something into a shared helper
(as `isMecanico` was extracted from `layout/nav.ts` into `lib/perfil.ts` when
a second call site needed it), update the original call site to import the
shared version rather than leaving two copies.

Three similar lines inline is fine. A third near-identical implementation of
the same concept is the signal to extract.

## Readability

- Name things for what they mean in the domain (`podeEnviar`, `readOnly`,
  `estoqueDisponivel`), not generically (`flag1`, `data2`).
- Comments explain **why**, not what — a hidden constraint, a backend quirk,
  a workaround for a specific confirmed bug. If the code is legible without
  the comment, don't add it. This codebase's existing comments are a good
  reference for the intended tone (e.g. the permission-gating comments in
  `useOficina.ts`, `useUsuarios.ts`).
- Portuguese is the established language for in-app strings and most
  in-code comments in this project (the domain is a Brazilian oficina
  mecânica business) — match the existing convention in the file you're
  editing rather than introducing English mid-file.
- Don't add defensive code for states that can't occur given the types/flow
  already in place — trust the type system and the established data flow;
  validate only at real boundaries (user input, API responses).

## Testing & coverage

- Run `npm run test` (vitest) before considering any change done; run
  `npx tsc --noEmit` alongside it — types catch a different class of bug than
  tests do, and this project treats both as required, not optional.
- Coverage tooling: add `@vitest/coverage-v8` and a `test:coverage` script
  (`vitest run --coverage`) if not already present — check `package.json`
  first, since this may have already been set up after this guide was
  written. Coverage is a **signal to investigate gaps**, not a number to
  game — a change that adds behavior without a corresponding test (a new
  hook, a new validation rule, a new status-transition guard) is incomplete,
  regardless of what the aggregate percentage says.
- Prefer testing behavior through the same seams the app uses in production:
  a hook via `renderHook` + the query client test wrapper
  (`src/test/queryClientWrapper.tsx`), a component via
  `@testing-library/react` interacting with rendered output, not implementation
  internals.
- For anything with a visible UI effect, an automated test is necessary but
  not sufficient — verify it live in the browser too (see the SKILL.md
  checklist). This project has a live backend to test against; use it.

## Performance

- React Query: set a deliberate `staleTime` for data that doesn't need to be
  refetched aggressively (see `useOficinaLogoSrc`'s `staleTime: Infinity` for
  a blob URL that only changes on explicit upload/removal). Don't leave every
  query on default settings without considering whether that's actually
  right for that data's change frequency.
- Avoid request waterfalls: when multiple independent pieces of data are
  needed to build one result (e.g. a PDF needing cliente + veículo + oficina),
  fetch them with `Promise.all`, not sequential `await`s (see
  `buildOrdemServicoPdfBlob` in `ordemServicoPdf.ts`).
- Debounce search-driven queries (see `useDebouncedValue` used by the cliente/
  veículo comboboxes) — don't fire a request per keystroke.
- Paginate list queries by default (`PageParams`/`size`) rather than fetching
  unbounded lists, even for data that's small today — a "just this oficina's
  100 produtos" assumption breaks the moment a tenant has more.
- Downscale images before embedding them somewhere size-sensitive (see
  `logo.ts` capping the oficina logo to 400px on its longest side before
  embedding in a PDF) rather than shipping the original upload resolution.
- Don't over-invalidate React Query caches: invalidate the specific keys a
  mutation actually affects (see `useCriarOSAPartirDeOrcamento` invalidating
  both `ordensServicoKeys.all` and `orcamentosKeys.all` because that one
  action changes both resources) rather than a blanket `invalidateQueries()`
  with no key, which forces every open query in the app to refetch.
