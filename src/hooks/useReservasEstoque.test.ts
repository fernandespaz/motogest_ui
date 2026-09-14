import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { reservasEstoqueApi } from '@/api/endpoints/reservasEstoque';
import { produtosKeys } from './useProdutos';
import { useAuthStore } from '@/store/authStore';
import { reservasEstoqueKeys, useReservasEstoque, useReservarEstoque, useLiberarReservaEstoque } from './useReservasEstoque';

vi.mock('@/api/endpoints/reservasEstoque', () => ({
  reservasEstoqueApi: { list: vi.fn(), reservar: vi.fn(), liberar: vi.fn() },
}));

describe('useReservasEstoque', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: [] });
  });

  it('stays disabled for a profile without ESTOQUE_RESERVAR', () => {
    const { result } = renderHook(() => useReservasEstoque(), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(reservasEstoqueApi.list).not.toHaveBeenCalled();
  });

  it('lists reservas for a profile with ESTOQUE_RESERVAR', async () => {
    useAuthStore.setState({ permissoes: ['ESTOQUE_RESERVAR'] });
    vi.mocked(reservasEstoqueApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useReservasEstoque(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(reservasEstoqueApi.list).toHaveBeenCalled();
  });
});

describe('useReservarEstoque', () => {
  it('invalidates reservas and the affected produto on success', async () => {
    vi.mocked(reservasEstoqueApi.reservar).mockResolvedValueOnce({ id: 1 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useReservarEstoque(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ produtoId: 5, payload: { quantidade: 2 } as never });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: reservasEstoqueKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: produtosKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: produtosKeys.detail(5) });
  });
});

describe('useLiberarReservaEstoque', () => {
  it('invalidates reservas and produtos on success', async () => {
    vi.mocked(reservasEstoqueApi.liberar).mockResolvedValueOnce({ id: 1, status: 'LIBERADA' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useLiberarReservaEstoque(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: reservasEstoqueKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: produtosKeys.all });
  });
});
