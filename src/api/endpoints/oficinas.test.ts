import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { adminApiClient } from '../adminClient';
import { oficinasApi, oficinasAdminApi } from './oficinas';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../adminClient', () => ({
  adminApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('oficinasApi', () => {
  it('atual() GETs the tenant’s own oficina', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1, razaoSocial: 'Ram Tec' } });

    const result = await oficinasApi.atual();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/oficinas/atual');
    expect(result).toEqual({ id: 1, razaoSocial: 'Ram Tec' });
  });

  it('atualizar() PUTs updated oficina data', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 1, razaoSocial: 'Ram Tec 2' } });

    await oficinasApi.atualizar({ razaoSocial: 'Ram Tec 2' } as never);

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/oficinas/atual', { razaoSocial: 'Ram Tec 2' });
  });

  it('enviarLogo() POSTs multipart form data with the Content-Type left for the browser to set', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    const arquivo = new File(['fake'], 'logo.png', { type: 'image/png' });

    await oficinasApi.enviarLogo(arquivo);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/oficinas/atual/logo',
      expect.any(FormData),
      { headers: { 'Content-Type': undefined } },
    );
    const formData = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    expect(formData.get('arquivo')).toBe(arquivo);
  });

  it('removerLogo() DELETEs the current logo', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { id: 1 } });

    await oficinasApi.removerLogo();

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/oficinas/atual/logo');
  });

  it('buscarLogoBlob() GETs the logo as a blob', async () => {
    const blob = new Blob(['fake-image']);
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: blob });

    const result = await oficinasApi.buscarLogoBlob();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/oficinas/atual/logo', { responseType: 'blob' });
    expect(result).toBe(blob);
  });
});

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
