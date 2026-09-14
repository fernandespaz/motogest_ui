import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { checklistsApi } from '@/api/endpoints/checklists';
import { fotosApi } from '@/api/endpoints/fotos';
import { useChecklists, useCriarChecklist, useFotos, useAdicionarFoto, useRemoverFoto } from './useChecklistsFotos';

vi.mock('@/api/endpoints/checklists', () => ({
  checklistsApi: { list: vi.fn(), criar: vi.fn() },
}));
vi.mock('@/api/endpoints/fotos', () => ({
  fotosApi: { list: vi.fn(), adicionar: vi.fn(), remover: vi.fn() },
}));

describe('useChecklists', () => {
  it('stays disabled without an ordemServicoId', () => {
    const { result } = renderHook(() => useChecklists(undefined), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('lists checklists for the given OS', async () => {
    vi.mocked(checklistsApi.list).mockResolvedValueOnce([{ id: 1 }] as never);
    const { result } = renderHook(() => useChecklists(10), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(checklistsApi.list).toHaveBeenCalledWith(10);
  });
});

describe('useCriarChecklist', () => {
  it('invalidates that OS’s checklists on success', async () => {
    vi.mocked(checklistsApi.criar).mockResolvedValueOnce({ id: 1 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCriarChecklist(10), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ descricao: 'Verificar freios' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(checklistsApi.criar).toHaveBeenCalledWith(10, { descricao: 'Verificar freios' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['checklists', 10] });
  });
});

describe('useFotos', () => {
  it('stays disabled without an ordemServicoId', () => {
    const { result } = renderHook(() => useFotos(undefined), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('lists fotos for the given OS', async () => {
    vi.mocked(fotosApi.list).mockResolvedValueOnce([{ id: 1 }] as never);
    const { result } = renderHook(() => useFotos(10), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fotosApi.list).toHaveBeenCalledWith(10);
  });
});

describe('useAdicionarFoto', () => {
  it('invalidates that OS’s fotos on success', async () => {
    vi.mocked(fotosApi.adicionar).mockResolvedValueOnce({ id: 1 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAdicionarFoto(10), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ url: 'data:...' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fotos', 10] });
  });
});

describe('useRemoverFoto', () => {
  it('invalidates that OS’s fotos on success', async () => {
    vi.mocked(fotosApi.remover).mockResolvedValueOnce(undefined);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRemoverFoto(10), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(5);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fotosApi.remover).toHaveBeenCalledWith(5);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fotos', 10] });
  });
});
