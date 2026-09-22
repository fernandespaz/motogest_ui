import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { produtosApi } from './produtos';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('produtosApi', () => {
  it('inherits the base CRUD methods for /produtos', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await produtosApi.list();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/produtos', { params: undefined });
  });

  it('abaixoDoMinimo() GETs produtos below their minimum stock', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, nome: 'Óleo Motor' }] });

    const result = await produtosApi.abaixoDoMinimo();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/produtos/abaixo-do-minimo', { params: undefined });
    expect(result).toEqual([{ id: 1, nome: 'Óleo Motor' }]);
  });

  it('abaixoDoMinimo() forwards a categoria filter', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

    await produtosApi.abaixoDoMinimo({ categoria: 'FREIOS' });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/produtos/abaixo-do-minimo', { params: { categoria: 'FREIOS' } });
  });
});
