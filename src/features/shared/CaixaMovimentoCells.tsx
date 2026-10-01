import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { CaixaTipo } from '@/api/types';

/** Rótulo colorido de Entrada/Saída — usado pela lista de lançamentos do turno (Meu Caixa) e pelo relatório diário. */
export function CaixaTipoLabel({ tipo, comIcone = false }: { tipo?: CaixaTipo; comIcone?: boolean }) {
  if (tipo === 'ENTRADA') {
    return (
      <span className="flex items-center gap-1.5 text-success">
        {comIcone && <ArrowUpCircle size={16} />} Entrada
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-danger">
      {comIcone && <ArrowDownCircle size={16} />} Saída
    </span>
  );
}

/** Valor com sinal e cor por tipo (entrada verde, saída vermelha com "- " na frente). */
export function CaixaValorCell({ tipo, valor }: { tipo?: CaixaTipo; valor: number | undefined }) {
  return (
    <span className={tipo === 'ENTRADA' ? 'text-success' : 'text-danger'}>
      {tipo === 'SAIDA' ? '- ' : ''}
      {formatCurrency(valor)}
    </span>
  );
}
