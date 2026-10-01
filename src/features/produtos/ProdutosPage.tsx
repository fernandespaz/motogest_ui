import { useState } from 'react';
import { Plus, AlertTriangle, Package } from 'lucide-react';
import { PencilSimple, Trash, ArrowsLeftRight, Warning, SquaresFour, DotsThreeCircle, type Icon } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatCard } from '@/components/ui/StatCard';
import { useProdutos, useDeleteProduto, useProdutosAbaixoDoMinimo } from '@/hooks/useProdutos';
import { useAuthStore } from '@/store/authStore';
import type { ProdutoCategoria, ProdutoResponse } from '@/api/types';
import { formatCurrency } from '@/lib/formatters';
import {
  PRODUTO_CATEGORIAS_PRINCIPAIS,
  PRODUTO_CATEGORIAS_SECUNDARIAS,
  produtoCategoriaLabel,
  produtoCategoriaIcon,
} from '@/lib/produtoCategoria';
import { ProdutoImagem } from './ProdutoImagem';
import { ProdutoFormModal } from './ProdutoFormModal';
import { MovimentacaoModal } from './MovimentacaoModal';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

/** Filtro de categoria — sempre visível; clicar na categoria ativa limpa o filtro. */
function CategoriaFilterButton({
  icon: CategoriaIcon,
  label,
  active,
  expanded,
  onClick,
}: {
  icon: Icon;
  label: string;
  active: boolean;
  /** Só para o botão "Outros", que abre um painel em vez de filtrar direto. */
  expanded?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={expanded === undefined ? active : undefined}
      aria-expanded={expanded}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={clsx(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors',
        active
          ? 'border-brand-600 bg-brand-600 text-white shadow-card'
          : 'border-border bg-surface text-ink hover:border-brand-300 hover:bg-surface-alt',
      )}
    >
      <span
        className={clsx(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          active ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300',
        )}
      >
        <CategoriaIcon size={18} weight="fill" />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </motion.button>
  );
}

interface ProdutoCardProps {
  produto: ProdutoResponse;
  podeEditar: boolean;
  onOpen: () => void;
  onMovimentar: () => void;
  onRemover: () => void;
}

/**
 * Cartão do produto. A arte do topo é a foto enviada (2:1, mostrada inteira numa faixa baixa) ou, enquanto o produto não tem foto, o ícone da categoria.
 */
function ProdutoCard({ produto, podeEditar, onOpen, onMovimentar, onRemover }: ProdutoCardProps) {
  const CategoriaIcon = produtoCategoriaIcon(produto.categoria);
  const abaixo = !!produto.abaixoDoMinimo;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card
        data-testid="produto-card"
        onClick={podeEditar ? onOpen : undefined}
        className={clsx(
          'flex h-full flex-col overflow-hidden transition-shadow',
          podeEditar && 'cursor-pointer hover:shadow-md',
        )}
      >
        <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 to-surface-alt text-brand-600 dark:from-brand-900/40 dark:to-surface-alt dark:text-brand-300">
          <ProdutoImagem
            produtoId={produto.id}
            imagemUrl={produto.imagemUrl}
            alt={`Foto de ${produto.nome}`}
            fallback={<CategoriaIcon size={64} weight="duotone" aria-hidden />}
          />
          <span className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
            {produtoCategoriaLabel(produto.categoria)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="min-w-0">
            <p className="line-clamp-2 font-semibold leading-snug text-ink">{produto.nome}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{produto.codigo}</p>
          </div>

          {/* Preço e ações na mesma linha — evita uma faixa só de botões no rodapé do cartão. */}
          <div className="mt-auto flex items-center justify-between gap-2">
            <p className="text-lg font-bold text-ink">{formatCurrency(produto.precoVenda)}</p>
            {podeEditar && (
              <div className="flex shrink-0 gap-1">
                <IconActionButton
                  icon={ArrowsLeftRight}
                  label="Movimentar estoque"
                  tone="brand"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMovimentar();
                  }}
                />
                <IconActionButton
                  icon={PencilSimple}
                  label="Editar"
                  tone="brand"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                  }}
                />
                <IconActionButton
                  icon={Trash}
                  label="Remover"
                  tone="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemover();
                  }}
                />
              </div>
            )}
          </div>

          {/* Estoque é o dado que o balconista mais consulta: número grande e
              colorido pelo status, com o total físico (inclui reservado) ao lado. */}
          <div
            className={clsx(
              'flex items-center justify-between gap-3 rounded-lg px-3 py-1.5',
              abaixo ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20',
            )}
          >
            <div className="flex items-baseline gap-2">
              <span className={clsx('text-2xl font-bold leading-none', abaixo ? 'text-danger' : 'text-success')}>
                {produto.quantidadeDisponivel ?? 0}
              </span>
              <span className="text-sm font-medium text-ink">disponível</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-ink">{produto.quantidadeEstoque ?? 0} em estoque</p>
              <p className={clsx('text-xs font-semibold', abaixo ? 'text-danger' : 'text-success')}>
                {abaixo ? 'Abaixo do mínimo' : 'OK'}
              </p>
            </div>
          </div>

        </div>
      </Card>
    </motion.div>
  );
}

function ProdutoCardSkeleton() {
  return <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface-alt" />;
}

export function ProdutosPage() {
  const [page, setPage] = useState(0);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<ProdutoCategoria | ''>('');
  const [modalProduto, setModalProduto] = useState<ProdutoResponse | null | undefined>(undefined);
  const [movProduto, setMovProduto] = useState<ProdutoResponse | null>(null);
  const [deleting, setDeleting] = useState<ProdutoResponse | null>(null);
  const [somenteAbaixoDoMinimo, setSomenteAbaixoDoMinimo] = useState(false);
  const [outrosAberto, setOutrosAberto] = useState(false);
  const categoriaSecundariaAtiva = categoria !== '' && PRODUTO_CATEGORIAS_SECUNDARIAS.includes(categoria);

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

  function selecionarCategoria(novaCategoria: ProdutoCategoria) {
    setCategoria((atual) => (atual === novaCategoria ? '' : novaCategoria));
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

        {/* As 7 categorias de maior giro ficam em destaque; "Outros" abre as demais
            (o backend filtra por uma categoria só, então não dá pra agrupá-las
            numa consulta — por isso o painel lista cada uma). */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Filtrar por categoria">
          {PRODUTO_CATEGORIAS_PRINCIPAIS.map((c) => (
            <CategoriaFilterButton
              key={c}
              icon={produtoCategoriaIcon(c)}
              label={produtoCategoriaLabel(c)}
              active={categoria === c}
              onClick={() => selecionarCategoria(c)}
            />
          ))}
          <CategoriaFilterButton
            icon={DotsThreeCircle}
            label="Outros"
            active={outrosAberto || categoriaSecundariaAtiva}
            expanded={outrosAberto}
            onClick={() => setOutrosAberto((v) => !v)}
          />
        </div>

        {outrosAberto && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Outras categorias">
            {PRODUTO_CATEGORIAS_SECUNDARIAS.map((c) => {
              const CategoriaIcon = produtoCategoriaIcon(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={categoria === c}
                  onClick={() => selecionarCategoria(c)}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    categoria === c
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-border bg-surface text-ink-muted hover:border-brand-300 hover:text-ink',
                  )}
                >
                  <CategoriaIcon size={14} weight="fill" />
                  {produtoCategoriaLabel(c)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2 text-ink">
        {somenteAbaixoDoMinimo ? (
          <Warning size={20} weight="fill" className="text-danger" />
        ) : (
          <SquaresFour size={20} weight="fill" className="text-brand-600" />
        )}
        <h2 className="text-base font-semibold">{somenteAbaixoDoMinimo ? 'Abaixo do estoque mínimo' : 'Todos os produtos'}</h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <ProdutoCardSkeleton key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={Package} title="Nenhum produto cadastrado" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => (
            <ProdutoCard
              key={row.id}
              produto={row}
              podeEditar={podeEditar}
              onOpen={() => setModalProduto(row)}
              onMovimentar={() => setMovProduto(row)}
              onRemover={() => setDeleting(row)}
            />
          ))}
        </div>
      )}

      {!somenteAbaixoDoMinimo && data && (
        <Card className="mt-4">
          <Pagination page={data.pageNumber} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} />
        </Card>
      )}

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
