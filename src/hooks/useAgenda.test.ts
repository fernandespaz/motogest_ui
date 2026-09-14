import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { agendaApi } from '@/api/endpoints/agenda';
import { agendaKeys, useAgendamentos, useAgendamentosPeriodo, useAtualizarStatusAgendamento } from './useAgenda';

vi.mock('@/api/endpoints/agenda', () => ({
  agendaApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    periodo: vi.fn(),
    atualizarStatus: vi.fn(),
  },
}));

describe('useAgenda hooks', () => {
  it('useAgendamentos() lists agendamentos through the factory', async () => {
    vi.mocked(agendaApi.list).mockResolvedValueOnce({ content: [] } as never);
    const { result } = renderHook(() => useAgendamentos(), { wrapper: wrapWithQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agendaApi.list).toHaveBeenCalled();
  });

  it('useAgendamentosPeriodo() stays disabled until both dates are provided', () => {
    const { result } = renderHook(() => useAgendamentosPeriodo('', ''), { wrapper: wrapWithQueryClient() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(agendaApi.periodo).not.toHaveBeenCalled();
  });

  it('useAgendamentosPeriodo() fetches agendamentos within a date range once both dates are set', async () => {
    vi.mocked(agendaApi.periodo).mockResolvedValueOnce([{ id: 1 }] as never);
    const { result } = renderHook(() => useAgendamentosPeriodo('2026-01-01', '2026-01-31'), {
      wrapper: wrapWithQueryClient(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agendaApi.periodo).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
  });

  it('useAtualizarStatusAgendamento() invalidates the agenda list on success', async () => {
    vi.mocked(agendaApi.atualizarStatus).mockResolvedValueOnce({ id: 1, status: 'CONFIRMADO' } as never);
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAtualizarStatusAgendamento(), { wrapper: wrapWithQueryClient(client) });

    result.current.mutate({ id: 1, status: 'CONFIRMADO' as never });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: agendaKeys.all });
  });
});
