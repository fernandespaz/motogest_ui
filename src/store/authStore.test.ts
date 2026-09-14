import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './authStore';
import { queryClient } from '@/lib/queryClient';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      tokenType: undefined,
      expiresAt: null,
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
      expect(state.token).toBe('abc123');
      expect(state.usuarioId).toBe(1);
      expect(state.tenantId).toBe(9);
      expect(state.nome).toBe('Diego');
      expect(state.permissoes).toEqual(['CLIENTE_READ']);
      expect(state.isAuthenticated).toBe(true);
      expect(state.expiresAt).toBeGreaterThan(Date.now());
    });

    it('defaults tokenType to Bearer when the response omits it', () => {
      useAuthStore.getState().login({ token: 'abc123' } as never);
      expect(useAuthStore.getState().tokenType).toBe('Bearer');
    });

    it('leaves expiresAt null when the response has no expiraEmSegundos', () => {
      useAuthStore.getState().login({ token: 'abc123' } as never);
      expect(useAuthStore.getState().expiresAt).toBeNull();
    });

    it('clears every other client cache before applying the new session', () => {
      const clearSpy = vi.spyOn(queryClient, 'clear');
      const clearStorageSpy = vi.spyOn(useAuthStore.persist, 'clearStorage');

      useAuthStore.getState().login({ token: 'abc123' } as never);

      expect(clearStorageSpy).toHaveBeenCalled();
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('resets the session to its logged-out defaults', () => {
      useAuthStore.getState().login({ token: 'abc123', permissoes: ['CLIENTE_READ'] } as never);

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
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
