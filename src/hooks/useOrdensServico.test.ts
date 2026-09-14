import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { ordensServicoApi } from '@/api/endpoints/ordensServico';
import { orcamentosKeys } from './useOrcamentos';
import {
  ordensServicoKeys,
  useOrdensServico,
  useCriarOSAPartirDeOrcamento,
  useAtualizarStatusOS,
  useEnviarOS,
  useTimerStartOS,
  useTimerPauseOS,
  useTimerResumeOS,
} from './useOrdensServico';

vi.mock('@/api/endpoints/ordensServico', () => ({
  ordensServicoApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    criarAPartirDeOrcamento: vi.fn(),
    atualizarStatus: vi.fn(),
    enviar: vi.fn(),
    timerStart: vi.fn(),
    timerPause: vi.fn(),
    timerResume: vi.fn(),
  },
}));

describe('useOrdensServico', () => {
  it('lists OS through the factory', async () => {
    vi.mocked(ordensServicoApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useOrdensServico(), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ordensServicoApi.list).toHaveBeenCalled();
  });
});

describe('useCriarOSAPartirDeOrcamento', () => {
  it('invalidates both ordens-servico and orcamentos on success', async () => {
    vi.mocked(ordensServicoApi.criarAPartirDeOrcamento).mockResolvedValueOnce({ id: 1 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCriarOSAPartirDeOrcamento(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ orcamentoId: 5, usuarioResponsavelId: 9 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ordensServicoApi.criarAPartirDeOrcamento).toHaveBeenCalledWith(5, 9);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ordensServicoKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orcamentosKeys.all });
  });
});

describe('useAtualizarStatusOS', () => {
  it('invalidates the OS list on success', async () => {
    vi.mocked(ordensServicoApi.atualizarStatus).mockResolvedValueOnce({ id: 1, status: 'CONCLUIDA' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAtualizarStatusOS(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ id: 1, status: 'CONCLUIDA' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ordensServicoApi.atualizarStatus).toHaveBeenCalledWith(1, 'CONCLUIDA');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ordensServicoKeys.all });
  });
});

describe.each([
  ['useEnviarOS', useEnviarOS, 'enviar'],
  ['useTimerStartOS', useTimerStartOS, 'timerStart'],
  ['useTimerResumeOS', useTimerResumeOS, 'timerResume'],
] as const)('%s', (_label, useHook, method) => {
  it('calls the matching endpoint and invalidates the OS list', async () => {
    vi.mocked(ordensServicoApi[method]).mockResolvedValueOnce({ id: 1 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useHook(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ordensServicoKeys.all });
  });
});

describe('useTimerPauseOS', () => {
  it('sends the pause reason and invalidates the OS list', async () => {
    vi.mocked(ordensServicoApi.timerPause).mockResolvedValueOnce({ id: 1, status: 'PAUSADA' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useTimerPauseOS(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ id: 1, motivo: 'Aguardando peça' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ordensServicoApi.timerPause).toHaveBeenCalledWith(1, 'Aguardando peça');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ordensServicoKeys.all });
  });
});
