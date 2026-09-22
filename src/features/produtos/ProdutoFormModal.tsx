import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Checkbox, Select } from '@/components/ui/Field';
import { useCreateProduto, useUpdateProduto } from '@/hooks/useProdutos';
import type { ProdutoRequest, ProdutoResponse } from '@/api/types';
import { PRODUTO_CATEGORIAS, PRODUTO_CATEGORIA_LABELS } from '@/lib/produtoCategoria';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const FORM_ID = 'produto-form';

const schema = z.object({
  codigo: z.string().min(1, 'Informe o código'),
  nome: z.string().min(1, 'Informe o nome'),
  descricao: z.string().optional(),
  unidadeMedida: z.string().optional(),
  precoCusto: z.coerce.number().optional(),
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
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { ativo: true } });

  useEffect(() => {
    if (open) {
      reset(
        produto
          ? {
              codigo: produto.codigo ?? '',
              nome: produto.nome ?? '',
              descricao: produto.descricao ?? '',
              unidadeMedida: produto.unidadeMedida ?? '',
              precoCusto: produto.precoCusto ?? undefined,
              precoVenda: produto.precoVenda ?? 0,
              estoqueMinimo: produto.estoqueMinimo ?? 0,
              categoria: produto.categoria ?? '',
              ativo: produto.ativo ?? true,
            }
          : { ativo: true, categoria: '' },
      );
    }
  }, [open, produto, reset]);

  async function onSubmit(values: FormValues) {
    // Categoria é opcional no backend ("" no select = nenhuma) — string vazia
    // não é um valor válido do enum, então vira undefined antes de enviar.
    const payload = { ...values, categoria: values.categoria || undefined } as ProdutoRequest;
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
          <Input label="Código" required error={errors.codigo?.message} {...register('codigo')} />
          <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />
          <Input label="Unidade de medida" placeholder="UN, PC, L..." {...register('unidadeMedida')} />
          <Input label="Preço de custo (R$)" type="number" step="0.01" {...register('precoCusto')} />
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
