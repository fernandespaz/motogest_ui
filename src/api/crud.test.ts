import { describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import { createCrudApi } from './crud';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

interface Widget {
  id: number;
  nome: string;
}

describe('createCrudApi', () => {
  const api = createCrudApi<Widget>('/api/v1/widgets');

  it('list() GETs the base path with the given params and unwraps response.data', async () => {
    const page = { content: [{ id: 1, nome: 'Parafuso' }], totalElements: 1 };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: page });

    const result = await api.list({ page: 0, size: 20 } as never);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/widgets', { params: { page: 0, size: 20 } });
    expect(result).toEqual(page);
  });

  it('get() GETs the resource by id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 5, nome: 'Porca' } });

    const result = await api.get(5);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/widgets/5');
    expect(result).toEqual({ id: 5, nome: 'Porca' });
  });

  it('create() POSTs the payload to the base path', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 9, nome: 'Arruela' } });

    const result = await api.create({ id: 0, nome: 'Arruela' });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/widgets', { id: 0, nome: 'Arruela' });
    expect(result).toEqual({ id: 9, nome: 'Arruela' });
  });

  it('update() PUTs the payload to the resource path', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 9, nome: 'Arruela nova' } });

    const result = await api.update(9, { id: 9, nome: 'Arruela nova' });

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/widgets/9', { id: 9, nome: 'Arruela nova' });
    expect(result).toEqual({ id: 9, nome: 'Arruela nova' });
  });

  it('remove() DELETEs the resource by id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await api.remove(9);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/widgets/9');
  });

  it('propagates a rejected request instead of swallowing the error', async () => {
    const failure = new Error('network down');
    vi.mocked(apiClient.get).mockRejectedValueOnce(failure);

    await expect(api.get(1)).rejects.toBe(failure);
  });
});
