import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { format, startOfMonth } from 'date-fns';
import { AlertTriangle, CheckCircle2, Landmark, RotateCcw, Scale, Vault } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Field';
import { useAuditoriaCaixa } from '@/hooks/useFinanceiro';
import { baixarCsv } from '@/lib/csv';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { caixaSessaoStatusMeta, metaFor } from '@/lib/statusMeta';
import type { AuditoriaCaixaResponse } from '@/api/types';

type SessaoAuditada = NonNullable<AuditoriaCaixaResponse['sessoes']>[number];

const hoje = () => format(new Date(), 'yyyy-MM-dd');
const inicioDoMes = () => format(startOfMonth(new Date()), 'yyyy-MM-dd');

function textoDivergencia(valor: number | undefined | null) {
  if (valor == null) return '—';
  if (valor === 0) return 'Sem divergência';
  return `${valor > 0 ? 'Sobrou' : 'Faltou'} ${formatCurrency(Math.abs(valor))}`;
}

/**
 * Conferência consolidada dos caixas do período: o que cada turno movimentou, onde o valor contado não bateu,
 * quem reabriu um caixa fechado e o dinheiro que passou pelo financeiro sem caixa aberto (baixas de contas).
 */
export function CaixaAuditoriaTab() {
  const [inicio, setInicio] = useState(inicioDoMes);
  const [fim, setFim] = useState(hoje);
  const periodoValido = !!inicio && !!fim && inicio <= fim;
  const { data, isLoading, isError } = useAuditoriaCaixa(inicio, fim);

  const sessoes = useMemo(() => data?.sessoes ?? [], [data]);
  const totais = data?.totais;
  const semSessao = data?.semSessao;

  function exportar() {
    baixarCsv(`auditoria-caixa-${inicio}-a-${fim}`, [
      ['Caixa', 'Turno', 'Responsável', 'Aberto em', 'Fechado em', 'Status', 'Entradas', 'Saídas', 'Divergência', 'Justificativa', 'Reaberturas'],
      ...sessoes.map((s) => [
        s.identificador,
        s.turno,
        s.abertoPorNome,
        formatDateTime(s.abertoEm),
        s.fechadoEm ? formatDateTime(s.fechadoEm) : '',
        metaFor(caixaSessaoStatusMeta, s.status).label,
        s.entradas,
        s.saidas,
        s.divergencia,
        s.justificativaDivergencia,
        s.reaberturas,
      ]),
    ]);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <Input label="De" type="date" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} />
          <Input label="Até" type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
          <div className="ml-auto">
            <Button variant="secondary" onClick={exportar} disabled={sessoes.length === 0}>
              Exportar CSV
            </Button>
          </div>
        </CardBody>
      </Card>

      {!periodoValido && <p className="text-sm text-ink-muted">Informe um período válido (a data final não pode ser anterior à inicial).</p>}
      {isError && <p className="text-sm text-danger">Não foi possível carregar a auditoria deste período.</p>}

      {totais && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador icon={Vault} rotulo="Caixas no período" valor={String(totais.sessoes ?? 0)} detalhe="turnos abertos no período" />
          <Indicador
            icon={(totais.sessoesComDivergencia ?? 0) > 0 ? AlertTriangle : CheckCircle2}
            rotulo="Com divergência"
            valor={String(totais.sessoesComDivergencia ?? 0)}
            detalhe={`${formatCurrency(totais.divergenciaAbsoluta)} de diferença no total`}
            alerta={(totais.sessoesComDivergencia ?? 0) > 0}
          />
          <Indicador
            icon={Scale}
            rotulo="Saldo das divergências"
            valor={formatCurrency(totais.divergenciaLiquida)}
            detalhe={(totais.divergenciaLiquida ?? 0) < 0 ? 'faltou dinheiro' : (totais.divergenciaLiquida ?? 0) > 0 ? 'sobrou dinheiro' : 'tudo conferido'}
            alerta={(totais.divergenciaLiquida ?? 0) < 0}
          />
          <Indicador icon={RotateCcw} rotulo="Reaberturas" valor={String(totais.reaberturas ?? 0)} detalhe="caixas fechados que voltaram a abrir" />
        </div>
      )}

      <Card>
        <CardHeader title="Caixas do período" subtitle="Quanto cada turno movimentou e como foi a conferência" />
        <DataTable<SessaoAuditada>
          loading={isLoading && periodoValido}
          rows={sessoes}
          rowKey={(row) => row.id!}
          emptyIcon={Vault}
          emptyTitle="Nenhum caixa aberto neste período"
          columns={[
            { header: 'Caixa', render: (row) => <span className="font-medium text-ink">{row.identificador}</span> },
            { header: 'Responsável', render: (row) => row.abertoPorNome || '—', hideBelow: 'md' },
            { header: 'Aberto em', render: (row) => formatDateTime(row.abertoEm), hideBelow: 'md' },
            {
              header: 'Status',
              render: (row) => {
                const meta = metaFor(caixaSessaoStatusMeta, row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            { header: 'Entradas', render: (row) => formatCurrency(row.entradas), hideBelow: 'sm' },
            { header: 'Saídas', render: (row) => formatCurrency(row.saidas), hideBelow: 'sm' },
            {
              header: 'Conferência',
              render: (row) => (
                <div>
                  <span className={clsx('text-sm font-medium', row.divergencia ? 'text-danger' : 'text-ink')}>{textoDivergencia(row.divergencia)}</span>
                  {row.justificativaDivergencia && <p className="max-w-xs truncate text-xs text-ink-muted">“{row.justificativaDivergencia}”</p>}
                  {(row.reaberturas ?? 0) > 0 && <p className="text-xs text-ink-muted">Reaberto {row.reaberturas}x</p>}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Reaberturas" subtitle="Quem reabriu um caixa já fechado, e por quê" />
          {(data?.reaberturas ?? []).length === 0 ? (
            <p className="px-5 pb-5 text-sm text-ink-muted">Nenhum caixa foi reaberto neste período.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data!.reaberturas!.map((r, i) => (
                <li key={`${r.sessaoId}-${i}`} className="px-5 py-3">
                  <p className="text-sm font-medium text-ink">{r.identificador}</p>
                  <p className="text-xs text-ink-muted">
                    {r.usuarioNome ?? '—'} · {formatDateTime(r.ocorridoEm)}
                  </p>
                  <p className="text-sm text-ink">{r.motivo ? `“${r.motivo}”` : 'Sem motivo informado'}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Movimentos sem caixa aberto" subtitle="Baixas de contas a pagar e a receber — não entram em nenhum turno" />
          <CardBody className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <Landmark size={22} aria-hidden="true" />
            </div>
            {semSessao && (semSessao.quantidade ?? 0) > 0 ? (
              <div className="text-sm text-ink">
                <p>
                  <strong>{semSessao.quantidade}</strong> {semSessao.quantidade === 1 ? 'movimento' : 'movimentos'} no período
                </p>
                <p className="text-ink-muted">
                  {formatCurrency(semSessao.entradas)} recebidos · {formatCurrency(semSessao.saidas)} pagos
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Nenhuma baixa de conta fora de um turno neste período.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Indicador({
  icon: Icon,
  rotulo,
  valor,
  detalhe,
  alerta,
}: {
  icon: LucideIcon;
  rotulo: string;
  valor: string;
  detalhe: string;
  alerta?: boolean;
}) {
  return (
    <Card className={clsx(alerta && 'border-danger/50 bg-danger/5')}>
      <CardBody className="flex items-start gap-4">
        <div
          className={clsx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            alerta ? 'bg-red-50 text-danger dark:bg-red-900/30' : 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
          )}
        >
          <Icon size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-ink-muted">{rotulo}</p>
          <p className="truncate text-2xl font-bold leading-tight text-ink">{valor}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{detalhe}</p>
        </div>
      </CardBody>
    </Card>
  );
}
