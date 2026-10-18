import clsx from 'clsx';
import { formatDate } from '@/lib/formatters';
import { diasParaVencimento, situacaoDaConta, textoVencimento, type ContaBase } from './contasUtils';

/**
 * A data de vencimento com a distância de hoje logo abaixo ("há 3 dias",
 * "vence amanhã") — vermelho se já venceu, âmbar se vence hoje ou em até 3
 * dias. Conta quitada ou cancelada mostra só a data: o prazo já não importa.
 */
export function VencimentoInfo({ conta }: { conta: ContaBase }) {
  const situacao = situacaoDaConta(conta);
  const dias = diasParaVencimento(conta);
  const ativa = situacao === 'vencida' || situacao === 'vence-hoje' || situacao === 'a-vencer';
  const urgente = situacao === 'vencida';
  const proxima = situacao === 'vence-hoje' || (situacao === 'a-vencer' && dias != null && dias <= 3);

  return (
    <div className="leading-tight">
      <p className={clsx('font-medium', urgente ? 'text-danger' : 'text-ink')}>{formatDate(conta.dataVencimento) || '—'}</p>
      {ativa && dias != null && (
        <p className={clsx('text-xs', urgente ? 'text-danger' : proxima ? 'text-warning' : 'text-ink-muted')}>
          {textoVencimento(dias)}
        </p>
      )}
    </div>
  );
}
