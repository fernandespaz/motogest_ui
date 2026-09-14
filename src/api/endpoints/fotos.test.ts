import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { fotosApi } from './fotos';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('fotosApi', () => {
  it('list() GETs the fotos for an OS', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1 }] });

    const result = await fotosApi.list(10);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/ordens-servico/10/fotos');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('adicionar() POSTs a new foto for an OS', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2 } });

    await fotosApi.adicionar(10, { url: 'data:image/png;base64,...' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/ordens-servico/10/fotos', {
      url: 'data:image/png;base64,...',
    });
  });

  it('remover() DELETEs a foto by id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await fotosApi.remover(2);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/fotos/2');
  });
});
