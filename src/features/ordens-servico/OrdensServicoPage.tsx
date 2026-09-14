import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import type { OrdemServicoResponse, OrdemServicoStatus } from '@/api/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ordemServicoStatusMeta, metaFor } from '@/lib/statusMeta';
import { buildOrdemServicoPdfBlob } from './ordemServicoPdf';
import { openPdfInNewTab } from '@/lib/downloadBlob';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const statusOptions: OrdemServicoStatus[] = [
  'ABERTA',
  'AGUARDANDO_APROVACAO',
  'APROVADA',
  'EM_ANDAMENTO',
  'AGUARDANDO_PECA',
  'PAUSADA',
  'CONCLUIDA',
  'CANCELADA',
  'ENTREGUE',
];

export function OrdensServicoPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<OrdemServicoStatus | ''>('');
  const [numero, setNumero] = useState('');
  const navigate = useNavigate();

  const { data, isLoading } = useOrdensServico({
    page,
    size: 20,
    status: status || undefined,
    numero: numero || undefined,
  });

  async function baixarPdf(row: OrdemServicoResponse) {
    try {
      await openPdfInNewTab(() => buildOrdemServicoPdfBlob(row), `os-${row.numero ?? row.id}.pdf`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível gerar o PDF.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Núcleo operacional da oficina"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput
          value={numero}
          onChange={(value) => {
            setNumero(value);
            setPage(0);
          }}
          placeholder="Buscar por número da OS..."
          className="w-full max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrdemServicoStatus | '');
            setPage(0);
          }}
          className="max-w-xs"
        >
          <option value="">Todos os status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {metaFor(ordemServicoStatusMeta, s).label}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <DataTable<OrdemServicoResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhuma Ordem de Serviço encontrada"
          columns={[
            {
              header: 'Número',
              render: (row) => (
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  {row.tempoEstourado && (
                    <AlertTriangle size={14} className="shrink-0 text-danger" aria-label="Tempo estourado" />
                  )}
                  {row.numero ?? row.id}
                </span>
              ),
            },
            { header: 'Cliente', render: (row) => `${row.clienteNome ?? ''} — ${row.veiculoPlaca ?? ''}` },
            { header: 'Técnico', render: (row) => row.usuarioResponsavelNome || '-', hideBelow: 'md' },
            { header: 'Abertura', render: (row) => formatDate(row.dataAbertura), hideBelow: 'sm' },
            { header: 'Valor', render: (row) => formatCurrency(row.valorTotal), hideBelow: 'md' },
            {
              header: 'Status',
              render: (row) => {
                const meta = metaFor(ordemServicoStatusMeta, row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            {
              header: '',
              render: (row) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    baixarPdf(row);
                  }}
                  className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                  title="Baixar PDF"
                >
                  <FileDown size={16} />
                </button>
              ),
            },
          ]}
          onRowClick={(row) => navigate(`/ordens-servico/${row.id}`)}
        />
        {data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>
    </div>
  );
}
