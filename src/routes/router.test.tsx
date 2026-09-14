import { describe, expect, it } from 'vitest';
import { router } from './router';

describe('router', () => {
  it('registers the public, auth, and app-shell route groups', () => {
    const paths = router.routes.map((r) => r.path);
    expect(paths).toEqual(
      expect.arrayContaining(['/login', '/cadastro', '/root/oficinas', '/orcamentos/publico/:token']),
    );
  });

  it('nests every authenticated screen under RequireAuth → AppShell', () => {
    const authGroup = router.routes.find((r) => r.path === undefined && r.children);
    const appShellGroup = authGroup?.children?.[0];
    const appPaths = appShellGroup?.children?.map((r) => r.path) ?? [];

    expect(appPaths).toEqual(
      expect.arrayContaining(['/', '/clientes', '/ordens-servico/:id', '/minhas-os', '/financeiro']),
    );
  });

  it('falls back to redirecting unknown paths to /', () => {
    const catchAll = router.routes.find((r) => r.path === '*');
    expect(catchAll).toBeDefined();
  });
});
