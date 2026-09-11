import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Checkbox } from '@/components/ui/Field';
import { useCreateProduto, useUpdateProduto } from '@/hooks/useProdutos';
import type { ProdutoResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const schema = z.object({
  codigo: z.string().min(1, 'Informe o código'),
  nome: z.string().min(1, 'Informe o nome'),
  descricao: z.string().optional(),
  unidadeMedida: z.string().optional(),
  precoCusto: z.coerce.number().optional(),
  precoVenda: z.coerce.number({ invalid_type_error: 'Informe o preço de venda' }).min(0),
  estoqueMinimo: z.coerce.number({ invalid_type_error: 'Informe o estoque mínimo' }).min(0),
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
              ativo: produto.ativo ?? true,
            }
          : { ativo: true },
      );
    }
  }, [open, produto, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && produto?.id != null) {
        await updateMutation.mutateAsync({ id: produto.id, payload: values });
        toast.success('Produto atualizado.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Produto cadastrado.');
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o produto.'));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar produto' : 'Novo produto'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Código" required error={errors.codigo?.message} {...register('codigo')} />
          <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />
          <Input label="Unidade de medida" placeholder="UN, PC, L..." {...register('unidadeMedida')} />
          <Input label="Preço de custo (R$)" type="number" step="0.01" {...register('precoCusto')} />
          <Input label="Preço de venda (R$)" type="number" step="0.01" required error={errors.precoVenda?.message} {...register('precoVenda')} />
          <Input label="Estoque mínimo" type="number" step="0.01" required error={errors.estoqueMinimo?.message} {...register('estoqueMinimo')} />
        </div>
        <Textarea label="Descrição" {...register('descricao')} />
        {isEditing && <Checkbox label="Produto ativo" {...register('ativo')} />}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
