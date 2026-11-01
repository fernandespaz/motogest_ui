import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Checkbox, Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useComissoes, usePagarComissoes, useResumoComissoes } from '@/hooks/useComissoes';
import { useSituacaoFechamento } from '@/hooks/useFinanceiro';
import { extractErrorMessage } from '@/api/client';
import { ultimosPeriodos } from '@/lib/comissaoPeriodo';
import { FORMAS_PAGAMENTO } from '@/lib/formaPagamento';
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import type { ComissaoResponse, FormaPagamento, ResumoComissaoFuncionario } from '@/api/types';

const PAPEL_LABEL = { MECANICO: 'Mecânico', CONSULTOR: 'Consultor' } as const;

/**
 * Comissões por período de fechamento: o período segue o dia de fechamento cadastrado no financeiro e o
 * pagamento é previsto para o 5º dia útil do mês seguinte. A tela só consulta e paga — a comissão nasce
 * sozinha (OS concluída → mecânico; OS faturada → consultor).
 */
export function FinanceiroComissoes() {
  const podePagar = useAuthStore((s) => s.hasPermission('FINANCEIRO_WRITE'));
  const situacao = useSituacaoFechamento({ silentError: true });
  const diaFechamento = situacao.data?.diaFechamento;
  const periodos = useMemo(() => (diaFechamento ? ultimosPeriodos(new Date(), diaFechamento) : []), [diaFechamento]);

  const [fimEscolhido, setFimEscolhido] = useState<string>();
  const periodo = periodos.find((p) => p.fim === fimEscolhido) ?? periodos[0];
  const [usuarioId, setUsuarioId] = useState<number>();

  const filtroPeriodo = { inicio: periodo?.inicio, fim: periodo?.fim };
  const habilitado = !!periodo;
  const resumo = useResumoComissoes(filtroPeriodo, { enabled: habilitado });
  const lista = useComissoes({ ...filtroPeriodo, usuarioId }, { enabled: habilitado });

  if (situacao.isLoading || (habilitado && resumo.isLoading)) return <PageSpinner label="Carregando comissões..." />;
  if (!periodo) {
    return <p className="text-sm text-ink-muted">Não foi possível carregar o dia de fechamento do financeiro.</p>;
  }

  const funcionarios = resumo.data ?? [];
  const totalPendente = funcionarios.reduce((soma, f) => soma + f.totalPendente, 0);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="A receber no 5º dia útil"
          subtitle={`Período de ${formatDate(periodo.inicio)} a ${formatDate(periodo.fim)} · dia de fechamento ${diaFechamento}`}
          action={
            <Badge tone="brand">
              <CalendarClock size={12} className="mr-1 inline" aria-hidden="true" />
              Pagamento previsto: {formatDate(periodo.pagamentoPrevisto)}
            </Badge>
          }
        />
        <CardBody className="flex flex-col gap-4">
          <Select
            label="Período"
            value={periodo.fim}
            onChange={(e) => {
              setFimEscolhido(e.target.value);
              setUsuarioId(undefined);
            }}
            hint="Cada período vai do dia seguinte ao fechamento anterior até o dia de fechamento. Dias úteis consideram segunda a sexta, sem feriados."
          >
            {periodos.map((p) => (
              <option key={p.fim} value={p.fim}>
                {formatDate(p.inicio)} a {formatDate(p.fim)} — paga em {formatDate(p.pagamentoPrevisto)}
              </option>
            ))}
          </Select>

          <p className="text-sm text-ink-muted">
            Total pendente no período: <strong className="text-ink">{formatCurrency(totalPendente)}</strong>
          </p>

          {funcionarios.length === 0 ? (
            <EmptyState title="Nenhuma comissão neste período" description="As comissões são geradas ao concluir e ao faturar as OS." />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {funcionarios.map((f) => (
                <LinhaResumo key={f.usuarioId} funcionario={f} ativo={usuarioId === f.usuarioId} onVer={() => setUsuarioId(usuarioId === f.usuarioId ? undefined : f.usuarioId)} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {usuarioId != null && (
        <ListaComissoes
          key={usuarioId}
          comissoes={lista.data ?? []}
          carregando={lista.isLoading}
          podePagar={podePagar}
        />
      )}
    </div>
  );
}

function LinhaResumo({ funcionario: f, ativo, onVer }: { funcionario: ResumoComissaoFuncionario; ativo: boolean; onVer: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{f.usuarioNome}</p>
        <p className="text-xs text-ink-muted">
          Mecânico {formatCurrency(f.totalMecanico)} · Consultor {formatCurrency(f.totalConsultor)} · Pago {formatCurrency(f.totalPago)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-ink-muted">A receber</p>
        <p className="text-lg font-bold text-ink">{formatCurrency(f.totalPendente)}</p>
      </div>
      <Button size="sm" variant="secondary" onClick={onVer}>
        {ativo ? 'Ocultar' : f.quantidadePendente > 0 ? `Ver ${f.quantidadePendente} pendente(s)` : 'Ver detalhes'}
      </Button>
    </li>
  );
}

function ListaComissoes({
  comissoes,
  carregando,
  podePagar,
}: {
  comissoes: ComissaoResponse[];
  carregando: boolean;
  podePagar: boolean;
}) {
  const pagar = usePagarComissoes();
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [forma, setForma] = useState<FormaPagamento>('PIX');

  if (carregando) return <PageSpinner label="Carregando comissões..." />;

  const pendentes = comissoes.filter((c) => c.status === 'PENDENTE');
  const visiveisSelecionadas = pendentes.filter((c) => selecionadas.includes(c.id));
  const idsSelecionados = visiveisSelecionadas.map((c) => c.id);
  const total = visiveisSelecionadas.reduce((soma, c) => soma + c.valor, 0);
  const alternar = (id: number) => setSelecionadas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  async function confirmar() {
    try {
      const r = await pagar.mutateAsync({ comissaoIds: idsSelecionados, formaPagamento: forma });
      toast.success(`${formatCurrency(r.valorTotal)} pagos a ${r.usuarioNome}.`);
      setSelecionadas([]);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível pagar as comissões.'));
    }
  }

  return (
    <Card>
      <CardHeader title="Comissões do funcionário" subtitle="Selecione as pendentes para pagar de uma vez" />
      <CardBody className="flex flex-col gap-4">
        <ul className="divide-y divide-border">
          {comissoes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 py-2 text-sm">
              {podePagar && c.status === 'PENDENTE' ? (
                <Checkbox checked={selecionadas.includes(c.id)} onChange={() => alternar(c.id)} aria-label={`Selecionar ${c.ordemServicoNumero}`} />
              ) : (
                <span className="w-5" />
              )}
              <span className="font-medium text-ink">{c.ordemServicoNumero}</span>
              <span className="text-ink-muted">{PAPEL_LABEL[c.papel]}</span>
              <span className="text-ink-muted">
                {formatCurrency(c.baseCalculo)} × {formatPercent(c.percentual)}
              </span>
              <span className="ml-auto font-semibold text-ink">{formatCurrency(c.valor)}</span>
              <Badge tone={c.status === 'PAGA' ? 'success' : 'neutral'}>
                {c.status === 'PAGA' ? `Paga em ${formatDate(c.dataPagamento)}` : 'Pendente'}
              </Badge>
            </li>
          ))}
        </ul>
        {podePagar && pendentes.length > 0 && (
          <div className="flex flex-wrap items-end justify-end gap-3 border-t border-border pt-4">
            <Select label="Forma de pagamento" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
            <Button onClick={confirmar} loading={pagar.isPending} disabled={idsSelecionados.length === 0}>
              Pagar selecionadas ({formatCurrency(total)})
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
