import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { perfisApi } from './perfis';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('perfisApi', () => {
  it('list() GETs every perfil', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1, nome: 'Administrador' }] });

    const result = await perfisApi.list();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/perfis');
    expect(result).toEqual([{ id: 1, nome: 'Administrador' }]);
  });

  it('get() GETs a single perfil by id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1, nome: 'Administrador' } });

    await perfisApi.get(1);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/perfis/1');
  });

  it('create() POSTs a new perfil', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, nome: 'Mecânico' } });

    await perfisApi.create({ nome: 'Mecânico' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/perfis', { nome: 'Mecânico' });
  });

  it('update() PUTs changes to an existing perfil', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 2, nome: 'Mecânico Sênior' } });

    await perfisApi.update(2, { nome: 'Mecânico Sênior' } as never);

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/perfis/2', { nome: 'Mecânico Sênior' });
  });

  it('remove() DELETEs a perfil by id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await perfisApi.remove(2);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/perfis/2');
  });

  it('permissoesDisponiveis() GETs the full permission catalog', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ codigo: 'CLIENTE_READ' }] });

    const result = await perfisApi.permissoesDisponiveis();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/perfis/permissoes-disponiveis');
    expect(result).toEqual([{ codigo: 'CLIENTE_READ' }]);
  });
});
