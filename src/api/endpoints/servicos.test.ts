import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { servicosApi } from './servicos';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('servicosApi', () => {
  it('list() GETs /servicos with the given params', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await servicosApi.list({ page: 0, size: 100 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/servicos', { params: { page: 0, size: 100 } });
  });

  it('get() GETs a single serviço by id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1, nome: 'Troca de Óleo' } });

    await servicosApi.get(1);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/servicos/1');
  });

  it('create() POSTs a new serviço', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, nome: 'Alinhamento' } });

    await servicosApi.create({ nome: 'Alinhamento' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/servicos', { nome: 'Alinhamento' });
  });

  it('update() PUTs changes to an existing serviço', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 2, nome: 'Alinhamento 3D' } });

    await servicosApi.update(2, { nome: 'Alinhamento 3D' } as never);

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/servicos/2', { nome: 'Alinhamento 3D' });
  });

  it('remove() DELETEs a serviço by id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await servicosApi.remove(2);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/servicos/2');
  });
});
