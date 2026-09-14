import { describe, expect, it, vi } from 'vitest';
import { publicApiClient } from '../publicClient';
import { ordemServicoPublicoApi } from './ordemServicoPublico';

vi.mock('../publicClient', () => ({
  publicApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ordemServicoPublicoApi', () => {
  it('buscar() GETs the public OS by token', async () => {
    vi.mocked(publicApiClient.get).mockResolvedValueOnce({ data: { id: 1, status: 'AGUARDANDO_APROVACAO' } });

    const result = await ordemServicoPublicoApi.buscar('tok123');

    expect(publicApiClient.get).toHaveBeenCalledWith('/api/v1/public/ordens-servico/tok123');
    expect(result.status).toBe('AGUARDANDO_APROVACAO');
  });

  it('aprovar() POSTs to approve the OS for that token', async () => {
    vi.mocked(publicApiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'APROVADA' } });

    const result = await ordemServicoPublicoApi.aprovar('tok123');

    expect(publicApiClient.post).toHaveBeenCalledWith('/api/v1/public/ordens-servico/tok123/aprovar');
    expect(result.status).toBe('APROVADA');
  });

  it('rejeitar() POSTs to reject the OS for that token', async () => {
    vi.mocked(publicApiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'REJEITADA' } });

    const result = await ordemServicoPublicoApi.rejeitar('tok123');

    expect(publicApiClient.post).toHaveBeenCalledWith('/api/v1/public/ordens-servico/tok123/rejeitar');
    expect(result.status).toBe('REJEITADA');
  });
});
