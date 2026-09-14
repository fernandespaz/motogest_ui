import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { veiculosApi } from './veiculos';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('veiculosApi', () => {
  it('list() GETs /veiculos with the given params', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await veiculosApi.list({ page: 0, size: 20 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/veiculos', { params: { page: 0, size: 20 } });
  });

  it('get() GETs a single veículo by id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1, placa: 'MTG0001' } });

    await veiculosApi.get(1);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/veiculos/1');
  });

  it('create() POSTs a new veículo', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, placa: 'MTG0002' } });

    await veiculosApi.create({ placa: 'MTG0002' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/veiculos', { placa: 'MTG0002' });
  });

  it('update() PUTs changes to an existing veículo', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 2, placa: 'MTG0003' } });

    await veiculosApi.update(2, { placa: 'MTG0003' } as never);

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/veiculos/2', { placa: 'MTG0003' });
  });

  it('remove() DELETEs a veículo by id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await veiculosApi.remove(2);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/veiculos/2');
  });
});
