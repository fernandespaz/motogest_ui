import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { descontosApi } from '@/api/endpoints/descontos';
import { orcamentosKeys } from './useOrcamentos';
import { ordensServicoKeys } from './useOrdensServico';
import { useAuthStore } from '@/store/authStore';
import {
  useDescontosPorOrigem,
  useSolicitacoesDescontoPendentes,
  useSolicitarDesconto,
  useAprovarDesconto,
  useRejeitarDesconto,
} from './useDescontos';

vi.mock('@/api/endpoints/descontos', () => ({
  descontosApi: { list: vi.fn(), get: vi.fn(), solicitar: vi.fn(), aprovar: vi.fn(), rejeitar: vi.fn() },
}));

describe('useDescontosPorOrigem', () => {
  it('stays disabled without both origemTipo and origemId', () => {
    const { result } = renderHook(() => useDescontosPorOrigem(undefined, undefined), {
      wrapper: wrapWithQueryClient(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('lists solicitações for a given origem', async () => {
    vi.mocked(descontosApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useDescontosPorOrigem('ORCAMENTO', 5), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(descontosApi.list).toHaveBeenCalledWith({ origemTipo: 'ORCAMENTO', origemId: 5, size: 100 });
  });
});

describe('useSolicitacoesDescontoPendentes', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: [] });
  });

  it('stays disabled for a profile without DESCONTO_APROVAR', () => {
    const { result } = renderHook(() => useSolicitacoesDescontoPendentes(), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(descontosApi.list).not.toHaveBeenCalled();
  });

  it('lists pending solicitações for a profile with DESCONTO_APROVAR', async () => {
    useAuthStore.setState({ permissoes: ['DESCONTO_APROVAR'] });
    vi.mocked(descontosApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useSolicitacoesDescontoPendentes(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(descontosApi.list).toHaveBeenCalledWith({ status: 'PENDENTE', size: 100 });
  });
});

describe.each([
  ['useSolicitarDesconto', useSolicitarDesconto, 'solicitar', { itemId: 1, valorSolicitado: 10 }],
  ['useAprovarDesconto', useAprovarDesconto, 'aprovar', 1],
  ['useRejeitarDesconto', useRejeitarDesconto, 'rejeitar', { id: 1, payload: { motivo: 'Fora da política' } }],
] as const)('%s', (_label, useHook, method, variables) => {
  it('invalidates descontos and the ORCAMENTO origem on success', async () => {
    vi.mocked(descontosApi[method]).mockResolvedValueOnce({
      id: 1,
      origemTipo: 'ORCAMENTO',
      origemId: 7,
    } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useHook(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(variables as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orcamentosKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orcamentosKeys.detail(7) });
  });

  it('invalidates descontos and the OS origem on success', async () => {
    vi.mocked(descontosApi[method]).mockResolvedValueOnce({
      id: 1,
      origemTipo: 'ORDEM_SERVICO',
      origemId: 9,
    } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useHook(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(variables as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ordensServicoKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ordensServicoKeys.detail(9) });
  });
});
