import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { pagamentosApi } from '@/api/endpoints/pagamentos';
import { useAuthStore } from '@/store/authStore';
import { useChavePublicaPagBank, useIniciarAssinatura, useIniciarPedido } from './usePagamentos';

vi.mock('@/api/endpoints/pagamentos', () => ({
  pagamentosApi: { iniciarPedido: vi.fn(), iniciarAssinatura: vi.fn(), iniciarPix: vi.fn(), chavePublica: vi.fn() },
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

  describe('useChavePublicaPagBank', () => {
    beforeEach(() => {
      useAuthStore.setState({ permissoes: ['OFICINA_WRITE'] });
    });

    it('fetches the chave pública for a profile with OFICINA_WRITE', async () => {
      vi.mocked(pagamentosApi.chavePublica).mockResolvedValueOnce({ chavePublica: 'chave-fake' } as never);
      const { result } = renderHook(() => useChavePublicaPagBank(), { wrapper: wrapWithQueryClient() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ chavePublica: 'chave-fake' });
    });

    it('stays disabled for a profile without OFICINA_WRITE, instead of 403ing on page load', () => {
      useAuthStore.setState({ permissoes: [] });
      const { result } = renderHook(() => useChavePublicaPagBank(), { wrapper: wrapWithQueryClient() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(pagamentosApi.chavePublica).not.toHaveBeenCalled();
    });

    // Regressão: quando o backend falha ao obter a chave do PagBank (ex.:
    // 422 "Nao foi possivel obter a chave publica do PagBank no momento"),
    // PagamentoCartaoModal precisa de isError para mostrar um aviso próprio
    // em vez de deixar o botão "Pagar" habilitado rumo a uma falha silenciosa
    // na hora de criptografar o cartão.
    it('surfaces isError when the backend fails to obtain the chave pública, without a global toast', async () => {
      vi.mocked(pagamentosApi.chavePublica).mockRejectedValueOnce(new Error('Nao foi possivel obter a chave publica'));
      const { result } = renderHook(() => useChavePublicaPagBank(), { wrapper: wrapWithQueryClient() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
