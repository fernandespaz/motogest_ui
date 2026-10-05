import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { useNotasFiscais } from '@/hooks/useFiscal';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import type { NfseResponse } from '@/api/types';
import { AmbienteBadge, NfseStatusBadge } from './NfseBadges';
import { NfseDetalheModal } from './NfseDetalheModal';
import { useAlerta } from './useAlerta';
import { useErroComoAlerta } from './useErroComoAlerta';

const TAMANHO_PAGINA = 20;

export function NotasFiscaisTab() {
  const [page, setPage] = useState(0);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const { data, isLoading, isError, error, refetch } = useNotasFiscais({ page, size: TAMANHO_PAGINA });
  const { mostrar, dialogo } = useAlerta();

  useErroComoAlerta(isError, error, 'Não foi possível carregar as notas', mostrar);

  const colunas: Column<NfseResponse>[] = [
    {
      header: 'Nota',
      render: (n) => (
        <div>
          <p className="font-medium text-ink">{n.numero ? `nº ${n.numero}` : 'Sem número'}</p>
          <p className="text-xs text-ink-muted">OS {n.ordemServicoNumero ?? `#${n.ordemServicoId}`}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (n) => (
        <div className="flex flex-col items-start gap-1">
          <NfseStatusBadge status={n.status} />
          <AmbienteBadge ambiente={n.ambiente} />
        </div>
      ),
    },
    { header: 'Valor', hideBelow: 'sm', render: (n) => formatCurrency(n.valorServicos) },
    { header: 'Solicitada em', hideBelow: 'md', render: (n) => formatDateTime(n.dataSolicitacao) },
    {
      header: '',
      className: 'text-right',
      render: (n) => (
        <Button variant="secondary" size="sm" onClick={() => n.id != null && setDetalheId(n.id)}>
          Detalhes
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card>
        <DataTable
          columns={colunas}
          rows={data?.content ?? []}
          rowKey={(n) => n.id ?? 0}
          loading={isLoading}
          emptyIcon={FileText}
          emptyTitle="Nenhuma nota emitida"
          emptyDescription="As notas aparecem aqui depois que você emite a NFS-e de uma Ordem de Serviço faturada."
          emptyAction={
            isError ? (
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Tentar de novo
              </Button>
            ) : undefined
          }
          onRowClick={(n) => n.id != null && setDetalheId(n.id)}
        />
        {data && data.totalPages > 1 && (
          <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>
      <NfseDetalheModal notaId={detalheId} onClose={() => setDetalheId(null)} mostrar={mostrar} />
      {dialogo}
    </>
  );
}
