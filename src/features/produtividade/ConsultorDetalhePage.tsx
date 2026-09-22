import { useState, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Repeat, Wrench } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useProdutividadeConsultor } from '@/hooks/useProdutividade';
import type { OrcamentoEmitido, ServicoFechado } from '@/api/types';
import { orcamentoStatusMeta } from '@/lib/statusMeta';
import {
  formatCurrency,
  formatDateTime,
  formatDuracao,
  formatHorasDecimais,
  formatMesReferencia,
  getInitials,
} from '@/lib/formatters';
import { IndicadoresGrid, MesSelector } from './IndicadoresConsultor';
import { useMesReferencia } from './useMesReferencia';
import { useConsultorRestritoAoProprio } from './ProdutividadeAbas';

/**
 * Quem tem PRODUTIVIDADE_READ não necessariamente abre orçamento/OS (ex.: um
 * gerente só de relatórios) — sem a permissão o número vira texto em vez de
 * um link pra uma tela que só devolveria 403.
 */
function LinkSePermitido({ to, permissao, children }: { to: string; permissao: string; children: ReactNode }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  if (!hasPermission(permissao)) return <span className="font-semibold text-ink">{children}</span>;
  return (
    <Link to={to} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
      {children}
    </Link>
  );
}

const colunasOrcamentos: Column<OrcamentoEmitido>[] = [
  {
    header: 'Orçamento',
    render: (o) => (
      <LinkSePermitido to={`/orcamentos/${o.id}`} permissao="ORCAMENTO_READ">
        #{o.id}
      </LinkSePermitido>
    ),
  },
  { header: 'Cliente', render: (o) => o.clienteNome ?? '—' },
  { header: 'Entrada do veículo', render: (o) => formatDateTime(o.dataEntradaVeiculo), hideBelow: 'lg' },
  { header: 'Emissão', render: (o) => formatDateTime(o.dataEmissao), hideBelow: 'md' },
  { header: 'Resposta', render: (o) => formatDuracao(o.tempoRespostaMinutos), hideBelow: 'sm' },
  {
    header: 'Status',
    render: (o) => {
      const meta = orcamentoStatusMeta[o.status ?? ''];
      return meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : o.status;
    },
  },
  {
    header: 'Valor',
    render: (o) => <span className="font-medium text-ink">{formatCurrency(o.valorTotal)}</span>,
    className: 'text-right',
  },
];

const colunasServicos: Column<ServicoFechado>[] = [
  {
    header: 'OS',
    render: (s) => (
      <LinkSePermitido to={`/ordens-servico/${s.id}`} permissao="ORDEM_SERVICO_READ">
        {s.numero ?? `#${s.id}`}
      </LinkSePermitido>
    ),
  },
  {
    header: 'Cliente',
    render: (s) => (
      <div className="flex flex-wrap items-center gap-2">
        <span>{s.clienteNome ?? '—'}</span>
        {s.clienteRecorrente && (
          <Badge tone="success">
            <Repeat size={11} /> Recorrente
          </Badge>
        )}
      </div>
    ),
  },
  { header: 'Conclusão', render: (s) => formatDateTime(s.dataConclusao), hideBelow: 'md' },
  { header: 'Horas vendidas', render: (s) => formatHorasDecimais(s.horasVendidas), hideBelow: 'sm' },
  {
    header: 'Valor',
    render: (s) => <span className="font-medium text-ink">{formatCurrency(s.valorTotal)}</span>,
    className: 'text-right',
  },
];

/** Pressupõe PRODUTIVIDADE_READ — o gate fica na rota (ver router.tsx). */
export function ConsultorDetalhePage() {
  const { usuarioId } = useParams();
  const id = Number(usuarioId) || undefined;
  const navigate = useNavigate();
  const [mes, setMes] = useMesReferencia();
  const [aba, setAba] = useState<'orcamentos' | 'servicos'>('orcamentos');
  const proprioId = useConsultorRestritoAoProprio();
  // Consultor abrindo o link de um colega: nem consulta, cai no próprio detalhe.
  const idPermitido = proprioId ?? id;
  const { data, isLoading, isPlaceholderData, isError } = useProdutividadeConsultor(idPermitido, mes);

  if (proprioId && id !== proprioId) {
    return <Navigate to={`/produtividade/consultores/${proprioId}?mes=${mes}`} replace />;
  }

  // Sem ranking pra voltar quando a pessoa só vê os próprios números.
  const voltar = proprioId ? null : (
    <Button variant="secondary" onClick={() => navigate(`/produtividade?mes=${mes}`)}>
      <ArrowLeft size={16} /> Voltar
    </Button>
  );

  // Id não numérico na URL deixaria a consulta desligada e o spinner eterno.
  if (!id || isError) {
    return <EmptyState title="Consultor não encontrado" description="Verifique o link ou volte para o ranking." action={voltar} />;
  }
  if (isLoading || !data) return <PageSpinner label="Carregando indicadores do consultor..." />;

  const orcamentos = data.orcamentosEmitidos ?? [];
  const servicos = data.servicosFechados ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {getInitials(data.usuarioNome ?? '')}
            </span>
            {data.usuarioNome}
          </span>
        }
        subtitle={`Produtividade em ${formatMesReferencia(mes)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MesSelector mes={mes} onChange={setMes} />
            {voltar}
          </div>
        }
      />

      <IndicadoresGrid indicadores={data.indicadores ?? {}} atualizando={isPlaceholderData} />

      <Card className={clsx('pt-2 transition-opacity', isPlaceholderData && 'opacity-60')}>
        <div className="px-4 sm:px-5">
          <Tabs
            tabs={[
              { key: 'orcamentos', label: `Orçamentos emitidos (${orcamentos.length})` },
              { key: 'servicos', label: `Serviços fechados (${servicos.length})` },
            ]}
            active={aba}
            onChange={(k) => setAba(k as 'orcamentos' | 'servicos')}
          />
        </div>
        <TabPanel hidden={aba !== 'orcamentos'}>
          <DataTable
            columns={colunasOrcamentos}
            rows={orcamentos}
            rowKey={(o) => o.id!}
            emptyIcon={FileText}
            emptyTitle="Nenhum orçamento emitido neste mês"
          />
        </TabPanel>
        <TabPanel hidden={aba !== 'servicos'}>
          <DataTable
            columns={colunasServicos}
            rows={servicos}
            rowKey={(s) => s.id!}
            emptyIcon={Wrench}
            emptyTitle="Nenhuma OS concluída neste mês"
          />
        </TabPanel>
      </Card>
    </div>
  );
}
