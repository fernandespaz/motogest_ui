import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { orcamentosApi } from '@/api/endpoints/orcamentos';
import {
  orcamentosKeys,
  useOrcamentos,
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
