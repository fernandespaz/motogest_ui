import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { SearchInput } from '@/components/ui/SearchInput';
import { useTodosServicos, useDeleteServico } from '@/hooks/useServicos';
import type { ServicoResponse } from '@/api/types';
import { formatCurrency } from '@/lib/formatters';
import { ServicoFormModal } from './ServicoFormModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const TAMANHO_PAGINA = 20;

export function ServicosPage() {
  const [page, setPage] = useState(0);
  const [busca, setBusca] = useState('');
  const [modalServico, setModalServico] = useState<ServicoResponse | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ServicoResponse | null>(null);

  // GET /servicos não tem filtro de busca no backend (só pageable, ver
  // useTodosServicos em useServicos.ts) — useTodosServicos busca o catálogo
  // inteiro uma vez e a busca/paginação abaixo são inteiramente locais, sobre
  // os dados já carregados (mesma solução já usada em OrcamentosPage pro
  // mesmo tipo de limitação do backend).
  const { data: todos, isLoading } = useTodosServicos();
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return todos ?? [];
    return (todos ?? []).filter((s) => (s.nome ?? '').toLowerCase().includes(termo));
  }, [todos, busca]);
  const totalElements = filtrados.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / TAMANHO_PAGINA));
  const paginaAtual = Math.min(page, totalPages - 1);
  const rows = filtrados.slice(paginaAtual * TAMANHO_PAGINA, (paginaAtual + 1) * TAMANHO_PAGINA);
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

      <div className="mb-4">
        <SearchInput
          value={busca}
          onChange={(value) => {
            setBusca(value);
            setPage(0);
          }}
          placeholder="Buscar serviço por nome..."
          className="w-full max-w-xs"
        />
      </div>

      <Card>
        <DataTable<ServicoResponse>
          loading={isLoading}
          rows={rows}
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
                  <IconActionButton
                    icon={PencilSimple}
                    label="Editar"
                    tone="brand"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalServico(row);
                    }}
                  />
                  <IconActionButton
                    icon={Trash}
                    label="Remover"
                    tone="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(row);
                    }}
                  />
                </div>
              ),
            },
          ]}
          onRowClick={(row) => setModalServico(row)}
        />
        {todos && <Pagination page={paginaAtual} totalPages={totalPages} totalElements={totalElements} onChange={setPage} />}
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
