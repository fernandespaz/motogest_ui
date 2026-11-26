import { useState } from 'react';
import { Plus, Car } from 'lucide-react';
import { PencilSimple } from '@phosphor-icons/react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { useClientes, useDeleteCliente } from '@/hooks/useClientes';
import type { ClienteResponse } from '@/api/types';
import { formatDocumento, formatPhone, getInitials } from '@/lib/formatters';
import { ClienteFormModal } from './ClienteFormModal';
import { ClientePerfilModal } from './ClientePerfilModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

export function ClientesPage() {
  const [page, setPage] = useState(0);
  const [busca, setBusca] = useState('');
  const [modalCliente, setModalCliente] = useState<ClienteResponse | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ClienteResponse | null>(null);
  // Clique na linha abre o perfil (leitura + ações); o formulário de edição é uma ação explícita dentro dele.
  const [perfil, setPerfil] = useState<ClienteResponse | null>(null);

  const { data, isLoading } = useClientes({ page, size: 20, busca: busca || undefined });
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
        subtitle={
          data && busca
            ? `${data.totalElements} ${data.totalElements === 1 ? 'resultado' : 'resultados'} para "${busca}"`
            : data
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
          // Busca sem resultado aparece aqui mesmo, na lista — antes abria um diálogo que exigia um clique a cada tentativa.
          emptyTitle={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          emptyDescription={
            busca ? `Nada encontrado para "${busca}". Confira o nome, o CPF/CNPJ ou a placa.` : 'Cadastre o primeiro cliente da oficina para começar.'
          }
          emptyAction={
            busca ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => setBusca('')}>
                  Ver todos os clientes
                </Button>
                <Button onClick={() => setModalCliente(null)}>
                  <Plus size={18} /> Novo cliente
                </Button>
              </div>
            ) : (
              <Button onClick={() => setModalCliente(null)}>
                <Plus size={18} /> Cadastrar primeiro cliente
              </Button>
            )
          }
          columns={[
            {
              header: 'Nome',
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {getInitials(row.nome ?? '?')}
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 font-medium text-ink">
                      <span className="truncate">{row.nome}</span>
                      {/* Tipo e Status eram colunas quase constantes ("Física", "Ativo"): agora só o que foge do comum aparece. */}
                      {row.tipoPessoa === 'PJ' && <Badge>Jurídica</Badge>}
                      {row.ativo === false && <Badge tone="neutral">Inativo</Badge>}
                    </p>
                    <p className="font-mono text-xs text-ink-muted">
                      {formatDocumento(row.documento ?? '', row.tipoPessoa === 'PJ' ? 'PJ' : 'PF')}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              header: 'Contato',
              render: (row) => <span className="whitespace-nowrap">{row.telefone ? formatPhone(row.telefone) : row.email || '—'}</span>,
              hideBelow: 'md',
            },
            {
              header: 'Veículos',
              render: (row) =>
                row.veiculos && row.veiculos.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {row.veiculos.map((v) => (
                      // Só a placa, em neutro: a categoria (A/B/C) é dado de hora técnica, não um alerta — ver no cadastro do veículo.
                      <Badge key={v.id} tone="neutral">
                        <span className="font-mono" title={[v.marca, v.modelo, v.categoria && `categoria ${v.categoria}`].filter(Boolean).join(' · ') || undefined}>
                          {v.placa}
                        </span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                    <Car size={13} /> Nenhum
                  </span>
                ),
              hideBelow: 'md',
            },
            {
              header: '',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <IconActionButton
                    icon={PencilSimple}
                    label="Editar"
                    tone="brand"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalCliente(row);
                    }}
                  />
                </div>
              ),
            },
          ]}
          onRowClick={(row) => setPerfil(row)}
        />
        {data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      <ClientePerfilModal
        cliente={perfil}
        onClose={() => setPerfil(null)}
        onEditar={(c) => {
          setPerfil(null);
          setModalCliente(c);
        }}
        onRemover={(c) => {
          setPerfil(null);
          setDeleting(c);
        }}
      />

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
