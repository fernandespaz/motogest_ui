import { useState } from 'react';
import { Plus, Pencil, Trash2, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { useProdutos, useDeleteProduto, useProdutosAbaixoDoMinimo } from '@/hooks/useProdutos';
import type { ProdutoCategoria, ProdutoResponse } from '@/api/types';
import { formatCurrency } from '@/lib/formatters';
import { PRODUTO_CATEGORIAS, PRODUTO_CATEGORIA_LABELS, produtoCategoriaLabel } from '@/lib/produtoCategoria';
import { ProdutoFormModal } from './ProdutoFormModal';
import { MovimentacaoModal } from './MovimentacaoModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const selectCompacto =
  'h-8 shrink-0 rounded-lg border border-border bg-surface-alt px-2.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-400';

export function ProdutosPage() {
  const [page, setPage] = useState(0);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<ProdutoCategoria | ''>('');
  const [modalProduto, setModalProduto] = useState<ProdutoResponse | null | undefined>(undefined);
  const [movProduto, setMovProduto] = useState<ProdutoResponse | null>(null);
  const [deleting, setDeleting] = useState<ProdutoResponse | null>(null);
  const [somenteAbaixoDoMinimo, setSomenteAbaixoDoMinimo] = useState(false);

  const { data, isLoading } = useProdutos({ page, size: 20, busca: busca || undefined, categoria: categoria || undefined });
  const { data: abaixoDoMinimo } = useProdutosAbaixoDoMinimo({ categoria: categoria || undefined });
  const deleteMutation = useDeleteProduto();

  const rows = somenteAbaixoDoMinimo ? abaixoDoMinimo ?? [] : data?.content ?? [];

  function selecionarCategoria(novaCategoria: ProdutoCategoria | '') {
    setCategoria(novaCategoria);
    setPage(0);
  }

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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={busca}
          onChange={(value) => {
            setBusca(value);
            setPage(0);
          }}
          placeholder="Buscar por nome ou código..."
          className="w-full max-w-xs"
        />

        <select
          value={categoria}
          onChange={(e) => selecionarCategoria(e.target.value as ProdutoCategoria | '')}
          className={selectCompacto}
        >
          <option value="">Todas as categorias</option>
          {PRODUTO_CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {PRODUTO_CATEGORIA_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      {!!abaixoDoMinimo?.length && (
        <button
          onClick={() => setSomenteAbaixoDoMinimo((v) => !v)}
          className={`mb-4 flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
            somenteAbaixoDoMinimo
              ? 'bg-brand-600 text-white'
              : 'border border-border bg-surface text-ink-muted hover:bg-surface-alt'
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
            {
              header: 'Categoria',
              render: (row) => <Badge tone="neutral">{produtoCategoriaLabel(row.categoria)}</Badge>,
              hideBelow: 'md',
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
