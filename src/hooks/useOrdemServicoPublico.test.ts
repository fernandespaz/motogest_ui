import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { ordemServicoPublicoApi } from '@/api/endpoints/ordemServicoPublico';
import {
  ordemServicoPublicoKeys,
  useOrdemServicoPublico,
  useAprovarOrdemServicoPublico,
  useRejeitarOrdemServicoPublico,
} from './useOrdemServicoPublico';

vi.mock('@/api/endpoints/ordemServicoPublico', () => ({
  ordemServicoPublicoApi: { buscar: vi.fn(), aprovar: vi.fn(), rejeitar: vi.fn() },
}));

describe('useOrdemServicoPublico', () => {
  it('stays disabled without a token', () => {
    const { result } = renderHook(() => useOrdemServicoPublico(undefined), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(ordemServicoPublicoApi.buscar).not.toHaveBeenCalled();
  });

  it('fetches the OS for a given token', async () => {
    vi.mocked(ordemServicoPublicoApi.buscar).mockResolvedValueOnce({ id: 1, status: 'AGUARDANDO_APROVACAO' } as never);
    const { result } = renderHook(() => useOrdemServicoPublico('tok123'), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ordemServicoPublicoApi.buscar).toHaveBeenCalledWith('tok123');
  });
});

describe('useAprovarOrdemServicoPublico', () => {
  it('writes the approved OS straight into the detail cache', async () => {
    vi.mocked(ordemServicoPublicoApi.aprovar).mockResolvedValueOnce({ id: 1, status: 'APROVADA' } as never);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useAprovarOrdemServicoPublico('tok123'), {
      wrapper: wrapWithQueryClient(client),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(ordemServicoPublicoKeys.detail('tok123'))).toEqual({ id: 1, status: 'APROVADA' });
  });
});

describe('useRejeitarOrdemServicoPublico', () => {
  it('writes the rejected OS straight into the detail cache', async () => {
    vi.mocked(ordemServicoPublicoApi.rejeitar).mockResolvedValueOnce({ id: 1, status: 'REJEITADA' } as never);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useRejeitarOrdemServicoPublico('tok123'), {
      wrapper: wrapWithQueryClient(client),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(ordemServicoPublicoKeys.detail('tok123'))).toEqual({ id: 1, status: 'REJEITADA' });
  });
});
