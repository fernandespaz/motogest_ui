import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { servicosApi } from '@/api/endpoints/servicos';
import {
  servicosKeys,
  useServicos,
  useServico,
  useCreateServico,
  useUpdateServico,
  useDeleteServico,
} from './useServicos';

vi.mock('@/api/endpoints/servicos', () => ({
  servicosApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('useServicos hooks', () => {
  it('useServicos() lists servicos through the factory', async () => {
    vi.mocked(servicosApi.list).mockResolvedValueOnce({ content: [{ id: 1, nome: 'Troca de Óleo' }] } as never);
    const { result } = renderHook(() => useServicos(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ content: [{ id: 1, nome: 'Troca de Óleo' }] });
  });

  it('useServico() fetches a single serviço by id', async () => {
    vi.mocked(servicosApi.get).mockResolvedValueOnce({ id: 1, nome: 'Troca de Óleo' } as never);
    const { result } = renderHook(() => useServico(1), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 1, nome: 'Troca de Óleo' });
  });

  it('useCreateServico() invalidates the servicos list on success', async () => {
    vi.mocked(servicosApi.create).mockResolvedValueOnce({ id: 2 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateServico(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ nome: 'Alinhamento' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: servicosKeys.all });
  });

  it('useUpdateServico() invalidates the servicos list and detail on success', async () => {
    vi.mocked(servicosApi.update).mockResolvedValueOnce({ id: 2 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateServico(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ id: 2, payload: { nome: 'Alinhamento 3D' } as never });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: servicosKeys.detail(2) });
  });

  it('useDeleteServico() invalidates the servicos list on success', async () => {
    vi.mocked(servicosApi.remove).mockResolvedValueOnce(undefined);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteServico(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(2);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: servicosKeys.all });
  });
});
