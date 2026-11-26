import { describe, expect, it } from 'vitest';
import { itemEhLivre, itemParaPayload, origemDoValor, resumoCustoLucro, totaisPorTipo, type ItemFormValue } from './ItemsEditor';

const livre: ItemFormValue = {
  id: 9,
  tipoItem: 'PRODUTO',
  descricao: 'Pastilha avulsa',
  quantidade: 3,
  valorUnitario: 187.5,
  custoUnitario: 150,
  acrescimoPercentual: 25,
};

describe('itemParaPayload — valor da peça e acréscimo', () => {
  it('manda o valor da peça e o preço FINAL já calculado; o acréscimo fica só no form', () => {
    const p = itemParaPayload({ ...livre });
    expect(p.custoUnitario).toBe(150);
    expect(p.valorUnitario).toBe(187.5);
    expect(p).not.toHaveProperty('acrescimoPercentual');
    expect(p).not.toHaveProperty('margemPercentual');
    expect(p).not.toHaveProperty('id');
  });

  it('item sem valor da peça não manda custo', () => {
    const p = itemParaPayload({ ...livre, custoUnitario: undefined, acrescimoPercentual: undefined });
    expect(p.custoUnitario).toBeUndefined();
    expect(p.valorUnitario).toBe(187.5);
  });
});

describe('resumoCustoLucro', () => {
  it('soma custo e lucro só dos itens com custo informado', () => {
    const r = resumoCustoLucro([livre, { quantidade: 1, valorUnitario: 500 }]);
    expect(r).toEqual({ custo: 450, lucro: 112.5, margem: 20 });
  });

  it('é undefined quando nenhum item tem custo', () => {
    expect(resumoCustoLucro([{ quantidade: 1, valorUnitario: 500 }])).toBeUndefined();
  });
});

describe('itemEhLivre', () => {
  it('só é livre sem vínculo com catálogo nem estoque', () => {
    expect(itemEhLivre({})).toBe(true);
    expect(itemEhLivre({ servicoId: 1 })).toBe(false);
    expect(itemEhLivre({ produtoId: 2 })).toBe(false);
  });
});

describe('origemDoValor', () => {
  const base = { tipoItem: 'PRODUTO' as const, valorUnitario: 50 };

  it('identifica valor calculado por custo+margem e por hora técnica', () => {
    expect(origemDoValor({ ...base, porAcrescimo: true })).toEqual({ rotulo: 'Valor da peça + acréscimo', tom: 'success' });
    expect(origemDoValor({ tipoItem: 'SERVICO', valorUnitario: 200, porHT: true })).toEqual({ rotulo: 'Hora técnica', tom: 'success' });
  });

  it('só diz "cadastro" enquanto o preço ainda bate com o do cadastro', () => {
    expect(origemDoValor({ ...base, precoCadastroProduto: 50 }).rotulo).toBe('Cadastro do produto');
    expect(origemDoValor({ ...base, precoCadastroProduto: 60 })).toEqual({ rotulo: 'Valor manual', tom: 'warning' });
  });

  it('sem nenhuma origem calculada, é valor manual', () => {
    expect(origemDoValor(base).rotulo).toBe('Valor manual');
  });
});

describe('totaisPorTipo', () => {
  it('separa serviços, peças e itens livres', () => {
    const t = totaisPorTipo([
      { tipoItem: 'SERVICO', servicoId: 1, quantidade: 1, valorUnitario: 1000 },
      { tipoItem: 'PRODUTO', produtoId: 2, quantidade: 2, valorUnitario: 30 },
      { tipoItem: 'PRODUTO', quantidade: 1, valorUnitario: 116.67 },
    ]);
    expect(t).toEqual({ servicos: 1000, produtos: 60, livres: 116.67 });
  });
});
