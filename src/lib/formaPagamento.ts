import type { FormaPagamento, SaldoPorFormaPagamentoResponse } from '@/api/types';

/**
 * Única fonte de verdade pras 4 formas de pagamento do caixa — rótulo,
 * valor do enum (`CaixaMovimentoRequest.formaPagamento`) e a chave
 * correspondente em `SaldoPorFormaPagamentoResponse` (minúscula, formato
 * diferente do enum). Usado tanto pelos `<Select>` de lançamento/faturamento
 * quanto pela tabela de conferência de fechamento/detalhe de sessão — evita
 * que uma forma de pagamento nova (ou uma renomeação) precise ser replicada
 * em 4-5 arquivos separados.
 */
export const FORMAS_PAGAMENTO: {
  value: FormaPagamento;
  label: string;
  chave: keyof SaldoPorFormaPagamentoResponse;
}[] = [
  { value: 'DINHEIRO', label: 'Dinheiro', chave: 'dinheiro' },
  { value: 'CARTAO', label: 'Cartão', chave: 'cartao' },
  { value: 'PIX', label: 'Pix', chave: 'pix' },
  { value: 'TRANSFERENCIA', label: 'Transferência', chave: 'transferencia' },
];

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = Object.fromEntries(
  FORMAS_PAGAMENTO.map((f) => [f.value, f.label]),
) as Record<FormaPagamento, string>;
