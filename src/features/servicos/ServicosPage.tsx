import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useServicos, useDeleteServico } from '@/hooks/useServicos';
import type { ServicoResponse } from '@/api/types';
import { formatCurrency } from '@/lib/formatters';
import { ServicoFormModal } from './ServicoFormModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

export function ServicosPage() {
  const [page, setPage] = useState(0);
  const [modalServico, setModalServico] = useState<ServicoResponse | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ServicoResponse | null>(null);

  const { data, isLoading } = useServicos({ page, size: 20 });
  const deleteMutation = useDeleteServico();

  async function confirmDelete() {
    if (!deleting?.id) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Serviço removido.');
      setDeleting(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o serviço.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Catálogo de Serviços"
        subtitle="Serviços oferecidos pela oficina"
        action={
          <Button onClick={() => setModalServico(null)}>
            <Plus size={18} /> Novo serviço
          </Button>
        }
      />

      <Card>
        <DataTable<ServicoResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum serviço cadastrado"
          columns={[
            { header: 'Nome', render: (row) => <span className="font-medium text-ink">{row.nome}</span> },
            { header: 'Preço', render: (row) => formatCurrency(row.preco) },
            { header: 'Duração', render: (row) => (row.duracaoMinutos ? `${row.duracaoMinutos} min` : '—'), hideBelow: 'sm' },
            {
              header: 'Status',
              render: (row) => <Badge tone={row.ativo === false ? 'neutral' : 'success'}>{row.ativo === false ? 'Inativo' : 'Ativo'}</Badge>,
              hideBelow: 'sm',
            },
            {
              header: '',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalServico(row);
                    }}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(row);
                    }}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          onRowClick={(row) => setModalServico(row)}
        />
        {data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      <ServicoFormModal open={modalServico !== undefined} onClose={() => setModalServico(undefined)} servico={modalServico} />

      <ConfirmDialog
        open={!!deleting}
        title="Remover serviço"
        description={`Tem certeza que deseja remover "${deleting?.nome}"?`}
        confirmLabel="Remover"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
