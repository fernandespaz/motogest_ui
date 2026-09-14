import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { perfisApi } from '@/api/endpoints/perfis';
import {
  perfisKeys,
  usePerfis,
  usePerfil,
  usePermissoesDisponiveis,
  useCreatePerfil,
  useUpdatePerfil,
  useDeletePerfil,
} from './usePerfis';

vi.mock('@/api/endpoints/perfis', () => ({
  perfisApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    permissoesDisponiveis: vi.fn(),
  },
}));

describe('usePerfis', () => {
  it('lists every perfil', async () => {
    vi.mocked(perfisApi.list).mockResolvedValueOnce([{ id: 1, nome: 'Administrador' }] as never);
    const { result } = renderHook(() => usePerfis(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 1, nome: 'Administrador' }]);
  });
});

describe('usePerfil', () => {
  it('stays disabled without an id', () => {
    const { result } = renderHook(() => usePerfil(undefined), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches a single perfil by id', async () => {
    vi.mocked(perfisApi.get).mockResolvedValueOnce({ id: 1, nome: 'Administrador' } as never);
    const { result } = renderHook(() => usePerfil(1), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(perfisApi.get).toHaveBeenCalledWith(1);
  });
});

describe('usePermissoesDisponiveis', () => {
  it('lists the full permission catalog', async () => {
    vi.mocked(perfisApi.permissoesDisponiveis).mockResolvedValueOnce([{ codigo: 'CLIENTE_READ' }] as never);
    const { result } = renderHook(() => usePermissoesDisponiveis(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ codigo: 'CLIENTE_READ' }]);
  });
});

describe('perfil mutations', () => {
  it('useCreatePerfil() invalidates the perfis list on success', async () => {
    vi.mocked(perfisApi.create).mockResolvedValueOnce({ id: 2 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreatePerfil(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ nome: 'Mecânico' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: perfisKeys.all });
  });

  it('useUpdatePerfil() invalidates the perfis list on success', async () => {
    vi.mocked(perfisApi.update).mockResolvedValueOnce({ id: 2 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdatePerfil(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ id: 2, payload: { nome: 'Mecânico Sênior' } as never });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(perfisApi.update).toHaveBeenCalledWith(2, { nome: 'Mecânico Sênior' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: perfisKeys.all });
  });

  it('useDeletePerfil() invalidates the perfis list on success', async () => {
    vi.mocked(perfisApi.remove).mockResolvedValueOnce(undefined);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDeletePerfil(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(2);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: perfisKeys.all });
  });
});
