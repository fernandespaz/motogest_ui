import { describe, expect, it } from 'vitest';
import { filterNavByPermission, getLandingPath, navItems } from './nav';

function permFrom(codigos: string[]) {
  return (codigo: string) => codigos.includes(codigo);
}

describe('filterNavByPermission', () => {
  it('hides every item whose permission the session lacks', () => {
    const visible = filterNavByPermission(permFrom(['CLIENTE_READ']), 'Administrador');
    expect(visible.map((i) => i.to)).toEqual(['/clientes']);
  });

  it('shows an item unlocked by any one of multiple permission codes', () => {
    const visible = filterNavByPermission(permFrom(['ORDEM_SERVICO_READ']), 'Consultor Técnico');
    expect(visible.some((i) => i.to === '/ordens-servico')).toBe(true);
  });

  it('a full-access non-Mecânico profile sees every item except Minhas OS', () => {
    const todasPermissoes = navItems.flatMap((i) => i.permissions ?? []);
    const visible = filterNavByPermission(permFrom(todasPermissoes), 'Administrador');
    expect(visible.map((i) => i.to)).not.toContain('/minhas-os');
    expect(visible.length).toBe(navItems.length - 1);
  });

  it('restricts a Mecânico profile to only Ordens de Serviço and Minhas OS, regardless of other granted permissions', () => {
    const todasPermissoes = navItems.flatMap((i) => i.permissions ?? []);
    const visible = filterNavByPermission(permFrom(todasPermissoes), 'Mecânico');
    expect(visible.map((i) => i.to).sort()).toEqual(['/minhas-os', '/ordens-servico']);
  });

  it('matches the Mecânico profile name case/accent-insensitively, same as isMecanico', () => {
    const todasPermissoes = navItems.flatMap((i) => i.permissions ?? []);
    const visible = filterNavByPermission(permFrom(todasPermissoes), 'MECANICO SENIOR');
    expect(visible.map((i) => i.to).sort()).toEqual(['/minhas-os', '/ordens-servico']);
  });
});

describe('getLandingPath', () => {
  it('sends a Mecânico with ORDEM_SERVICO_WRITE straight to Minhas OS, even with DASHBOARD_READ', () => {
    expect(getLandingPath(permFrom(['DASHBOARD_READ', 'ORDEM_SERVICO_WRITE']), 'Mecânico')).toBe('/minhas-os');
  });

  it('sends any other profile with DASHBOARD_READ to the dashboard', () => {
    expect(getLandingPath(permFrom(['DASHBOARD_READ']), 'Administrador')).toBe('/');
  });

  it('falls back to the first accessible nav item when DASHBOARD_READ is missing', () => {
    expect(getLandingPath(permFrom(['ORDEM_SERVICO_READ']), 'Consultor Técnico')).toBe('/ordens-servico');
  });

  it('falls back to /login when nothing is accessible', () => {
    expect(getLandingPath(permFrom([]), 'Administrador')).toBe('/login');
  });

  it('a Mecânico without ORDEM_SERVICO_WRITE falls through to the normal rules', () => {
    expect(getLandingPath(permFrom(['DASHBOARD_READ']), 'Mecânico')).toBe('/');
  });
});
