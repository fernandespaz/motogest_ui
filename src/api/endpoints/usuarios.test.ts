import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { usuariosApi } from './usuarios';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('usuariosApi', () => {
  it('list() GETs every usuário', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, nome: 'Diego' }] });

    const result = await usuariosApi.list();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/usuarios');
    expect(result).toEqual([{ id: 1, nome: 'Diego' }]);
  });

  it('get() GETs a single usuário by id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1, nome: 'Diego' } });

    await usuariosApi.get(1);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/usuarios/1');
  });

  it('create() POSTs a new usuário', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, nome: 'Fernanda' } });

    await usuariosApi.create({ nome: 'Fernanda' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/usuarios', { nome: 'Fernanda' });
  });

  it('update() PUTs changes to an existing usuário', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 2, nome: 'Fernanda Souza' } });

    await usuariosApi.update(2, { nome: 'Fernanda Souza' } as never);

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/usuarios/2', { nome: 'Fernanda Souza' });
  });

  it('remove() DELETEs a usuário by id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await usuariosApi.remove(2);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/usuarios/2');
  });
});
