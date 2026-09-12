import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Bike } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InfoDialog } from '@/components/ui/InfoDialog';
import { useClientes, useDeleteCliente } from '@/hooks/useClientes';
import type { ClienteResponse } from '@/api/types';
import { formatDocumento, formatPhone, getInitials } from '@/lib/formatters';
import { ClienteFormModal } from './ClienteFormModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

export function ClientesPage() {
  const [page, setPage] = useState(0);
  const [busca, setBusca] = useState('');
  const [modalCliente, setModalCliente] = useState<ClienteResponse | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ClienteResponse | null>(null);
  const [notFoundDismissed, setNotFoundDismissed] = useState(true);

  const { data, isLoading, isFetching } = useClientes({ page, size: 20, busca: busca || undefined });
  const deleteMutation = useDeleteCliente();

  // Only pops up once per completed search, and only when the user actually typed
  // something — an empty tenant on first load shouldn't be treated as "not found".
  useEffect(() => {
    if (busca && !isFetching && data && data.totalElements === 0) {
      setNotFoundDismissed(false);
    }
  }, [busca, isFetching, data]);

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
        subtitle={
          data
            ? `${data.totalElements} ${data.totalElements === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}, com os veículos vinculados`
            : 'Cadastro de pessoas físicas e jurídicas, com os veículos vinculados'
        }
        action={
          <Button onClick={() => setModalCliente(null)}>
            <Plus size={18} /> Novo cliente
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput
          placeholder="Buscar por nome, CPF/CNPJ ou placa..."
          value={busca}
          onChange={(value) => {
            setBusca(value);
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
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {getInitials(row.nome ?? '?')}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{row.nome}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      {formatDocumento(row.documento ?? '', row.tipoPessoa === 'PJ' ? 'PJ' : 'PF')}
                    </p>
                  </div>
                </div>
              ),
            },
            { header: 'Tipo', render: (row) => <Badge>{row.tipoPessoa === 'PJ' ? 'Jurídica' : 'Física'}</Badge>, hideBelow: 'sm' },
            {
              header: 'Contato',
              render: (row) => (row.telefone ? formatPhone(row.telefone) : row.email || '—'),
              hideBelow: 'md',
            },
            {
              header: 'Veículos',
              render: (row) =>
                row.veiculos && row.veiculos.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {row.veiculos.map((v) => (
                      <Badge key={v.id}>
                        <span className="font-mono">{v.placa}</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                    <Bike size={13} /> Nenhum
                  </span>
                ),
              hideBelow: 'md',
            },
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

      <InfoDialog
        open={!notFoundDismissed}
        title="Nada encontrado"
        description="Nenhum dado encontrado para o cliente ou veículo informado."
        onClose={() => setNotFoundDismissed(true)}
      />
    </div>
  );
}
