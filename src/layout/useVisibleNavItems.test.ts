import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { MOBILE_PRIMARY_PATHS } from './nav';
import { useVisibleNavItems, useVisibleMobileNav } from './useVisibleNavItems';

describe('useVisibleNavItems', () => {
  it('reflects the current session’s permissions and perfil', () => {
    useAuthStore.setState({ permissoes: ['CLIENTE_READ'], perfil: 'Administrador' });
    const { result } = renderHook(() => useVisibleNavItems());
    expect(result.current.map((i) => i.to)).toEqual(['/clientes']);
  });
});

describe('useVisibleMobileNav', () => {
  it('splits visible items into primary (bottom bar) and secondary (drawer)', () => {
    useAuthStore.setState({
      permissoes: ['DASHBOARD_READ', 'AGENDA_READ', 'ESTOQUE_READ'],
      perfil: 'Administrador',
    });
    const { result } = renderHook(() => useVisibleMobileNav());

    expect(result.current.primary.every((i) => MOBILE_PRIMARY_PATHS.includes(i.to))).toBe(true);
    expect(result.current.secondary.every((i) => !MOBILE_PRIMARY_PATHS.includes(i.to))).toBe(true);
    expect(result.current.primary.map((i) => i.to)).toEqual(expect.arrayContaining(['/', '/agenda']));
    expect(result.current.secondary.map((i) => i.to)).toContain('/produtos');
  });
});
