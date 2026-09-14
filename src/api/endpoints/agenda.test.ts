import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { agendaApi } from './agenda';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('agendaApi', () => {
  it('inherits the base CRUD methods for /agendamentos', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await agendaApi.list();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/agendamentos', { params: undefined });
  });

  it('periodo() GETs agendamentos within a date range', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1 }] });

    const result = await agendaApi.periodo('2026-01-01', '2026-01-31');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/agendamentos/periodo', {
      params: { inicio: '2026-01-01', fim: '2026-01-31' },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('atualizarStatus() PATCHes the status of one agendamento', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { id: 1, status: 'CONFIRMADO' } });

    const result = await agendaApi.atualizarStatus(1, 'CONFIRMADO' as never);

    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/agendamentos/1/status', null, {
      params: { status: 'CONFIRMADO' },
    });
    expect(result.status).toBe('CONFIRMADO');
  });
});
