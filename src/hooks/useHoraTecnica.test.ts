import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { horaTecnicaApi } from '@/api/endpoints/horaTecnica';
import { useAuthStore } from '@/store/authStore';
import { horaTecnicaKeys, useCriarCustoFixo, useHoraTecnica } from './useHoraTecnica';

vi.mock('@/api/endpoints/horaTecnica', () => ({
  horaTecnicaApi: {
    consultar: vi.fn(),
    atualizarParametros: vi.fn(),
    listarCustosFixos: vi.fn(),
    criarCustoFixo: vi.fn(),
    atualizarCustoFixo: vi.fn(),
    excluirCustoFixo: vi.fn(),
    auditoria: vi.fn(),
  },
}));

describe('useHoraTecnica', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the PHT for a profile that builds orçamentos (Consultor)', async () => {
    useAuthStore.setState({ permissoes: ['ORCAMENTO_READ'] });
    vi.mocked(horaTecnicaApi.consultar).mockResolvedValueOnce({ configurado: true, precoHoraTecnica: 120 });
    const { result } = renderHook(() => useHoraTecnica(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.precoHoraTecnica).toBe(120);
  });

  it('does not fire for a profile outside the endpoint allow-list (avoids a 403 toast)', () => {
    useAuthStore.setState({ permissoes: ['CLIENTE_READ'] });
    const { result } = renderHook(() => useHoraTecnica(), { wrapper: wrapWithQueryClient() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(horaTecnicaApi.consultar).not.toHaveBeenCalled();
  });
});

describe('hora técnica mutations', () => {
  it('invalidate every hora-técnica query (PHT, custos, auditoria) on success', async () => {
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(horaTecnicaApi.criarCustoFixo).mockResolvedValueOnce({ id: 1 });
    const { result } = renderHook(() => useCriarCustoFixo(), { wrapper: wrapWithQueryClient(client) });

    await result.current.mutateAsync({ categoria: 'ALUGUEL', descricao: 'Galpão', valorMensal: 3000 });

    expect(spy).toHaveBeenCalledWith({ queryKey: horaTecnicaKeys.all });
  });
});
