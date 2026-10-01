import { useState } from 'react';
import { Vault } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { useCaixaSessoes } from '@/hooks/useFinanceiro';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { caixaSessaoStatusMeta, metaFor } from '@/lib/statusMeta';
import type { CaixaSessaoResponse } from '@/api/types';
import { CaixaSessaoDetalheModal } from './CaixaSessaoDetalheModal';

export function CaixaSessoesTab() {
  const [page, setPage] = useState(0);
  const [selecionada, setSelecionada] = useState<CaixaSessaoResponse | null>(null);
  const { data, isLoading } = useCaixaSessoes({ page, size: 20, sort: 'abertoEm,desc' });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <DataTable<CaixaSessaoResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.id!}
          onRowClick={(row) => setSelecionada(row)}
          emptyIcon={Vault}
          emptyTitle="Nenhuma sessão de caixa registrada"
          columns={[
            { header: 'Identificador', render: (row) => row.identificador || `#${row.id}` },
            { header: 'Turno', render: (row) => row.turno || '—' },
            { header: 'Responsável', render: (row) => row.abertoPorUsuarioNome || '—', hideBelow: 'sm' },
            { header: 'Aberto em', render: (row) => formatDateTime(row.abertoEm), hideBelow: 'md' },
            {
              header: 'Status',
              render: (row) => {
                const meta = metaFor(caixaSessaoStatusMeta, row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            {
              header: 'Saldo atual',
              render: (row) => <span className="font-medium text-ink">{formatCurrency(row.saldoAtual?.total)}</span>,
            },
          ]}
        />
        {data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      <CaixaSessaoDetalheModal sessao={selecionada} onClose={() => setSelecionada(null)} />
    </div>
  );
}
