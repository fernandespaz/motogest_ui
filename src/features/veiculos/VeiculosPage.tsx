import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useVeiculos, useDeleteVeiculo } from '@/hooks/useVeiculos';
import type { VeiculoResponse } from '@/api/types';
import { VeiculoFormModal } from './VeiculoFormModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

export function VeiculosPage() {
  const [page, setPage] = useState(0);
  const [modalVeiculo, setModalVeiculo] = useState<VeiculoResponse | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<VeiculoResponse | null>(null);

  const { data, isLoading } = useVeiculos({ page, size: 20 });
  const deleteMutation = useDeleteVeiculo();

  async function confirmDelete() {
    if (!deleting?.id) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Veículo removido.');
      setDeleting(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o veículo.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Veículos"
        subtitle="Veículos vinculados aos clientes da oficina"
        action={
          <Button onClick={() => setModalVeiculo(null)}>
            <Plus size={18} /> Novo veículo
          </Button>
        }
      />

      <Card>
        <DataTable<VeiculoResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum veículo cadastrado"
          emptyDescription="Cadastre o primeiro veículo vinculado a um cliente."
          columns={[
            {
              header: 'Placa',
              render: (row) => <span className="font-medium text-ink">{row.placa}</span>,
            },
            { header: 'Marca / Modelo', render: (row) => `${row.marca ?? ''} ${row.modelo ?? ''}`.trim() || '—' },
            { header: 'Cliente', render: (row) => row.clienteNome ?? '—', hideBelow: 'sm' },
            { header: 'KM atual', render: (row) => (row.kmAtual != null ? row.kmAtual.toLocaleString('pt-BR') : '—'), hideBelow: 'md' },
            {
              header: '',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalVeiculo(row);
                    }}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                    aria-label="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(row);
                    }}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger"
                    aria-label="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          onRowClick={(row) => setModalVeiculo(row)}
        />
        {data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      <VeiculoFormModal open={modalVeiculo !== undefined} onClose={() => setModalVeiculo(undefined)} veiculo={modalVeiculo} />

      <ConfirmDialog
        open={!!deleting}
        title="Remover veículo"
        description={`Tem certeza que deseja remover a placa "${deleting?.placa}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
