import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { usuariosApi } from '@/api/endpoints/usuarios';
import { useAuthStore } from '@/store/authStore';
import { usuariosKeys, useUsuarios, useUsuario, useCreateUsuario, useUpdateUsuario, useDeleteUsuario } from './useUsuarios';

vi.mock('@/api/endpoints/usuarios', () => ({
  usuariosApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

describe('useUsuarios', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: [] });
  });

  it('stays disabled for a profile without USUARIO_READ', () => {
    const { result } = renderHook(() => useUsuarios(), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(usuariosApi.list).not.toHaveBeenCalled();
  });

  it('lists usuários for a profile with USUARIO_READ', async () => {
    useAuthStore.setState({ permissoes: ['USUARIO_READ'] });
    vi.mocked(usuariosApi.list).mockResolvedValueOnce([{ id: 1, nome: 'Diego' }] as never);
    const { result } = renderHook(() => useUsuarios(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 1, nome: 'Diego' }]);
  });
});

describe('useUsuario', () => {
  it('stays disabled without an id', () => {
    const { result } = renderHook(() => useUsuario(undefined), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches a single usuário by id', async () => {
    vi.mocked(usuariosApi.get).mockResolvedValueOnce({ id: 1, nome: 'Diego' } as never);
    const { result } = renderHook(() => useUsuario(1), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(usuariosApi.get).toHaveBeenCalledWith(1);
  });
});

describe('usuário mutations', () => {
  it('useCreateUsuario() invalidates the usuários list on success', async () => {
    vi.mocked(usuariosApi.create).mockResolvedValueOnce({ id: 2 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateUsuario(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ nome: 'Fernanda' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: usuariosKeys.all });
  });

  it('useUpdateUsuario() invalidates the usuários list on success', async () => {
    vi.mocked(usuariosApi.update).mockResolvedValueOnce({ id: 2 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateUsuario(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ id: 2, payload: { nome: 'Fernanda Souza' } as never });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(usuariosApi.update).toHaveBeenCalledWith(2, { nome: 'Fernanda Souza' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: usuariosKeys.all });
  });

  it('useDeleteUsuario() invalidates the usuários list on success', async () => {
    vi.mocked(usuariosApi.remove).mockResolvedValueOnce(undefined);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteUsuario(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(2);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: usuariosKeys.all });
  });
});
