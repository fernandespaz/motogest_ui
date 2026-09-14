import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { estoqueApi } from './estoque';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('estoqueApi', () => {
  it('list() GETs paginated movimentações', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await estoqueApi.list({ page: 0, size: 20 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/movimentacoes-estoque', { params: { page: 0, size: 20 } });
  });

  it('listPorProduto() GETs movimentações scoped to one produto', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await estoqueApi.listPorProduto(5, { page: 0, size: 10 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/produtos/5/movimentacoes', { params: { page: 0, size: 10 } });
  });

  it('registrar() POSTs a new movimentação for a produto', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });

    await estoqueApi.registrar(5, { quantidade: 10, tipo: 'ENTRADA' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/produtos/5/movimentacoes', {
      quantidade: 10,
      tipo: 'ENTRADA',
    });
  });
});
