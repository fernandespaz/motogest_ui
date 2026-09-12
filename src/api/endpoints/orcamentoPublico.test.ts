import { describe, expect, it, vi } from 'vitest';
import { publicApiClient } from '../publicClient';
import { orcamentoPublicoApi } from './orcamentoPublico';

vi.mock('../publicClient', () => ({
  publicApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('orcamentoPublicoApi', () => {
  it('buscar() GETs the public path built from the token', async () => {
    vi.mocked(publicApiClient.get).mockResolvedValueOnce({ data: { id: 1, status: 'ENVIADO' } });

    const result = await orcamentoPublicoApi.buscar('abc123');

    expect(publicApiClient.get).toHaveBeenCalledWith('/api/v1/public/orcamentos/abc123');
    expect(result).toEqual({ id: 1, status: 'ENVIADO' });
  });

  it('aprovar() POSTs to the approve path for that token', async () => {
    vi.mocked(publicApiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'APROVADO' } });

    const result = await orcamentoPublicoApi.aprovar('abc123');

    expect(publicApiClient.post).toHaveBeenCalledWith('/api/v1/public/orcamentos/abc123/aprovar');
    expect(result.status).toBe('APROVADO');
  });

  it('rejeitar() POSTs to the reject path for that token', async () => {
    vi.mocked(publicApiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'REJEITADO' } });

    const result = await orcamentoPublicoApi.rejeitar('abc123');

    expect(publicApiClient.post).toHaveBeenCalledWith('/api/v1/public/orcamentos/abc123/rejeitar');
    expect(result.status).toBe('REJEITADO');
  });
});
