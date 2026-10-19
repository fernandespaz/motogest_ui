import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Minus, Plus as PlusIcon, Trash } from '@phosphor-icons/react';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { SearchInput } from '@/components/ui/SearchInput';
import { useProdutos } from '@/hooks/useProdutos';
import { totalDaVenda, useVenderProdutos } from '@/hooks/useVendaCaixa';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { FORMAS_PAGAMENTO } from '@/lib/formaPagamento';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import type { CaixaSessaoResponse, FormaPagamento, ProdutoResponse } from '@/api/types';

interface ItemCarrinho {
  produto: ProdutoResponse;
  quantidade: number;
}

const disponivel = (p: ProdutoResponse) => p.quantidadeDisponivel ?? p.quantidadeEstoque ?? 0;

/**
 * Venda de balcão de produtos do estoque. Só produtos com saldo disponível entram no carrinho e a
 * quantidade nunca passa do disponível; a baixa de estoque e a entrada no caixa acontecem juntas
 * (ver `useVenderProdutos`), então a venda fica rastreável pelo histórico do produto e pelo caixa.
 */
export function VenderProdutoModal({
  open,
  sessao,
  onClose,
}: {
  open: boolean;
  sessao: CaixaSessaoResponse;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [forma, setForma] = useState<FormaPagamento>('DINHEIRO');
  const buscaDebounced = useDebouncedValue(busca, 300);
  const vender = useVenderProdutos();

  const { data, isFetching } = useProdutos({ busca: buscaDebounced || undefined, size: 8 }, { enabled: open });
  const produtos = (data?.content ?? []).filter((p) => p.ativo !== false);

  const total = totalDaVenda(
    carrinho.map((i) => ({ quantidade: i.quantidade, precoUnitario: i.produto.precoVenda ?? 0 })),
  );

  function fechar() {
    setBusca('');
    setCarrinho([]);
    setForma('DINHEIRO');
    onClose();
  }

  function adicionar(produto: ProdutoResponse) {
    setCarrinho((atual) => {
      const existente = atual.find((i) => i.produto.id === produto.id);
      if (!existente) return [...atual, { produto, quantidade: 1 }];
      return atual.map((i) =>
        i === existente ? { ...i, quantidade: Math.min(i.quantidade + 1, disponivel(produto)) } : i,
      );
    });
  }

  function alterarQuantidade(id: number | undefined, delta: number) {
    setCarrinho((atual) =>
      atual.map((i) =>
        i.produto.id === id
          ? { ...i, quantidade: Math.max(1, Math.min(i.quantidade + delta, disponivel(i.produto))) }
          : i,
      ),
    );
  }

  async function confirmar() {
    try {
      await vender.mutateAsync({
        sessaoId: sessao.id!,
        sessaoIdentificador: sessao.identificador,
        formaPagamento: forma,
        itens: carrinho.map((i) => ({
          produtoId: i.produto.id!,
          nome: i.produto.nome ?? `Produto ${i.produto.id}`,
          quantidade: i.quantidade,
          precoUnitario: i.produto.precoVenda ?? 0,
        })),
      });
      toast.success('Venda registrada.');
      fechar();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível registrar a venda.'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Vender produtos"
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            Total <span className="text-lg font-semibold text-ink">{formatCurrency(total)}</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={fechar} disabled={vender.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={confirmar}
              loading={vender.isPending}
              disabled={carrinho.length === 0}
            >
              Confirmar venda
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section aria-label="Produtos em estoque" className="flex flex-col gap-3">
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar produto por nome ou código..." />
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {produtos.length === 0 && (
              <li className="p-4 text-center text-sm text-ink-muted">
                {isFetching ? 'Buscando...' : 'Nenhum produto encontrado'}
              </li>
            )}
            {produtos.map((p) => {
              const saldo = disponivel(p);
              const noCarrinho = carrinho.find((i) => i.produto.id === p.id)?.quantidade ?? 0;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{p.nome}</p>
                    <p className="text-xs text-ink-muted">
                      {p.codigo ? `${p.codigo} · ` : ''}
                      {saldo} em estoque · {formatCurrency(p.precoVenda)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => adicionar(p)}
                    disabled={saldo <= noCarrinho || !(p.precoVenda && p.precoVenda > 0)}
                    aria-label={`Adicionar ${p.nome}`}
                  >
                    <Plus size={16} /> {saldo <= 0 ? 'Sem estoque' : !(p.precoVenda && p.precoVenda > 0) ? 'Sem preço' : 'Adicionar'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Carrinho" className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {carrinho.length === 0 && (
              <li className="p-4 text-center text-sm text-ink-muted">Adicione produtos para iniciar a venda</li>
            )}
            {carrinho.map((i) => (
              <li key={i.produto.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{i.produto.nome}</p>
                  <p className="text-xs text-ink-muted">
                    {formatCurrency(i.produto.precoVenda)} · {formatCurrency(i.quantidade * (i.produto.precoVenda ?? 0))}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <IconActionButton
                    type="button"
                    icon={Minus}
                    label={`Diminuir ${i.produto.nome}`}
                    tone="neutral"
                    onClick={() => alterarQuantidade(i.produto.id, -1)}
                  />
                  <span className="w-8 text-center text-sm font-medium" aria-label={`Quantidade de ${i.produto.nome}`}>
                    {i.quantidade}
                  </span>
                  <IconActionButton
                    type="button"
                    icon={PlusIcon}
                    label={`Aumentar ${i.produto.nome}`}
                    tone="neutral"
                    onClick={() => alterarQuantidade(i.produto.id, 1)}
                    disabled={i.quantidade >= disponivel(i.produto)}
                  />
                  <IconActionButton
                    type="button"
                    icon={Trash}
                    label={`Remover ${i.produto.nome}`}
                    tone="danger"
                    onClick={() => setCarrinho((atual) => atual.filter((x) => x !== i))}
                  />
                </div>
              </li>
            ))}
          </ul>
          <Select
            label="Forma de pagamento"
            value={forma}
            onChange={(e) => setForma(e.target.value as FormaPagamento)}
          >
            {FORMAS_PAGAMENTO.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </section>
      </div>
    </Modal>
  );
}
