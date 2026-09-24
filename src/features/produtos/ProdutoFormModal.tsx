import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Checkbox, Select } from '@/components/ui/Field';
import { useCreateProduto, useUpdateProduto } from '@/hooks/useProdutos';
import type { ProdutoRequest, ProdutoResponse } from '@/api/types';
import { PRODUTO_CATEGORIAS, PRODUTO_CATEGORIA_LABELS } from '@/lib/produtoCategoria';
import { PRODUTO_UNIDADES, PRODUTO_UNIDADE_LABELS } from '@/lib/produtoUnidade';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const FORM_ID = 'produto-form';

// Código curto e só numérico, sem precisar consultar produtos existentes: os
// últimos 8 dígitos do timestamp mudam a cada milissegundo, então duas
// submissões manuais do formulário nunca geram o mesmo valor na prática.
function gerarCodigoProduto(): string {
  return String(Date.now()).slice(-8);
}

const schema = z.object({
  codigo: z.string().min(1, 'Informe o código'),
  nome: z.string().min(1, 'Informe o nome'),
  descricao: z.string().optional(),
  unidadeMedida: z.string().optional(),
  precoCusto: z.coerce.number().optional(),
  // Percentual usado apenas para calcular precoVenda a partir de precoCusto —
  // não existe no backend (ver ProdutoRequest em openapi.json), então é
  // removido do payload antes do envio.
  margemLucro: z.coerce.number().optional(),
  precoVenda: z.coerce.number({ invalid_type_error: 'Informe o preço de venda' }).min(0),
  estoqueMinimo: z.coerce.number({ invalid_type_error: 'Informe o estoque mínimo' }).min(0),
  categoria: z.string().optional(),
  ativo: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProdutoFormModal({
  open,
  onClose,
  produto,
}: {
  open: boolean;
  onClose: () => void;
  produto?: ProdutoResponse | null;
}) {
  const isEditing = !!produto;
  const createMutation = useCreateProduto();
  const updateMutation = useUpdateProduto();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { ativo: true } });

  // Evita que o efeito de recálculo abaixo dispare no primeiro render após o
  // reset() (produto já vem com precoCusto/precoVenda preenchidos, então
  // custo+margem recém-calculada ficariam "não-nulos" imediatamente) — sem
  // essa guarda, só abrir um produto existente para editar o nome, por
  // exemplo, já reescreveria precoVenda com um valor arredondado que pode
  // divergir do salvo por erro de ponto flutuante. Só edições reais do
  // usuário em precoCusto/margemLucro devem recalcular o preço de venda.
  const skipProximoRecalculo = useRef(true);

  useEffect(() => {
    if (open) {
      skipProximoRecalculo.current = true;
      reset(
        produto
          ? {
              codigo: produto.codigo ?? '',
              nome: produto.nome ?? '',
              descricao: produto.descricao ?? '',
              unidadeMedida: produto.unidadeMedida ?? '',
              precoCusto: produto.precoCusto ?? undefined,
              // Margem inicial estimada a partir do custo/venda já salvos, só para
              // dar um ponto de partida editável — não é um valor vindo do backend.
              margemLucro:
                produto.precoCusto && produto.precoCusto > 0 && produto.precoVenda != null
                  ? Number((((produto.precoVenda - produto.precoCusto) / produto.precoCusto) * 100).toFixed(2))
                  : undefined,
              precoVenda: produto.precoVenda ?? 0,
              estoqueMinimo: produto.estoqueMinimo ?? 0,
              categoria: produto.categoria ?? '',
              ativo: produto.ativo ?? true,
            }
          : { ativo: true, categoria: '', codigo: gerarCodigoProduto() },
      );
    }
  }, [open, produto, reset]);

  const precoCusto = watch('precoCusto');
  const margemLucro = watch('margemLucro');

  useEffect(() => {
    if (skipProximoRecalculo.current) {
      skipProximoRecalculo.current = false;
      return;
    }
    if (precoCusto == null || margemLucro == null || Number.isNaN(precoCusto) || Number.isNaN(margemLucro)) return;
    const precoVenda = precoCusto * (1 + margemLucro / 100);
    setValue('precoVenda', Number(precoVenda.toFixed(2)), { shouldValidate: true });
  }, [precoCusto, margemLucro, setValue]);

  async function onSubmit(values: FormValues) {
    // Categoria é opcional no backend ("" no select = nenhuma) — string vazia
    // não é um valor válido do enum, então vira undefined antes de enviar.
    // margemLucro é só um auxiliar de UI para calcular precoVenda — não existe no backend.
    const { margemLucro: _margemLucro, ...rest } = values;
    const payload = { ...rest, categoria: values.categoria || undefined } as ProdutoRequest;
    try {
      if (isEditing && produto?.id != null) {
        await updateMutation.mutateAsync({ id: produto.id, payload });
        toast.success('Produto atualizado.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Produto cadastrado.');
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o produto.'));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  // Produtos cadastrados antes do dropdown podem ter uma unidade fora da lista
  // curada — mantém o valor original como opção extra em vez de escondê-lo.
  const unidadeLegada =
    produto?.unidadeMedida && !PRODUTO_UNIDADES.includes(produto.unidadeMedida) ? produto.unidadeMedida : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar produto' : 'Novo produto'}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* readOnly, não disabled: react-hook-form exclui campos disabled do
              submit, o que apagaria o código gerado ao criar um produto. */}
          <Input
            label="Código"
            required
            hint="Gerado automaticamente, não pode ser editado."
            error={errors.codigo?.message}
            readOnly
            className="cursor-not-allowed bg-surface-alt text-ink-muted"
            {...register('codigo')}
          />
          <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />
          <Select label="Unidade de medida" {...register('unidadeMedida')}>
            <option value="">Sem unidade</option>
            {unidadeLegada && <option value={unidadeLegada}>{unidadeLegada}</option>}
            {PRODUTO_UNIDADES.map((unidade) => (
              <option key={unidade} value={unidade}>
                {PRODUTO_UNIDADE_LABELS[unidade]}
              </option>
            ))}
          </Select>
          <Input label="Preço de custo (R$)" type="number" step="0.01" {...register('precoCusto')} />
          <Input
            label="Margem de lucro (%)"
            type="number"
            step="0.01"
            hint="Calcula o preço de venda a partir do preço de custo."
            {...register('margemLucro')}
          />
          <Input label="Preço de venda (R$)" type="number" step="0.01" required error={errors.precoVenda?.message} {...register('precoVenda')} />
          <Input label="Estoque mínimo" type="number" step="0.01" required error={errors.estoqueMinimo?.message} {...register('estoqueMinimo')} />
          <Select label="Categoria" {...register('categoria')}>
            <option value="">Sem categoria</option>
            {PRODUTO_CATEGORIAS.map((categoria) => (
              <option key={categoria} value={categoria}>
                {PRODUTO_CATEGORIA_LABELS[categoria]}
              </option>
            ))}
          </Select>
        </div>
        <Textarea label="Descrição" {...register('descricao')} />
        {isEditing && <Checkbox label="Produto ativo" {...register('ativo')} />}
      </form>
    </Modal>
  );
}
