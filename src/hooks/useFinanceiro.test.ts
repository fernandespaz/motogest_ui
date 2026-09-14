import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { caixaApi } from '@/api/endpoints/caixa';
import { contasPagarApi } from '@/api/endpoints/contasPagar';
import { contasReceberApi } from '@/api/endpoints/contasReceber';
import {
  caixaKeys,
  contasPagarKeys,
  contasReceberKeys,
  useCaixaMovimentos,
  useCaixaPeriodo,
  useCaixaSaldo,
  useRegistrarCaixa,
  useContasPagar,
  useContasPagarPendentes,
  usePagarConta,
  useCancelarContaPagar,
  useContasReceber,
  useContasReceberPendentes,
  useReceberConta,
  useCancelarContaReceber,
} from './useFinanceiro';

vi.mock('@/api/endpoints/caixa', () => ({
  caixaApi: { list: vi.fn(), periodo: vi.fn(), saldo: vi.fn(), registrar: vi.fn() },
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
