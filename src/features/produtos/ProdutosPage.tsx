import { useState } from 'react';
import { Plus, Pencil, Trash2, ArrowRightLeft, AlertTriangle, Package, X, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatCard } from '@/components/ui/StatCard';
import { useProdutos, useDeleteProduto, useProdutosAbaixoDoMinimo } from '@/hooks/useProdutos';
import { useAuthStore } from '@/store/authStore';
import type { ProdutoCategoria, ProdutoResponse } from '@/api/types';
import { formatCurrency } from '@/lib/formatters';
import { PRODUTO_CATEGORIAS, produtoCategoriaLabel, produtoCategoriaIcon } from '@/lib/produtoCategoria';
import { ProdutoFormModal } from './ProdutoFormModal';
import { MovimentacaoModal } from './MovimentacaoModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

/** Ladrilho de categoria — grade de navegação inicial (nenhuma categoria escolhida ainda). */
function CategoriaTile({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-3 text-center transition-colors hover:border-brand-300 hover:bg-surface-alt"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <Icon size={18} />
      </span>
      <span className="text-[11px] font-medium leading-tight text-ink-muted">{label}</span>
    </motion.button>
  );
}

export function ProdutosPage() {
  const [page, setPage] = useState(0);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<ProdutoCategoria | ''>('');
  const [modalProduto, setModalProduto] = useState<ProdutoResponse | null | undefined>(undefined);
  const [movProduto, setMovProduto] = useState<ProdutoResponse | null>(null);
  const [deleting, setDeleting] = useState<ProdutoResponse | null>(null);
  const [somenteAbaixoDoMinimo, setSomenteAbaixoDoMinimo] = useState(false);

  // Ver a lista é ESTOQUE_READ (já exigido pra abrir esta rota — ver nav.ts);
  // criar/editar/remover/movimentar é ESTOQUE_WRITE no backend, e o Consultor
  // Técnico (ESTOQUE_READ + ESTOQUE_RESERVAR, sem WRITE) não tem essa permissão.
  // Sem esse gate a tela mostrava as ações de escrita pra qualquer perfil com
  // acesso de leitura, que só descobria a restrição no 403 do backend.
  const podeEditar = useAuthStore((s) => s.hasPermission)('ESTOQUE_WRITE');

  const { data, isLoading } = useProdutos({ page, size: 20, busca: busca || undefined, categoria: categoria || undefined });
  const { data: abaixoDoMinimo } = useProdutosAbaixoDoMinimo({ categoria: categoria || undefined });
  const deleteMutation = useDeleteProduto();

  const rows = somenteAbaixoDoMinimo ? abaixoDoMinimo ?? [] : data?.content ?? [];

  function selecionarCategoria(novaCategoria: ProdutoCategoria | '') {
    setCategoria(novaCategoria);
    setPage(0);
  }

  const IconCategoriaAtiva = categoria ? produtoCategoriaIcon(categoria) : null;

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
          podeEditar && (
            <Button onClick={() => setModalProduto(null)}>
              <Plus size={18} /> Novo produto
            </Button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard index={0} icon={Package} label="Produtos cadastrados" value={String(data?.totalElements ?? 0)} />
        <StatCard
          index={1}
          icon={AlertTriangle}
          label={somenteAbaixoDoMinimo ? 'Vendo apenas: abaixo do mínimo' : 'Abaixo do estoque mínimo'}
          value={String(abaixoDoMinimo?.length ?? 0)}
          tone={abaixoDoMinimo?.length ? 'danger' : 'success'}
          active={somenteAbaixoDoMinimo}
          onClick={abaixoDoMinimo?.length ? () => setSomenteAbaixoDoMinimo((v) => !v) : undefined}
        />
      </div>

      <div className="mb-5 flex flex-col gap-3">
        <SearchInput
          value={busca}
          onChange={(value) => {
            setBusca(value);
            setPage(0);
          }}
          placeholder="Buscar por nome ou código..."
          className="w-full max-w-xs"
        />

        {/* Navegar por categoria é o caminho principal (grade de ladrilhos,
            clicável); depois de escolher uma, a grade some e dá lugar a um
            único indicador compacto — mostrar as 15 categorias inteiras o
            tempo todo (grade ou chips) polui a tela sem necessidade quando o
            filtro já está decidido. */}
        <AnimatePresence mode="wait" initial={false}>
          {categoria === '' ? (
            <motion.div
              key="grade"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
            >
              {PRODUTO_CATEGORIAS.map((c) => (
                <CategoriaTile
                  key={c}
                  icon={produtoCategoriaIcon(c)}
                  label={produtoCategoriaLabel(c)}
                  onClick={() => selecionarCategoria(c)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.button
              key="ativa"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => selecionarCategoria('')}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-600 bg-brand-600 py-2 pl-3.5 pr-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {IconCategoriaAtiva && <IconCategoriaAtiva size={16} />}
              {produtoCategoriaLabel(categoria)}
              <span className="ml-0.5 flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-xs">
                <X size={12} /> trocar
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <Card>
        <DataTable<ProdutoResponse>
          loading={isLoading}
          rows={rows}
          rowKey={(row) => row.id!}
          emptyTitle="Nenhum produto cadastrado"
          columns={[
            {
              header: 'Produto',
              render: (row) => {
                const Icon = produtoCategoriaIcon(row.categoria);
                return (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{row.nome}</p>
                      <p className="text-xs text-ink-muted">{row.codigo}</p>
                    </div>
                  </div>
                );
              },
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
            ...(podeEditar
              ? ([
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
                ] satisfies Column<ProdutoResponse>[])
              : []),
          ]}
          onRowClick={podeEditar ? (row) => setModalProduto(row) : undefined}
        />
        {!somenteAbaixoDoMinimo && data && (
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        )}
      </Card>

      {podeEditar && (
        <>
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
        </>
      )}
    </div>
  );
}
