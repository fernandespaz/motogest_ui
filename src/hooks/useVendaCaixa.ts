import { useMutation, useQueryClient } from '@tanstack/react-query';
import { caixaApi } from '@/api/endpoints/caixa';
import { estoqueApi } from '@/api/endpoints/estoque';
import type { FormaPagamento } from '@/api/types';
import { caixaKeys } from './useFinanceiro';
import { estoqueKeys } from './useEstoque';
import { produtosKeys } from './useProdutos';

// Fora de useFinanceiro de propósito: useEstoque já importa useFinanceiro (conta a pagar da compra), então a venda,
// que precisa das chaves de estoque, não pode viver lá sem criar um ciclo de importação.

export interface VendaProdutosPayload {
  sessaoId: number;
  sessaoIdentificador?: string;
  formaPagamento: FormaPagamento;
  itens: { produtoId: number; nome: string; quantidade: number; precoUnitario: number }[];
}

export const VENDA_PRODUTO_REFERENCIA = 'VENDA_CAIXA';

/** Total da venda em reais, arredondado ao centavo — a mesma conta vale pro valor exibido e pro lançado no caixa. */
export function totalDaVenda(itens: Pick<VendaProdutosPayload['itens'][number], 'quantidade' | 'precoUnitario'>[]): number {
  return Math.round(itens.reduce((soma, i) => soma + i.quantidade * i.precoUnitario, 0) * 100) / 100;
}

export function descricaoDaVenda(itens: VendaProdutosPayload['itens']): string {
  return `Venda de produtos: ${itens.map((i) => `${i.quantidade}x ${i.nome}`).join(', ')}`;
}

/**
 * Venda de balcão: o backend não tem endpoint de venda, então ela é composta de uma SAÍDA de estoque por item
 * (rastreável pela referência à sessão do caixa) e uma única ENTRADA no caixa com o total. Se qualquer passo
 * falha, as saídas já feitas são estornadas com ENTRADA de estoque — o estoque não pode ficar baixado sem o
 * dinheiro ter entrado no caixa.
 */
export function useVenderProdutos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessaoId, sessaoIdentificador, formaPagamento, itens }: VendaProdutosPayload) => {
      const referencia = { referenciaTipo: VENDA_PRODUTO_REFERENCIA, referenciaId: sessaoId };
      const origem = sessaoIdentificador ? `caixa ${sessaoIdentificador}` : `sessão ${sessaoId}`;
      const baixados: VendaProdutosPayload['itens'] = [];
      try {
        for (const item of itens) {
          await estoqueApi.registrar(item.produtoId, {
            tipo: 'SAIDA',
            quantidade: item.quantidade,
            ...referencia,
            observacao: `Venda no ${origem}`,
          });
          baixados.push(item);
        }
        return await caixaApi.registrar({
          tipo: 'ENTRADA',
          categoria: 'OUTRO',
          valor: totalDaVenda(itens),
          formaPagamento,
          descricao: descricaoDaVenda(itens),
          ...referencia,
        });
      } catch (error) {
        const estornos = await Promise.allSettled(
          baixados.map((i) =>
            estoqueApi.registrar(i.produtoId, {
              tipo: 'ENTRADA',
              quantidade: i.quantidade,
              ...referencia,
              observacao: `Estorno de venda não concluída no ${origem}`,
            }),
          ),
        );
        const naoEstornados = baixados.filter((_, idx) => estornos[idx].status === 'rejected');
        if (naoEstornados.length > 0) {
          // O estoque ficou baixado sem entrada no caixa: o operador precisa saber quais produtos acertar à mão.
          throw new Error(
            `A venda falhou e não foi possível devolver ao estoque: ${naoEstornados
              .map((i) => `${i.quantidade}x ${i.nome}`)
              .join(', ')}. Ajuste o estoque manualmente.`,
          );
        }
        throw error;
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: caixaKeys.all });
      qc.invalidateQueries({ queryKey: estoqueKeys.all });
      qc.invalidateQueries({ queryKey: produtosKeys.all });
    },
    meta: { hasLocalErrorHandling: true },
  });
}
