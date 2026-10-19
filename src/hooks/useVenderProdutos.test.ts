import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, wrapWithQueryClient } from '@/test/queryClientWrapper';
import { caixaApi } from '@/api/endpoints/caixa';
import { estoqueApi } from '@/api/endpoints/estoque';
import { useVenderProdutos } from './useVendaCaixa';

vi.mock('@/api/endpoints/caixa', () => ({ caixaApi: { registrar: vi.fn() } }));
vi.mock('@/api/endpoints/estoque', () => ({ estoqueApi: { registrar: vi.fn() } }));

const venda = {
  sessaoId: 7,
  sessaoIdentificador: 'CX-0007',
  formaPagamento: 'PIX' as const,
  itens: [
    { produtoId: 1, nome: 'Filtro', quantidade: 2, precoUnitario: 30 },
    { produtoId: 2, nome: 'Vela', quantidade: 1, precoUnitario: 15.5 },
  ],
};

function renderar() {
  const qc = createTestQueryClient();
  return renderHook(() => useVenderProdutos(), { wrapper: wrapWithQueryClient(qc) });
}

describe('useVenderProdutos', () => {
  beforeEach(() => {
    vi.mocked(estoqueApi.registrar).mockReset().mockResolvedValue({} as never);
    vi.mocked(caixaApi.registrar).mockReset().mockResolvedValue({} as never);
  });

  it('baixa o estoque de cada item e lança uma única entrada com o total, ligada à sessão', async () => {
    const { result } = renderar();
    await result.current.mutateAsync(venda);

    expect(estoqueApi.registrar).toHaveBeenCalledTimes(2);
    expect(estoqueApi.registrar).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ tipo: 'SAIDA', quantidade: 2, referenciaTipo: 'VENDA_CAIXA', referenciaId: 7 }),
    );
    expect(caixaApi.registrar).toHaveBeenCalledOnce();
    expect(caixaApi.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'ENTRADA',
        valor: 75.5,
        formaPagamento: 'PIX',
        descricao: 'Venda de produtos: 2x Filtro, 1x Vela',
        referenciaId: 7,
      }),
    );
  });

  it('estorna as baixas já feitas quando um item seguinte falha, sem lançar no caixa', async () => {
    vi.mocked(estoqueApi.registrar)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error('sem saldo'))
      .mockResolvedValue({} as never);
    const { result } = renderar();

    await expect(result.current.mutateAsync(venda)).rejects.toThrow('sem saldo');

    expect(caixaApi.registrar).not.toHaveBeenCalled();
    expect(estoqueApi.registrar).toHaveBeenLastCalledWith(1, expect.objectContaining({ tipo: 'ENTRADA', quantidade: 2 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('estorna todas as baixas quando o lançamento no caixa falha', async () => {
    vi.mocked(caixaApi.registrar).mockRejectedValue(new Error('caixa fechado'));
    const { result } = renderar();

    await expect(result.current.mutateAsync(venda)).rejects.toThrow('caixa fechado');

    const estornos = vi.mocked(estoqueApi.registrar).mock.calls.filter(([, p]) => p.tipo === 'ENTRADA');
    expect(estornos.map(([id]) => id)).toEqual([1, 2]);
  });
  it('diz quais produtos não voltaram ao estoque quando o estorno também falha', async () => {
    vi.mocked(caixaApi.registrar).mockRejectedValue(new Error('caixa fechado'));
    vi.mocked(estoqueApi.registrar)
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({} as never);
    const { result } = renderar();

    await expect(result.current.mutateAsync(venda)).rejects.toThrow(/2x Filtro.*Ajuste o estoque manualmente/);
  });
});
