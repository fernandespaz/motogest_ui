import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { caixaApi } from '@/api/endpoints/caixa';
import { contasPagarApi } from '@/api/endpoints/contasPagar';
import { contasReceberApi } from '@/api/endpoints/contasReceber';
import {
  caixaKeys,
  caixaSessaoKeys,
  contasPagarKeys,
  contasReceberKeys,
  useCaixaMovimentos,
  useCaixaPeriodo,
  useCaixaSaldo,
  useRegistrarCaixa,
  useCaixaSessoes,
  useCaixaSessaoAberta,
  useCaixaSessao,
  useCaixaSessaoEventos,
  useAbrirCaixaSessao,
  useFecharCaixaSessao,
  useReabrirCaixaSessao,
  useFaturarOrdemServico,
  useRelatorioCaixaDiario,
  useRelatorioCaixaPeriodo,
  useContasPagar,
  useContasPagarPendentes,
  usePagarConta,
  useCancelarContaPagar,
  useContasReceber,
  useContasReceberPendentes,
  useReceberConta,
  useCancelarContaReceber,
} from './useFinanceiro';
import { ordensServicoKeys } from './useOrdensServico';

vi.mock('@/api/endpoints/caixa', () => ({
  caixaApi: {
    list: vi.fn(),
    periodo: vi.fn(),
    saldo: vi.fn(),
    registrar: vi.fn(),
    faturar: vi.fn(),
    sessoes: {
      listar: vi.fn(),
      abrir: vi.fn(),
      aberta: vi.fn(),
      buscarPorId: vi.fn(),
      eventos: vi.fn(),
      fechar: vi.fn(),
      reabrir: vi.fn(),
      exportar: vi.fn(),
    },
    relatorios: {
      diario: vi.fn(),
      diarioExportar: vi.fn(),
      periodo: vi.fn(),
      periodoExportar: vi.fn(),
    },
  },
}));
vi.mock('@/api/endpoints/contasPagar', () => ({
  contasPagarApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    pendentes: vi.fn(),
    pagar: vi.fn(),
    cancelar: vi.fn(),
  },
}));
vi.mock('@/api/endpoints/contasReceber', () => ({
  contasReceberApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    pendentes: vi.fn(),
    receber: vi.fn(),
    cancelar: vi.fn(),
  },
}));

describe('caixa hooks', () => {
  it('useCaixaMovimentos() lists movimentos', async () => {
    vi.mocked(caixaApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useCaixaMovimentos(), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(caixaApi.list).toHaveBeenCalled();
  });

  it('useCaixaPeriodo() stays disabled until both dates are set', () => {
    const { result } = renderHook(() => useCaixaPeriodo('', ''), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useCaixaPeriodo() fetches once both dates are set', async () => {
    vi.mocked(caixaApi.periodo).mockResolvedValueOnce([] as never);
    const { result } = renderHook(() => useCaixaPeriodo('2026-01-01', '2026-01-31'), {
      wrapper: wrapWithQueryClient(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(caixaApi.periodo).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
  });

  it('useCaixaSaldo() fetches once both dates are set', async () => {
    vi.mocked(caixaApi.saldo).mockResolvedValueOnce(500 as never);
    const { result } = renderHook(() => useCaixaSaldo('2026-01-01', '2026-01-31'), {
      wrapper: wrapWithQueryClient(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(500);
  });

  it('useRegistrarCaixa() invalidates the caixa keys on success', async () => {
    vi.mocked(caixaApi.registrar).mockResolvedValueOnce({ id: 1 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRegistrarCaixa(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ tipo: 'ENTRADA', valor: 100 } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: caixaKeys.all });
  });
});

describe('caixa sessão hooks', () => {
  it('useCaixaSessoes() lists sessions when enabled', async () => {
    vi.mocked(caixaApi.sessoes.listar).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useCaixaSessoes({ size: 20 }, { enabled: true }), {
      wrapper: wrapWithQueryClient(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(caixaApi.sessoes.listar).toHaveBeenCalledWith({ size: 20 });
  });

  it('useCaixaSessaoAberta() resolves to null when there is no open session, without erroring', async () => {
    vi.mocked(caixaApi.sessoes.aberta).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useCaixaSessaoAberta({ enabled: true }), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('useCaixaSessao() stays disabled without an id', () => {
    const { result } = renderHook(() => useCaixaSessao(undefined), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useCaixaSessaoEventos() fetches the audit trail for a session', async () => {
    vi.mocked(caixaApi.sessoes.eventos).mockResolvedValueOnce([{ id: 1, tipo: 'ABERTURA' }] as never);
    const { result } = renderHook(() => useCaixaSessaoEventos(7), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(caixaApi.sessoes.eventos).toHaveBeenCalledWith(7);
  });

  it('useAbrirCaixaSessao() invalidates every caixa-sessao query on success', async () => {
    vi.mocked(caixaApi.sessoes.abrir).mockResolvedValueOnce({ id: 1, status: 'ABERTO' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAbrirCaixaSessao(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ turno: 'Manhã' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: caixaSessaoKeys.all });
  });

  it('useFecharCaixaSessao() invalidates the sessions list and that session\'s eventos', async () => {
    vi.mocked(caixaApi.sessoes.fechar).mockResolvedValueOnce({ id: 9, status: 'FECHADO' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useFecharCaixaSessao(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ id: 9, payload: {} as never });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: caixaSessaoKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: caixaSessaoKeys.eventos(9) });
  });

  it('useReabrirCaixaSessao() invalidates the sessions list and that session\'s eventos', async () => {
    vi.mocked(caixaApi.sessoes.reabrir).mockResolvedValueOnce({ id: 9, status: 'ABERTO' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useReabrirCaixaSessao(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ id: 9, payload: { motivo: 'Erro de digitação no fechamento' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: caixaSessaoKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: caixaSessaoKeys.eventos(9) });
  });

  it('useFaturarOrdemServico() invalidates caixa, contas a receber and ordens de serviço on success', async () => {
    vi.mocked(caixaApi.faturar).mockResolvedValueOnce({ ordemServicoId: 3 } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useFaturarOrdemServico(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ ordemServicoId: 3, payload: { formaPagamento: 'PIX' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(caixaApi.faturar).toHaveBeenCalledWith(3, { formaPagamento: 'PIX' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: caixaSessaoKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: caixaKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: contasReceberKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ordensServicoKeys.all });
  });

  it('useRelatorioCaixaDiario() fetches once a date is set', async () => {
    vi.mocked(caixaApi.relatorios.diario).mockResolvedValueOnce({ saldoDia: 100 } as never);
    const { result } = renderHook(() => useRelatorioCaixaDiario('2026-01-15'), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(caixaApi.relatorios.diario).toHaveBeenCalledWith('2026-01-15');
  });

  it('useRelatorioCaixaPeriodo() stays disabled until both dates are set', () => {
    const { result } = renderHook(() => useRelatorioCaixaPeriodo('', ''), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('contas a pagar hooks', () => {
  it('useContasPagar() lists through the factory', async () => {
    vi.mocked(contasPagarApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useContasPagar(), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useContasPagarPendentes() fetches once both dates are set', async () => {
    vi.mocked(contasPagarApi.pendentes).mockResolvedValueOnce([] as never);
    const { result } = renderHook(() => useContasPagarPendentes('2026-01-01', '2026-01-31'), {
      wrapper: wrapWithQueryClient(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(contasPagarApi.pendentes).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
  });

  it('usePagarConta() invalidates contas-pagar and caixa on success', async () => {
    vi.mocked(contasPagarApi.pagar).mockResolvedValueOnce({ id: 1, status: 'PAGA' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => usePagarConta(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: contasPagarKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: caixaKeys.all });
  });

  it('useCancelarContaPagar() invalidates contas-pagar on success', async () => {
    vi.mocked(contasPagarApi.cancelar).mockResolvedValueOnce({ id: 1, status: 'CANCELADA' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCancelarContaPagar(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: contasPagarKeys.all });
  });
});

describe('contas a receber hooks', () => {
  it('useContasReceber() lists through the factory', async () => {
    vi.mocked(contasReceberApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useContasReceber(), { wrapper: wrapWithQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useContasReceberPendentes() fetches once both dates are set', async () => {
    vi.mocked(contasReceberApi.pendentes).mockResolvedValueOnce([] as never);
    const { result } = renderHook(() => useContasReceberPendentes('2026-01-01', '2026-01-31'), {
      wrapper: wrapWithQueryClient(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(contasReceberApi.pendentes).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
  });

  it('useReceberConta() invalidates contas-receber and caixa on success', async () => {
    vi.mocked(contasReceberApi.receber).mockResolvedValueOnce({ id: 1, status: 'RECEBIDA' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useReceberConta(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: contasReceberKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: caixaKeys.all });
  });

  it('useCancelarContaReceber() invalidates contas-receber on success', async () => {
    vi.mocked(contasReceberApi.cancelar).mockResolvedValueOnce({ id: 1, status: 'CANCELADA' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCancelarContaReceber(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: contasReceberKeys.all });
  });
});
