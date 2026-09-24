import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wrapWithQueryClient } from '@/test/queryClientWrapper';
import { produtividadeApi } from '@/api/endpoints/produtividade';
import {
  INTERVALO_TEMPO_REAL_MS,
  useProdutividadeConsultor,
  useProdutividadeConsultores,
  useProdutividadeMecanico,
  useProdutividadeMecanicoMe,
  useProdutividadeMecanicos,
} from './useProdutividade';
import { mesReferenciaAtual } from '@/lib/formatters';

vi.mock('@/api/endpoints/produtividade', () => ({
  produtividadeApi: { consultores: vi.fn(), consultor: vi.fn(), mecanicos: vi.fn(), mecanico: vi.fn(), mecanicoMe: vi.fn() },
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

describe('useProdutividadeMecanicos / useProdutividadeMecanico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => vi.useRealTimers());

  it('polls the current month so the admin sees it live', async () => {
    vi.mocked(produtividadeApi.mecanicos).mockResolvedValue({ mes: mesReferenciaAtual() });
    renderHook(() => useProdutividadeMecanicos(mesReferenciaAtual()), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(produtividadeApi.mecanicos).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(INTERVALO_TEMPO_REAL_MS + 10);

    await waitFor(() => expect(produtividadeApi.mecanicos).toHaveBeenCalledTimes(2));
  });

  it('does not poll a closed month', async () => {
    vi.mocked(produtividadeApi.mecanicos).mockResolvedValue({ mes: '2020-01' });
    renderHook(() => useProdutividadeMecanicos('2020-01'), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(produtividadeApi.mecanicos).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(INTERVALO_TEMPO_REAL_MS * 2);

    expect(produtividadeApi.mecanicos).toHaveBeenCalledTimes(1);
  });

  it('mechanic detail stays idle when disabled (profile without PRODUTIVIDADE_READ)', () => {
    const { result } = renderHook(() => useProdutividadeMecanico(3, '2026-09', { enabled: false }), {
      wrapper: wrapWithQueryClient(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(produtividadeApi.mecanico).not.toHaveBeenCalled();
  });
});

describe('useProdutividadeMecanicoMe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => vi.useRealTimers());

  // Autoescopado pelo token — não recebe nem precisa de usuarioId, ao
  // contrário de useProdutividadeMecanico (que exige PRODUTIVIDADE_READ e
  // deixaria ver qualquer outro mecânico).
  it('fetches the current mechanic’s own report without a usuarioId', async () => {
    vi.mocked(produtividadeApi.mecanicoMe).mockResolvedValue({ usuarioId: 3, mes: '2020-01' });
    const { result } = renderHook(() => useProdutividadeMecanicoMe('2020-01'), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(produtividadeApi.mecanicoMe).toHaveBeenCalledWith('2020-01');
  });

  it('polls the current month so the mechanic sees it live', async () => {
    vi.mocked(produtividadeApi.mecanicoMe).mockResolvedValue({ mes: mesReferenciaAtual() });
    renderHook(() => useProdutividadeMecanicoMe(mesReferenciaAtual()), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(produtividadeApi.mecanicoMe).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(INTERVALO_TEMPO_REAL_MS + 10);

    await waitFor(() => expect(produtividadeApi.mecanicoMe).toHaveBeenCalledTimes(2));
  });
});
