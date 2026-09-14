import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { ordensServicoApi } from '@/api/endpoints/ordensServico';
import { ordemServicoPublicoApi } from '@/api/endpoints/ordemServicoPublico';
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

vi.mock('@/api/endpoints/ordemServicoPublico', () => ({
  ordemServicoPublicoApi: {
    buscar: vi.fn(),
    aprovar: vi.fn(),
    rejeitar: vi.fn(),
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
    vi.mocked(ordensServicoApi.criarAPartirDeOrcamento).mockResolvedValueOnce({ id: 1, status: 'APROVADA' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCriarOSAPartirDeOrcamento(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ orcamentoId: 5, usuarioResponsavelId: 9 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ordensServicoApi.criarAPartirDeOrcamento).toHaveBeenCalledWith(5, 9);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ordensServicoKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orcamentosKeys.all });
  });

  it('promotes a freshly-created OS straight to Aprovada via enviar (for the token) then atualizarStatus, skipping a second client approval', async () => {
    vi.mocked(ordensServicoApi.criarAPartirDeOrcamento).mockResolvedValueOnce({ id: 1, status: 'ABERTA' } as never);
    vi.mocked(ordensServicoApi.enviar).mockResolvedValueOnce({
      id: 1,
      status: 'AGUARDANDO_APROVACAO',
      tokenAprovacao: 'tok-1',
    } as never);
    vi.mocked(ordensServicoApi.atualizarStatus).mockResolvedValueOnce({
      id: 1,
      status: 'APROVADA',
      tokenAprovacao: 'tok-1',
    } as never);
    const { result } = renderHook(() => useCriarOSAPartirDeOrcamento(), { wrapper: wrapWithQueryClient() });

    result.current.mutate({ orcamentoId: 5 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ordensServicoApi.enviar).toHaveBeenCalledWith(1);
    expect(ordensServicoApi.atualizarStatus).toHaveBeenCalledWith(1, 'APROVADA');
    // "enviar" tem que rodar antes do PATCH de status — é o único jeito de
    // gerar o tokenAprovacao usado depois pra reenviar a OS ao cliente.
    const ordemEnviar = vi.mocked(ordensServicoApi.enviar).mock.invocationCallOrder[0];
    const ordemStatus = vi.mocked(ordensServicoApi.atualizarStatus).mock.invocationCallOrder[0];
    expect(ordemEnviar).toBeLessThan(ordemStatus);
    expect(result.current.data).toEqual({ id: 1, status: 'APROVADA', tokenAprovacao: 'tok-1' });
  });

  it('does not touch the status when the backend already returns something other than Aberta', async () => {
    vi.mocked(ordensServicoApi.criarAPartirDeOrcamento).mockResolvedValueOnce({
      id: 1,
      status: 'AGUARDANDO_APROVACAO',
    } as never);
    const { result } = renderHook(() => useCriarOSAPartirDeOrcamento(), { wrapper: wrapWithQueryClient() });

    result.current.mutate({ orcamentoId: 5 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ordensServicoApi.enviar).not.toHaveBeenCalled();
    expect(ordensServicoApi.atualizarStatus).not.toHaveBeenCalled();
  });

  it('falls back to the public aprovar endpoint (with the token from enviar) when the generic PATCH /status rejects Aguardando Aprovação -> Aprovada', async () => {
    vi.mocked(ordensServicoApi.criarAPartirDeOrcamento).mockResolvedValueOnce({ id: 1, status: 'ABERTA' } as never);
    vi.mocked(ordensServicoApi.enviar).mockResolvedValueOnce({
      id: 1,
      status: 'AGUARDANDO_APROVACAO',
      tokenAprovacao: 'tok-1',
    } as never);
    vi.mocked(ordensServicoApi.atualizarStatus).mockRejectedValueOnce(new Error('422'));
    vi.mocked(ordemServicoPublicoApi.aprovar).mockResolvedValueOnce({ id: 1, status: 'APROVADA' } as never);
    vi.mocked(ordensServicoApi.get).mockResolvedValueOnce({
      id: 1,
      status: 'APROVADA',
      tokenAprovacao: 'tok-1',
    } as never);
    const { result } = renderHook(() => useCriarOSAPartirDeOrcamento(), { wrapper: wrapWithQueryClient() });

    result.current.mutate({ orcamentoId: 5 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ordensServicoApi.atualizarStatus).toHaveBeenCalledWith(1, 'APROVADA');
    expect(ordemServicoPublicoApi.aprovar).toHaveBeenCalledWith('tok-1');
    expect(ordensServicoApi.get).toHaveBeenCalledWith(1);
    expect(result.current.data).toEqual({ id: 1, status: 'APROVADA', tokenAprovacao: 'tok-1' });
  });

  it('still resolves with the sent OS when both the PATCH and the public fallback fail', async () => {
    vi.mocked(ordensServicoApi.criarAPartirDeOrcamento).mockResolvedValueOnce({ id: 1, status: 'ABERTA' } as never);
    vi.mocked(ordensServicoApi.enviar).mockResolvedValueOnce({
      id: 1,
      status: 'AGUARDANDO_APROVACAO',
      tokenAprovacao: 'tok-1',
    } as never);
    vi.mocked(ordensServicoApi.atualizarStatus).mockRejectedValueOnce(new Error('422'));
    vi.mocked(ordemServicoPublicoApi.aprovar).mockRejectedValueOnce(new Error('falha de rede'));
    const { result } = renderHook(() => useCriarOSAPartirDeOrcamento(), { wrapper: wrapWithQueryClient() });

    result.current.mutate({ orcamentoId: 5 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 1, status: 'ABERTA' });
  });

  it('still resolves with the created OS when enviar itself fails, instead of failing the whole conversion', async () => {
    vi.mocked(ordensServicoApi.criarAPartirDeOrcamento).mockResolvedValueOnce({ id: 1, status: 'ABERTA' } as never);
    vi.mocked(ordensServicoApi.enviar).mockRejectedValueOnce(new Error('falha de rede'));
    const { result } = renderHook(() => useCriarOSAPartirDeOrcamento(), { wrapper: wrapWithQueryClient() });

    result.current.mutate({ orcamentoId: 5 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ordensServicoApi.atualizarStatus).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({ id: 1, status: 'ABERTA' });
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
