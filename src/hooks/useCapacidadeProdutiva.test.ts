import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { capacidadeProdutivaApi } from '@/api/endpoints/capacidadeProdutiva';
import { capacidadeProdutivaKeys, useAtualizarCapacidadeProdutiva, useCapacidadeProdutiva } from './useCapacidadeProdutiva';

vi.mock('@/api/endpoints/capacidadeProdutiva', () => ({
  capacidadeProdutivaApi: {
    consultar: vi.fn(),
    atualizar: vi.fn(),
    auditoria: vi.fn(),
  },
}));

describe('useCapacidadeProdutiva', () => {
  it('fetches the current capacidade produtiva', async () => {
    const capacidade = {
      configurado: true,
      numeroMecanicos: 2,
      horasPorDia: 8,
      diasUteisMes: 22,
      eficienciaPercentual: 80,
      horasProdutivas: 281.6,
    };
    vi.mocked(capacidadeProdutivaApi.consultar).mockResolvedValueOnce(capacidade);
    const { result } = renderHook(() => useCapacidadeProdutiva(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(capacidade);
  });
});

describe('useAtualizarCapacidadeProdutiva', () => {
  it('invalidates the capacidade-produtiva queries on success', async () => {
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(capacidadeProdutivaApi.atualizar).mockResolvedValueOnce({ configurado: true });
    const { result } = renderHook(() => useAtualizarCapacidadeProdutiva(), { wrapper: wrapWithQueryClient(client) });

    await result.current.mutateAsync({ numeroMecanicos: 3, horasPorDia: 8, diasUteisMes: 22, eficienciaPercentual: 85 });

    expect(spy).toHaveBeenCalledWith({ queryKey: capacidadeProdutivaKeys.all });
  });
});
