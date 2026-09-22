import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageSpinner } from '@/components/ui/Spinner';
import { Select } from '@/components/ui/Field';
import { useProdutividadeConsultores } from '@/hooks/useProdutividade';
import { PERMISSAO_GERENCIAR_HORA_TECNICA } from '@/hooks/useHoraTecnica';
import { useAuthStore } from '@/store/authStore';
import type { ProdutividadeConsultorResponse } from '@/api/types';
import { formatCurrency, formatDuracao, formatMesReferencia, formatPercent, getInitials } from '@/lib/formatters';
import { BarraPercentual, IndicadoresGrid, MesSelector } from './IndicadoresConsultor';
import { useMesReferencia } from './useMesReferencia';

type Ordenacao = 'faturado' | 'conversao' | 'ticket' | 'resposta' | 'produtividade' | 'fidelizacao';

// Tempo de resposta é o único indicador em que menor é melhor.
const CRITERIOS: Record<Ordenacao, { label: string; valor: (c: ProdutividadeConsultorResponse) => number | undefined; crescente?: boolean }> = {
  faturado: { label: 'Valor faturado', valor: (c) => c.indicadores?.valorFaturado },
  conversao: { label: 'Taxa de conversão', valor: (c) => c.indicadores?.taxaConversaoPercentual },
  ticket: { label: 'Ticket médio', valor: (c) => c.indicadores?.ticketMedio },
  resposta: { label: 'Tempo de resposta', valor: (c) => c.indicadores?.tempoMedioRespostaMinutos, crescente: true },
  produtividade: { label: 'Produtividade (horas)', valor: (c) => c.indicadores?.produtividadeHorasPercentual },
  fidelizacao: { label: 'Fidelização', valor: (c) => c.indicadores?.indiceFidelizacaoPercentual },
};

function ordenar(consultores: ProdutividadeConsultorResponse[], criterio: Ordenacao) {
  const { valor, crescente } = CRITERIOS[criterio];
  return [...consultores].sort((a, b) => {
    // A linha "Sem consultor registrado" (usuarioId null, histórico anterior
    // ao registro de consultor) fica sempre no fim — não é uma pessoa pra ranquear.
    if ((a.usuarioId == null) !== (b.usuarioId == null)) return a.usuarioId == null ? 1 : -1;
    const va = valor(a);
    const vb = valor(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return crescente ? va - vb : vb - va;
  });
}

function ConsultorNome({ consultor }: { consultor: ProdutividadeConsultorResponse }) {
  const semConsultor = consultor.usuarioId == null;
  return (
    <div className="flex items-center gap-3">
      <div
        className={clsx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          semConsultor
            ? 'bg-surface-alt text-ink-muted'
            : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
        )}
      >
        {semConsultor ? '?' : getInitials(consultor.usuarioNome ?? '')}
      </div>
      <div className="min-w-0">
        <p className={clsx('truncate font-medium', semConsultor ? 'text-ink-muted' : 'text-ink')}>{consultor.usuarioNome}</p>
        <p className="text-xs text-ink-muted">
          {consultor.indicadores?.orcamentosEmitidos ?? 0} orçamento(s) · {consultor.indicadores?.servicosFechados ?? 0} OS
        </p>
      </div>
    </div>
  );
}

function CelulaPercentual({ valor }: { valor: number | undefined | null }) {
  return (
    <div className="flex min-w-[6rem] flex-col gap-1">
      <span className="font-medium text-ink">{formatPercent(valor)}</span>
      <BarraPercentual valor={valor} />
    </div>
  );
}

/** Pressupõe PRODUTIVIDADE_READ — o gate fica na rota (ver router.tsx). */
export function ProdutividadeConsultoresPage() {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [mes, setMes] = useMesReferencia();
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('faturado');
  const { data, isLoading, isPlaceholderData } = useProdutividadeConsultores(mes);

  const consultores = useMemo(() => ordenar(data?.consultores ?? [], ordenacao), [data, ordenacao]);

  const colunas: Column<ProdutividadeConsultorResponse>[] = [
    { header: 'Consultor', render: (c) => <ConsultorNome consultor={c} /> },
    { header: 'Conversão', render: (c) => <CelulaPercentual valor={c.indicadores?.taxaConversaoPercentual} /> },
    {
      header: 'Ticket médio',
      render: (c) => (c.indicadores?.ticketMedio == null ? '—' : formatCurrency(c.indicadores.ticketMedio)),
      hideBelow: 'sm',
    },
    { header: 'Resposta', render: (c) => formatDuracao(c.indicadores?.tempoMedioRespostaMinutos), hideBelow: 'md' },
    {
      header: 'Produtividade',
      render: (c) => <CelulaPercentual valor={c.indicadores?.produtividadeHorasPercentual} />,
      hideBelow: 'lg',
    },
    {
      header: 'Fidelização',
      render: (c) => <CelulaPercentual valor={c.indicadores?.indiceFidelizacaoPercentual} />,
      hideBelow: 'lg',
    },
    {
      header: 'Faturado',
      render: (c) => <span className="font-semibold text-ink">{formatCurrency(c.indicadores?.valorFaturado)}</span>,
      className: 'text-right',
    },
    {
      header: '',
      render: (c) => (c.usuarioId == null ? null : <ChevronRight size={16} className="text-ink-muted" />),
      className: 'w-8',
    },
  ];

  const semHoraTecnica = data && data.horasTecnicasDisponiveis == null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Produtividade dos consultores"
        subtitle="Indicadores calculados automaticamente a partir dos orçamentos e ordens de serviço"
        action={<MesSelector mes={mes} onChange={setMes} />}
      />

      {isLoading || !data ? (
        <PageSpinner label="Calculando indicadores..." />
      ) : (
        <>
          {semHoraTecnica && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertTriangle size={18} className="shrink-0" />
              <span className="flex-1">
                A produtividade em horas depende das horas disponíveis da oficina, que vêm da configuração da hora técnica.
              </span>
              {hasPermission(PERMISSAO_GERENCIAR_HORA_TECNICA) && (
                <Link to="/hora-tecnica" className="font-semibold underline-offset-2 hover:underline">
                  Configurar hora técnica
                </Link>
              )}
            </div>
          )}

          <section aria-label="Total da oficina" className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Total da oficina</h2>
            <IndicadoresGrid indicadores={data.totalOficina ?? {}} atualizando={isPlaceholderData} />
          </section>

          <Card>
            <CardHeader
              title="Ranking de consultores"
              subtitle={`${formatMesReferencia(mes)} · clique em um consultor para ver o detalhe`}
              action={
                <div className="w-52">
                  <Select
                    aria-label="Ordenar por"
                    value={ordenacao}
                    onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
                  >
                    {Object.entries(CRITERIOS).map(([chave, { label }]) => (
                      <option key={chave} value={chave}>
                        Ordenar por: {label}
                      </option>
                    ))}
                  </Select>
                </div>
              }
            />
            <div className={clsx('transition-opacity', isPlaceholderData && 'opacity-60')}>
              <DataTable
                columns={colunas}
                rows={consultores}
                rowKey={(c) => c.usuarioId ?? 'sem-consultor'}
                emptyIcon={TrendingUp}
                emptyTitle="Nenhum movimento neste mês"
                emptyDescription="Assim que orçamentos forem emitidos ou OS concluídas, os indicadores aparecem aqui."
                onRowClick={(c) => {
                  if (c.usuarioId != null) navigate(`/produtividade/consultores/${c.usuarioId}?mes=${mes}`);
                }}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
