import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { horaTecnicaApi } from '@/api/endpoints/horaTecnica';
import { useAuthStore } from '@/store/authStore';
import { horaTecnicaKeys, useAtualizarHoraTecnica, useCategoriasHoraTecnica } from './useHoraTecnica';

vi.mock('@/api/endpoints/horaTecnica', () => ({
  horaTecnicaApi: {
    consultar: vi.fn(),
    atualizar: vi.fn(),
    auditoria: vi.fn(),
  },
}));

describe('useCategoriasHoraTecnica', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the categories for a profile that builds orçamentos (Consultor)', async () => {
    useAuthStore.setState({ permissoes: ['ORCAMENTO_READ'] });
    const categorias = [{ categoria: 'A' as const, valorHora: 120, arredondamentoComercial: 5 }];
    vi.mocked(horaTecnicaApi.consultar).mockResolvedValueOnce(categorias);
    const { result } = renderHook(() => useCategoriasHoraTecnica(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(categorias);
  });

  it('does not fire for a profile outside the endpoint allow-list (avoids a 403 toast)', () => {
    useAuthStore.setState({ permissoes: ['CLIENTE_READ'] });
    const { result } = renderHook(() => useCategoriasHoraTecnica(), { wrapper: wrapWithQueryClient() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(horaTecnicaApi.consultar).not.toHaveBeenCalled();
  });
});

describe('hora técnica mutations', () => {
  it('invalidates every hora-técnica query (categorias, auditoria) on success', async () => {
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(horaTecnicaApi.atualizar).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useAtualizarHoraTecnica(), { wrapper: wrapWithQueryClient(client) });

    await result.current.mutateAsync({
      categorias: [
        { categoria: 'A', valorHora: 80 },
        { categoria: 'B', valorHora: 100 },
        { categoria: 'C', valorHora: 130 },
      ],
      arredondamentoComercial: 5,
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: horaTecnicaKeys.all });
  });
});
