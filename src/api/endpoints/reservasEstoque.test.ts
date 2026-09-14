import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { reservasEstoqueApi } from './reservasEstoque';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('reservasEstoqueApi', () => {
  it('list() GETs paginated reservas', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await reservasEstoqueApi.list({ page: 0, size: 20 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/reservas-estoque', { params: { page: 0, size: 20 } });
  });

  it('reservar() POSTs a reservation for a produto', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });

    await reservasEstoqueApi.reservar(5, { quantidade: 2 } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/produtos/5/reservas', { quantidade: 2 });
  });

  it('liberar() POSTs to release an existing reserva', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'LIBERADA' } });

    const result = await reservasEstoqueApi.liberar(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/reservas-estoque/1/liberar');
    expect(result.status).toBe('LIBERADA');
  });
});
