import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { pagamentosApi } from './pagamentos';

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('pagamentosApi', () => {
  it('iniciarPedido() POSTs a one-off charge', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { status: 'PENDENTE', tipo: 'UNICO' } });

    const payload = { plano: 'PRO', valor: 99.9, cardToken: 'enc_abc', titularNome: 'Ana', titularCpfCnpj: '12345678900' };
    const result = await pagamentosApi.iniciarPedido(payload as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/pagamentos/pedido', payload);
    expect(result).toEqual({ status: 'PENDENTE', tipo: 'UNICO' });
  });

  it('iniciarAssinatura() POSTs a recurring subscription', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { status: 'PENDENTE', tipo: 'RECORRENTE' } });

    const payload = { plano: 'PRO', valorMensal: 99.9, cardToken: 'enc_abc', titularNome: 'Ana', titularCpfCnpj: '12345678900' };
    const result = await pagamentosApi.iniciarAssinatura(payload as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/pagamentos/assinatura', payload);
    expect(result).toEqual({ status: 'PENDENTE', tipo: 'RECORRENTE' });
  });
});
