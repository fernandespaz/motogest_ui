import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { clientesApi } from './clientes';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('clientesApi', () => {
  it('list() GETs /clientes with the given params, including the busca override', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await clientesApi.list({ page: 0, size: 20, busca: 'Carlos' });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/clientes', {
      params: { page: 0, size: 20, busca: 'Carlos' },
    });
  });

  it('get() GETs a single cliente by id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1, nome: 'Carlos' } });

    const result = await clientesApi.get(1);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/clientes/1');
    expect(result).toEqual({ id: 1, nome: 'Carlos' });
  });

  it('create() POSTs a new cliente', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, nome: 'Fernanda' } });

    await clientesApi.create({ nome: 'Fernanda' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/clientes', { nome: 'Fernanda' });
  });

  it('update() PUTs changes to an existing cliente', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 2, nome: 'Fernanda Souza' } });

    await clientesApi.update(2, { nome: 'Fernanda Souza' } as never);

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/clientes/2', { nome: 'Fernanda Souza' });
  });

  it('remove() DELETEs a cliente by id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await clientesApi.remove(2);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/clientes/2');
  });
});
