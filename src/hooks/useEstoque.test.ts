import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { estoqueApi } from '@/api/endpoints/estoque';
import { produtosKeys } from './useProdutos';
import { estoqueKeys, useMovimentacoesEstoque, useMovimentacoesPorProduto, useRegistrarMovimentacao } from './useEstoque';

vi.mock('@/api/endpoints/estoque', () => ({
  estoqueApi: { list: vi.fn(), listPorProduto: vi.fn(), registrar: vi.fn() },
}));

describe('useMovimentacoesEstoque', () => {
  it('lists movimentações', async () => {
    vi.mocked(estoqueApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useMovimentacoesEstoque({ page: 0, size: 20 }), {
      wrapper: wrapWithQueryClient(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(estoqueApi.list).toHaveBeenCalledWith({ page: 0, size: 20 });
  });
});

describe('useMovimentacoesPorProduto', () => {
  it('stays disabled without a produtoId', () => {
    const { result } = renderHook(() => useMovimentacoesPorProduto(undefined), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('lists movimentações scoped to one produto', async () => {
    vi.mocked(estoqueApi.listPorProduto).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useMovimentacoesPorProduto(5), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(estoqueApi.listPorProduto).toHaveBeenCalledWith(5, undefined);
  });
});

describe('useRegistrarMovimentacao', () => {
  it('invalidates estoque and the affected produto on success', async () => {
    vi.mocked(estoqueApi.registrar).mockResolvedValueOnce({ id: 1 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRegistrarMovimentacao(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ produtoId: 5, payload: { quantidade: 10, tipo: 'ENTRADA' } as never });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: estoqueKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: produtosKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: produtosKeys.detail(5) });
  });
});
