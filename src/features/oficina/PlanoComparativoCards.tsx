import { Check, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/formatters';
import { PLANOS, type PlanoCodigo } from './pagamentoPlanos';

const ORDEM: PlanoCodigo[] = ['BASICO', 'PRO', 'PREMIUM'];

export function PlanoComparativoCards({
  selecionado,
  tipoCobranca,
  onSelecionar,
}: {
  selecionado: PlanoCodigo;
  tipoCobranca: 'ASSINATURA' | 'PEDIDO';
  onSelecionar: (plano: PlanoCodigo) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {ORDEM.map((codigo) => {
        const plano = PLANOS[codigo];
        const ativo = codigo === selecionado;
        // O valor exibido no card precisa acompanhar a forma de cobrança
        // selecionada no formulário — senão o card mostra um preço diferente
        // do que o botão "Pagar" realmente vai cobrar.
        const valor = tipoCobranca === 'ASSINATURA' ? plano.valorMensal : plano.valorAvulso;
        const sufixo = tipoCobranca === 'ASSINATURA' ? '/mês' : 'cobrança única';
        return (
          <button
            key={codigo}
            type="button"
            aria-pressed={ativo}
            onClick={() => onSelecionar(codigo)}
            className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition ${
              ativo
                ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-900/30'
                : 'border-border hover:border-brand-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink">{plano.label}</span>
              {plano.recomendado && (
                <Badge tone="brand">
                  <Sparkles size={12} />
                  Mais popular
                </Badge>
              )}
            </div>

            <p className="text-lg font-bold text-ink">
              {formatCurrency(valor)}
              <span className="text-xs font-normal text-ink-muted"> {sufixo}</span>
            </p>

            <p className="text-xs text-ink-muted">{plano.descricao}</p>

            <ul className="flex flex-col gap-1 text-xs text-ink">
              {plano.recursos.map((recurso) => (
                <li key={recurso} className="flex items-start gap-1.5">
                  <Check size={13} className="mt-0.5 shrink-0 text-green-600" />
                  <span>{recurso}</span>
                </li>
              ))}
            </ul>

            {plano.emBreve && plano.emBreve.length > 0 && (
              <div className="mt-1 border-t border-border pt-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Em breve</p>
                <ul className="flex flex-col gap-0.5 text-xs text-ink-muted">
                  {plano.emBreve.map((recurso) => (
                    <li key={recurso}>{recurso}</li>
                  ))}
                </ul>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
