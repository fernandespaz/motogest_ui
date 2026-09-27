import { useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, Wallet } from 'lucide-react';
import { FileArrowDown } from '@phosphor-icons/react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Field';
import { DataTable } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { useRelatorioCaixaDiario, useRelatorioCaixaPeriodo } from '@/hooks/useFinanceiro';
import { caixaApi } from '@/api/endpoints/caixa';
import { baixarExportacaoCaixa } from './caixaExport';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { caixaSessaoStatusMeta, metaFor } from '@/lib/statusMeta';
import { CaixaTipoLabel, CaixaValorCell } from '@/features/shared/CaixaMovimentoCells';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { CaixaMovimentoResponse, CaixaSessaoResponse, PontoDiarioCaixaResponse } from '@/api/types';

type SubAba = 'diario' | 'periodo';

export function CaixaRelatoriosTab() {
  const [subAba, setSubAba] = useState<SubAba>('diario');

  return (
    <div>
      <Tabs
        tabs={[
          { key: 'diario', label: 'Diário' },
          { key: 'periodo', label: 'Período' },
        ]}
        active={subAba}
        onChange={(k) => setSubAba(k as SubAba)}
      />
      <TabPanel hidden={subAba !== 'diario'}>
        <RelatorioDiario />
      </TabPanel>
      <TabPanel hidden={subAba !== 'periodo'}>
        <RelatorioPeriodo />
      </TabPanel>
    </div>
  );
}

function RelatorioDiario() {
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportando, setExportando] = useState(false);
  const { data: relatorio, isLoading } = useRelatorioCaixaDiario(data);

  async function exportar(formato: 'PDF' | 'XLSX') {
    setExportando(true);
    try {
      await baixarExportacaoCaixa(() => caixaApi.relatorios.diarioExportar(data, formato), `caixa-diario-${data}`, formato);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível exportar o relatório.'));
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <Button variant="secondary" size="sm" onClick={() => exportar('XLSX')} loading={exportando}>
          <FileArrowDown size={16} /> Excel
        </Button>
        <Button variant="secondary" size="sm" onClick={() => exportar('PDF')} loading={exportando}>
          <FileArrowDown size={16} /> PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={ArrowUpCircle} label="Entradas" value={formatCurrency(relatorio?.totalEntradas)} tone="success" index={0} />
        <StatCard icon={ArrowDownCircle} label="Saídas" value={formatCurrency(relatorio?.totalSaidas)} tone="danger" index={1} />
        <StatCard icon={Wallet} label="Saldo do dia" value={formatCurrency(relatorio?.saldoDia)} index={2} />
      </div>

      <Card>
        <CardHeader title="Sessões do dia" />
        <DataTable<CaixaSessaoResponse>
          loading={isLoading}
          rows={relatorio?.sessoes ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhuma sessão neste dia"
          columns={[
            { header: 'Identificador', render: (row) => row.identificador || `#${row.id}` },
            { header: 'Turno', render: (row) => row.turno || '—' },
            { header: 'Responsável', render: (row) => row.abertoPorUsuarioNome || '—', hideBelow: 'sm' },
            {
              header: 'Status',
              render: (row) => {
                const meta = metaFor(caixaSessaoStatusMeta, row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            { header: 'Saldo atual', render: (row) => formatCurrency(row.saldoAtual?.total) },
          ]}
        />
      </Card>

      <Card>
        <CardHeader title="Lançamentos do dia" />
        <DataTable<CaixaMovimentoResponse>
          loading={isLoading}
          rows={relatorio?.movimentos ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum lançamento neste dia"
          columns={[
            { header: 'Tipo', render: (row) => <CaixaTipoLabel tipo={row.tipo} /> },
            { header: 'Descrição', render: (row) => row.descricao || '—' },
            { header: 'Sessão', render: (row) => row.caixaSessaoIdentificador || '—', hideBelow: 'sm' },
            { header: 'Hora', render: (row) => formatDateTime(row.dataMovimento), hideBelow: 'md' },
            { header: 'Valor', render: (row) => <CaixaValorCell tipo={row.tipo} valor={row.valor} /> },
          ]}
        />
      </Card>
    </div>
  );
}

function RelatorioPeriodo() {
  const [inicio, setInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fim, setFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportando, setExportando] = useState(false);
  const { data: relatorio, isLoading } = useRelatorioCaixaPeriodo(inicio, fim);

  async function exportar(formato: 'PDF' | 'XLSX') {
    setExportando(true);
    try {
      await baixarExportacaoCaixa(
        () => caixaApi.relatorios.periodoExportar(inicio, fim, formato),
        `caixa-periodo-${inicio}-a-${fim}`,
        formato,
      );
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível exportar o relatório.'));
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input label="De" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <Input label="Até" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        <Button variant="secondary" size="sm" onClick={() => exportar('XLSX')} loading={exportando}>
          <FileArrowDown size={16} /> Excel
        </Button>
        <Button variant="secondary" size="sm" onClick={() => exportar('PDF')} loading={exportando}>
          <FileArrowDown size={16} /> PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={ArrowUpCircle} label="Entradas" value={formatCurrency(relatorio?.totalEntradas)} tone="success" index={0} />
        <StatCard icon={ArrowDownCircle} label="Saídas" value={formatCurrency(relatorio?.totalSaidas)} tone="danger" index={1} />
        <StatCard icon={Wallet} label="Saldo do período" value={formatCurrency(relatorio?.saldoPeriodo)} index={2} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-success">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-xs text-ink-muted">Dia de pico de entrada</p>
              <p className="text-lg font-semibold text-ink">{formatDate(relatorio?.diaDePicoDeEntrada) || '—'}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-danger">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-xs text-ink-muted">Dia de pico de saída</p>
              <p className="text-lg font-semibold text-ink">{formatDate(relatorio?.diaDePicoDeSaida) || '—'}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Evolução diária" />
        <DataTable<PontoDiarioCaixaResponse>
          loading={isLoading}
          rows={relatorio?.pontosDiarios ?? []}
          rowKey={(row) => row.data!}
          emptyTitle="Nenhum movimento no período"
          columns={[
            { header: 'Data', render: (row) => formatDate(row.data) },
            { header: 'Entradas', render: (row) => <span className="text-success">{formatCurrency(row.totalEntradas)}</span> },
            { header: 'Saídas', render: (row) => <span className="text-danger">{formatCurrency(row.totalSaidas)}</span> },
            { header: 'Saldo do dia', render: (row) => formatCurrency(row.saldoDia) },
          ]}
        />
      </Card>
    </div>
  );
}
