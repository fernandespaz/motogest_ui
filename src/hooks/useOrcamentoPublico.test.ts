import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { orcamentoPublicoApi } from '@/api/endpoints/orcamentoPublico';
import {
  orcamentoPublicoKeys,
  useOrcamentoPublico,
  useAprovarOrcamentoPublico,
  useRejeitarOrcamentoPublico,
} from './useOrcamentoPublico';

vi.mock('@/api/endpoints/orcamentoPublico', () => ({
  orcamentoPublicoApi: { buscar: vi.fn(), aprovar: vi.fn(), rejeitar: vi.fn() },
}));

describe('useOrcamentoPublico', () => {
  it('stays disabled without a token', () => {
    const { result } = renderHook(() => useOrcamentoPublico(undefined), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(orcamentoPublicoApi.buscar).not.toHaveBeenCalled();
  });

  it('fetches the orçamento for a given token', async () => {
    vi.mocked(orcamentoPublicoApi.buscar).mockResolvedValueOnce({ id: 1, status: 'ENVIADO' } as never);
    const { result } = renderHook(() => useOrcamentoPublico('tok123'), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(orcamentoPublicoApi.buscar).toHaveBeenCalledWith('tok123');
  });
});

describe('useAprovarOrcamentoPublico', () => {
  it('writes the approved orçamento straight into the detail cache', async () => {
    vi.mocked(orcamentoPublicoApi.aprovar).mockResolvedValueOnce({ id: 1, status: 'APROVADO' } as never);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useAprovarOrcamentoPublico('tok123'), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(orcamentoPublicoKeys.detail('tok123'))).toEqual({ id: 1, status: 'APROVADO' });
  });
});

describe('useRejeitarOrcamentoPublico', () => {
  it('writes the rejected orçamento straight into the detail cache', async () => {
    vi.mocked(orcamentoPublicoApi.rejeitar).mockResolvedValueOnce({ id: 1, status: 'REJEITADO' } as never);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useRejeitarOrcamentoPublico('tok123'), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(orcamentoPublicoKeys.detail('tok123'))).toEqual({ id: 1, status: 'REJEITADO' });
  });
});
