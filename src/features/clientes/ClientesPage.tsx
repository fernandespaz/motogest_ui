import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useClientes, useDeleteCliente } from '@/hooks/useClientes';
import type { ClienteResponse } from '@/api/types';
import { formatDocumento } from '@/lib/formatters';
import { ClienteFormModal } from './ClienteFormModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

export function ClientesPage() {
  const [page, setPage] = useState(0);
  const [nome, setNome] = useState('');
  const [modalCliente, setModalCliente] = useState<ClienteResponse | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ClienteResponse | null>(null);

  const { data, isLoading } = useClientes({ page, size: 20, nome: nome || undefined });
  const deleteMutation = useDeleteCliente();

  async function confirmDelete() {
    if (!deleting?.id) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Cliente removido.');
      setDeleting(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o cliente.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro de pessoas físicas e jurídicas"
        action={
          <Button onClick={() => setModalCliente(null)}>
            <Plus size={18} /> Novo cliente
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Buscar por nome..."
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setPage(0);
          }}
        />
      </div>

      <Card>
        <DataTable<ClienteResponse>
          loading={isLoading}
          rows={data?.content ?? []}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum cliente cadastrado"
          emptyDescription="Cadastre o primeiro cliente da oficina para começar."
          columns={[
            {
              header: 'Nome',
              render: (row) => (
                <div>
                  <p className="font-medium text-ink">{row.nome}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDocumento(row.documento ?? '', row.tipoPessoa === 'PJ' ? 'PJ' : 'PF')}
                  </p>
                </div>
              ),
            },
            { header: 'Tipo', render: (row) => <Badge>{row.tipoPessoa === 'PJ' ? 'Jurídica' : 'Física'}</Badge>, hideBelow: 'sm' },
            { header: 'Contato', render: (row) => row.telefone || row.email || '—', hideBelow: 'md' },
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
                      setModalCliente(row);
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
          onRowClick={(row) => setModalCliente(row)}
        />
        {data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      <ClienteFormModal open={modalCliente !== undefined} onClose={() => setModalCliente(undefined)} cliente={modalCliente} />

      <ConfirmDialog
        open={!!deleting}
        title="Remover cliente"
        description={`Tem certeza que deseja remover "${deleting?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
