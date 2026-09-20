import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { pagamentosApi } from '@/api/endpoints/pagamentos';
import { useIniciarAssinatura, useIniciarPedido } from './usePagamentos';

vi.mock('@/api/endpoints/pagamentos', () => ({
  pagamentosApi: { iniciarPedido: vi.fn(), iniciarAssinatura: vi.fn() },
}));

describe('usePagamentos hooks', () => {
  it('useIniciarPedido() invalidates the licença query on success', async () => {
    vi.mocked(pagamentosApi.iniciarPedido).mockResolvedValueOnce({ status: 'PENDENTE' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useIniciarPedido(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ plano: 'PRO', valor: 99.9 } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['licenca', 'atual'] });
  });

  it('useIniciarAssinatura() invalidates the licença query on success', async () => {
    vi.mocked(pagamentosApi.iniciarAssinatura).mockResolvedValueOnce({ status: 'PENDENTE' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useIniciarAssinatura(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ plano: 'PRO', valorMensal: 99.9 } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['licenca', 'atual'] });
  });
});
