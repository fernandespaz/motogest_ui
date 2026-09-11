import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileDown } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import type { OrdemServicoResponse, OrdemServicoStatus } from '@/api/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ordemServicoStatusMeta, metaFor } from '@/lib/statusMeta';
import { ordensServicoApi } from '@/api/endpoints/ordensServico';
import { openBlobInNewTab } from '@/lib/downloadBlob';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const statusOptions: OrdemServicoStatus[] = ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_PECA', 'CONCLUIDA', 'CANCELADA', 'ENTREGUE'];

export function OrdensServicoPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<OrdemServicoStatus | ''>('');
  const navigate = useNavigate();

  const { data, isLoading } = useOrdensServico({ page, size: 20, status: status || undefined });

  async function baixarPdf(row: OrdemServicoResponse) {
    try {
      const blob = await ordensServicoApi.pdf(row.id!);
      openBlobInNewTab(blob, `os-${row.numero ?? row.id}.pdf`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível gerar o PDF.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Núcleo operacional da oficina"
        action={
          <Button onClick={() => navigate('/ordens-servico/nova')}>
            <Plus size={18} /> Nova OS
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrdemServicoStatus | '');
            setPage(0);
          }}
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
            { header: 'Número', render: (row) => <span className="font-medium text-ink">{row.numero ?? row.id}</span> },
            { header: 'Cliente', render: (row) => `${row.clienteNome ?? ''} — ${row.veiculoPlaca ?? ''}` },
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
