import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wrapWithQueryClient } from '@/test/queryClientWrapper';
import { produtividadeApi } from '@/api/endpoints/produtividade';
import { useProdutividadeConsultor, useProdutividadeConsultores } from './useProdutividade';

vi.mock('@/api/endpoints/produtividade', () => ({
  produtividadeApi: { consultores: vi.fn(), consultor: vi.fn() },
}));

describe('useProdutividadeConsultores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the report for the requested month', async () => {
    vi.mocked(produtividadeApi.consultores).mockResolvedValueOnce({ mes: '2026-09', consultores: [] });
    const { result } = renderHook(() => useProdutividadeConsultores('2026-09'), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(produtividadeApi.consultores).toHaveBeenCalledWith('2026-09');
  });

  it('keeps the previous month on screen while the next one loads', async () => {
    vi.mocked(produtividadeApi.consultores)
      .mockResolvedValueOnce({ mes: '2026-09' })
      .mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(({ mes }) => useProdutividadeConsultores(mes), {
      wrapper: wrapWithQueryClient(),
      initialProps: { mes: '2026-09' },
    });
    await waitFor(() => expect(result.current.data?.mes).toBe('2026-09'));

    rerender({ mes: '2026-08' });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.mes).toBe('2026-09');
  });
});

describe('useProdutividadeConsultor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stays idle without a usuarioId', () => {
    const { result } = renderHook(() => useProdutividadeConsultor(undefined, '2026-09'), {
      wrapper: wrapWithQueryClient(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('never shows another consultor’s numbers while a different one loads', async () => {
    vi.mocked(produtividadeApi.consultor)
      .mockResolvedValueOnce({ usuarioId: 1, usuarioNome: 'Ana' })
      .mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(({ id }) => useProdutividadeConsultor(id, '2026-09'), {
      wrapper: wrapWithQueryClient(),
      initialProps: { id: 1 },
    });
    await waitFor(() => expect(result.current.data?.usuarioNome).toBe('Ana'));

    rerender({ id: 2 });

    expect(result.current.data).toBeUndefined();
  });

  it('keeps the same consultor on screen while switching months', async () => {
    vi.mocked(produtividadeApi.consultor)
      .mockResolvedValueOnce({ usuarioId: 1, mes: '2026-09' })
      .mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(({ mes }) => useProdutividadeConsultor(1, mes), {
      wrapper: wrapWithQueryClient(),
      initialProps: { mes: '2026-09' },
    });
    await waitFor(() => expect(result.current.data?.mes).toBe('2026-09'));

    rerender({ mes: '2026-08' });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.mes).toBe('2026-09');
  });
});
