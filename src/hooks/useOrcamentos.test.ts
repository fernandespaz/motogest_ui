import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { orcamentosApi } from '@/api/endpoints/orcamentos';
import {
  orcamentosKeys,
  useOrcamentos,
  useTodosOrcamentos,
  useEnviarOrcamento,
  useAprovarOrcamento,
  useRejeitarOrcamento,
} from './useOrcamentos';

vi.mock('@/api/endpoints/orcamentos', () => ({
  orcamentosApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    enviar: vi.fn(),
    aprovar: vi.fn(),
    rejeitar: vi.fn(),
  },
}));

describe('useOrcamentos hooks', () => {
  it('useOrcamentos() lists orçamentos through the factory', async () => {
    vi.mocked(orcamentosApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useOrcamentos(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(orcamentosApi.list).toHaveBeenCalled();
  });

  // Bug real reportado por um usuário: OrcamentosPage filtrava uma página já
  // paginada pelo backend (convertido, carteira do consultor), quebrando a
  // contagem por página — uma sobrava com 2 itens, a seguinte com 5.
  // useTodosOrcamentos busca todas as páginas do backend uma vez, pra a
  // paginação da tela virar inteiramente local sobre o conjunto completo.
  describe('useTodosOrcamentos()', () => {
    it('fetches a single page and stops when totalPages is 1', async () => {
      vi.mocked(orcamentosApi.list).mockResolvedValueOnce({ content: [{ id: 1 }, { id: 2 }], totalPages: 1 } as never);
      const { result } = renderHook(() => useTodosOrcamentos('id,desc'), { wrapper: wrapWithQueryClient() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(orcamentosApi.list).toHaveBeenCalledTimes(1);
      expect(orcamentosApi.list).toHaveBeenCalledWith({ page: 0, size: 200, sort: 'id,desc' });
      expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('walks every page and concatenates them into one flat list', async () => {
      vi.mocked(orcamentosApi.list)
        .mockResolvedValueOnce({ content: [{ id: 1 }, { id: 2 }], totalPages: 3 } as never)
        .mockResolvedValueOnce({ content: [{ id: 3 }, { id: 4 }], totalPages: 3 } as never)
        .mockResolvedValueOnce({ content: [{ id: 5 }], totalPages: 3 } as never);
      const { result } = renderHook(() => useTodosOrcamentos(), { wrapper: wrapWithQueryClient() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(orcamentosApi.list).toHaveBeenCalledTimes(3);
      expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
    });
  });

  it.each([
    ['useEnviarOrcamento', useEnviarOrcamento, 'enviar'],
    ['useAprovarOrcamento', useAprovarOrcamento, 'aprovar'],
    ['useRejeitarOrcamento', useRejeitarOrcamento, 'rejeitar'],
  ] as const)('%s() calls the matching transition and invalidates the list', async (_label, useHook, method) => {
    vi.mocked(orcamentosApi[method]).mockResolvedValueOnce({ id: 1, status: 'X' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useHook(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(orcamentosApi[method]).mock.calls[0][0]).toBe(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orcamentosKeys.all });
  });
});
