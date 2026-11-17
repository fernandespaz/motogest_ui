import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './authStore';
import { queryClient } from '@/lib/queryClient';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      loginEm: null,
      usuarioId: undefined,
      tenantId: undefined,
      nome: undefined,
      email: undefined,
      perfil: undefined,
      permissoes: [],
      isAuthenticated: false,
    });
  });

  describe('login', () => {
    it('populates session state from the login response', () => {
      useAuthStore.getState().login({
        token: 'abc123',
        tipo: 'Bearer',
        expiraEmSegundos: 3600,
        usuarioId: 1,
        tenantId: 9,
        nome: 'Diego',
        email: 'diego@ramtec.com.br',
        perfil: 'Administrador',
        permissoes: ['CLIENTE_READ'],
      } as never);

      const state = useAuthStore.getState();
      expect(state.usuarioId).toBe(1);
      expect(state.tenantId).toBe(9);
      expect(state.nome).toBe('Diego');
      expect(state.permissoes).toEqual(['CLIENTE_READ']);
      expect(state.isAuthenticated).toBe(true);
      expect(state.loginEm).toBeGreaterThan(0);
    });

    it('clears every other client cache before applying the new session', () => {
      const clearSpy = vi.spyOn(queryClient, 'clear');
      const clearStorageSpy = vi.spyOn(useAuthStore.persist, 'clearStorage');

      useAuthStore.getState().login({ token: 'abc123' } as never);

      expect(clearStorageSpy).toHaveBeenCalled();
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('persistência', () => {
    it('nunca persiste o token (JWT e refresh vivem só em cookies HttpOnly)', () => {
      useAuthStore.getState().login({ token: 'abc123', nome: 'Diego' } as never);

      const salvo = sessionStorage.getItem('motogest.auth') ?? '';
      expect(salvo).toContain('Diego');
      expect(salvo).not.toContain('abc123');
      expect(useAuthStore.getState()).not.toHaveProperty('token');
      expect(localStorage.getItem('motogest.auth')).toBeNull();
    });
  });

  describe('logout', () => {
    it('resets the session to its logged-out defaults', () => {
      useAuthStore.getState().login({ token: 'abc123', permissoes: ['CLIENTE_READ'] } as never);

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.loginEm).toBeNull();
      expect(state.permissoes).toEqual([]);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('returns true only for a permission the session actually has', () => {
      useAuthStore.setState({ permissoes: ['CLIENTE_READ'] });
      expect(useAuthStore.getState().hasPermission('CLIENTE_READ')).toBe(true);
      expect(useAuthStore.getState().hasPermission('CLIENTE_WRITE')).toBe(false);
    });
  });
});
