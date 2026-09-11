import { useState } from 'react';
import { Plus, Pencil, Trash2, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useProdutos, useDeleteProduto, useProdutosAbaixoDoMinimo } from '@/hooks/useProdutos';
import type { ProdutoResponse } from '@/api/types';
import { formatCurrency } from '@/lib/formatters';
import { ProdutoFormModal } from './ProdutoFormModal';
import { MovimentacaoModal } from './MovimentacaoModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

export function ProdutosPage() {
  const [page, setPage] = useState(0);
  const [modalProduto, setModalProduto] = useState<ProdutoResponse | null | undefined>(undefined);
  const [movProduto, setMovProduto] = useState<ProdutoResponse | null>(null);
  const [deleting, setDeleting] = useState<ProdutoResponse | null>(null);
  const [somenteAbaixoDoMinimo, setSomenteAbaixoDoMinimo] = useState(false);

  const { data, isLoading } = useProdutos({ page, size: 20 });
  const { data: abaixoDoMinimo } = useProdutosAbaixoDoMinimo();
  const deleteMutation = useDeleteProduto();

  const rows = somenteAbaixoDoMinimo ? abaixoDoMinimo ?? [] : data?.content ?? [];

  async function confirmDelete() {
    if (!deleting?.id) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Produto removido.');
      setDeleting(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o produto.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Produtos e Estoque"
        subtitle="Peças e produtos disponíveis para venda e uso em OS"
        action={
          <Button onClick={() => setModalProduto(null)}>
            <Plus size={18} /> Novo produto
          </Button>
        }
      />

      {!!abaixoDoMinimo?.length && (
        <button
          onClick={() => setSomenteAbaixoDoMinimo((v) => !v)}
          className={`mb-4 flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-colors ${
            somenteAbaixoDoMinimo ? 'border-amber-300 bg-amber-50 text-warning' : 'border-border bg-surface text-ink-muted hover:bg-surface-alt'
          }`}
        >
          <AlertTriangle size={16} />
          {abaixoDoMinimo.length} produto(s) abaixo do estoque mínimo
          <span className="ml-auto text-xs underline">{somenteAbaixoDoMinimo ? 'ver todos' : 'ver apenas estes'}</span>
        </button>
      )}

      <Card>
        <DataTable<ProdutoResponse>
          loading={isLoading}
          rows={rows}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum produto cadastrado"
          columns={[
            {
              header: 'Produto',
              render: (row) => (
                <div>
                  <p className="font-medium text-ink">{row.nome}</p>
                  <p className="text-xs text-ink-muted">{row.codigo}</p>
                </div>
              ),
            },
            { header: 'Preço venda', render: (row) => formatCurrency(row.precoVenda) },
            {
              header: 'Estoque',
              render: (row) => (
                <span className={row.abaixoDoMinimo ? 'font-medium text-danger' : ''}>
                  {row.quantidadeDisponivel ?? 0} disp. / {row.quantidadeEstoque ?? 0} total
                </span>
              ),
              hideBelow: 'sm',
            },
            {
              header: 'Status',
              render: (row) => (row.abaixoDoMinimo ? <Badge tone="danger">Abaixo do mínimo</Badge> : <Badge tone="success">OK</Badge>),
              hideBelow: 'md',
            },
            {
              header: '',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovProduto(row);
                    }}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                    aria-label="Movimentar"
                    title="Movimentar estoque"
                  >
                    <ArrowRightLeft size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalProduto(row);
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
          onRowClick={(row) => setModalProduto(row)}
        />
        {!somenteAbaixoDoMinimo && data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      <ProdutoFormModal open={modalProduto !== undefined} onClose={() => setModalProduto(undefined)} produto={modalProduto} />
      <MovimentacaoModal open={!!movProduto} onClose={() => setMovProduto(null)} produto={movProduto} />

      <ConfirmDialog
        open={!!deleting}
        title="Remover produto"
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
