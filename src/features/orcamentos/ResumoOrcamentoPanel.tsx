import { Check, Circle } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatMinutosParaHoras } from '@/lib/formatters';
import {
  resumoCustoLucro,
  somarTempoVendidoMinutos,
  temServicoPorHTSemTempo,
  totaisPorTipo,
  type ItemFormValue,
} from '@/features/shared/ItemsEditor';

export interface PendenciaEnvio {
  rotulo: string;
  ok: boolean;
}

/**
 * O que falta para o orçamento poder ser ENVIADO ao cliente (salvar rascunho nunca é bloqueado por isto).
 * Sem cadastro, o envio exige vincular cliente e veículo cadastrados — o backend recusa com 422 (ver orcamentoModo.ts).
 */
export function pendenciasEnvio(args: {
  semCadastro: boolean;
  clienteId?: number;
  veiculoId?: number;
  itens: Pick<ItemFormValue, 'precificadoPorHT' | 'tempoVendidoMinutos'>[];
}): PendenciaEnvio[] {
  const cadastrado = !args.semCadastro;
  const lista: PendenciaEnvio[] = [
    { rotulo: 'Cliente cadastrado', ok: cadastrado && !!args.clienteId },
    { rotulo: 'Veículo cadastrado', ok: cadastrado && !!args.veiculoId },
    { rotulo: 'Ao menos 1 item', ok: args.itens.length > 0 },
  ];
  if (temServicoPorHTSemTempo(args.itens)) lista.push({ rotulo: 'Tempo vendido dos serviços', ok: false });
  return lista;
}

/**
 * Resumo fixo do orçamento: total sempre à vista, pendências para enviar e a ação de salvar.
 * Precisa ficar dentro do <form> (o botão é submit).
 */
export function ResumoOrcamentoPanel({
  itens,
  pendencias,
  mostrarSalvar,
  saving,
  rotuloSalvar,
}: {
  itens: ItemFormValue[];
  pendencias: PendenciaEnvio[];
  mostrarSalvar: boolean;
  saving: boolean;
  rotuloSalvar: string;
}) {
  const total = itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0), 0);
  const porTipo = totaisPorTipo(itens);
  const interno = resumoCustoLucro(itens);
  const tempo = somarTempoVendidoMinutos(itens);
  const faltando = pendencias.filter((p) => !p.ok).length;

  return (
    <aside
      aria-label="Resumo do orçamento"
      data-testid="resumo-orcamento"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card lg:sticky lg:top-4 lg:self-start"
    >
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Resumo</h2>
        <dl className="mt-2 flex flex-col gap-1 text-sm">
          {[
            ['Serviços', porTipo.servicos],
            ['Peças', porTipo.produtos],
            ['Itens livres', porTipo.livres],
          ].map(([rotulo, valor]) => (
            <div key={rotulo as string} className="flex justify-between text-ink-muted">
              <dt>{rotulo}</dt>
              <dd className="tabular-nums">{formatCurrency(valor as number)}</dd>
            </div>
          ))}
          {tempo > 0 && (
            <div className="flex justify-between text-ink-muted">
              <dt>Tempo total</dt>
              <dd className="tabular-nums">{formatMinutosParaHoras(tempo)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-ink">Total</span>
          <output aria-live="polite" data-testid="resumo-total" className="text-2xl font-bold tabular-nums text-ink">
            {formatCurrency(total)}
          </output>
        </div>
      </div>

      {interno && (
        <p data-testid="resumo-interno" className="rounded-lg bg-surface-alt px-3 py-2 text-xs text-ink-muted">
          Só você vê: peças <span className="font-semibold text-ink">{formatCurrency(interno.custo)}</span> · lucro{' '}
          <span className="font-semibold text-ink">{formatCurrency(interno.lucro)}</span>
          {interno.margem != null && <> ({interno.margem.toLocaleString('pt-BR')}%)</>}
        </p>
      )}

      {/* Lista vazia = orçamento que não pode mais ser enviado/editado: o checklist não faz sentido. */}
      {pendencias.length > 0 && (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Para enviar ao cliente</h3>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          {pendencias.map((p) => (
            <li key={p.rotulo} className={clsx('flex items-center gap-2', p.ok ? 'text-ink-muted' : 'text-ink')}>
              {p.ok ? (
                <Check size={14} className="text-success" aria-hidden="true" />
              ) : (
                <Circle size={14} className="text-ink-muted" aria-hidden="true" />
              )}
              <span>
                {p.rotulo}
                <span className="sr-only">{p.ok ? ' — ok' : ' — pendente'}</span>
              </span>
            </li>
          ))}
        </ul>
        {faltando === 0 && <p className="mt-2 text-xs text-ink-muted">Tudo pronto: salve e envie pela lista de orçamentos.</p>}
      </div>
      )}

      {mostrarSalvar && (
        <Button type="submit" loading={saving} className="w-full">
          {rotuloSalvar}
        </Button>
      )}
    </aside>
  );
}
