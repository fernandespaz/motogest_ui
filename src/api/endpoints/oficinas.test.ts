import { describe, expect, it, vi } from 'vitest';
import { adminApiClient } from '../adminClient';
import { oficinasAdminApi } from './oficinas';

vi.mock('../adminClient', () => ({
  adminApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('oficinasAdminApi', () => {
  it('list() sends the token as X-Admin-Token, never as a Bearer token', async () => {
    vi.mocked(adminApiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await oficinasAdminApi.list('secret-token', { page: 0, size: 20 });

    expect(adminApiClient.get).toHaveBeenCalledWith('/api/v1/admin/oficinas', {
      params: { page: 0, size: 20 },
      headers: { 'X-Admin-Token': 'secret-token' },
    });
  });

  it('criar() posts the registration payload with the admin token header', async () => {
    vi.mocked(adminApiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    const payload = {
      razaoSocial: 'Ram Tec',
      cnpj: '11222333000199',
      email: 'contato@ramtec.com.br',
      adminNome: 'Diego',
      adminEmail: 'diego@ramtec.com.br',
      adminSenha: 'senha123',
    };

    await oficinasAdminApi.criar('secret-token', payload as never);

    expect(adminApiClient.post).toHaveBeenCalledWith('/api/v1/admin/oficinas', payload, {
      headers: { 'X-Admin-Token': 'secret-token' },
    });
  });
});
