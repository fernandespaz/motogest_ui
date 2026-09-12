import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Checkbox } from '@/components/ui/Field';
import { useCreateServico, useUpdateServico } from '@/hooks/useServicos';
import type { ServicoResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const FORM_ID = 'servico-form';

const schema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  descricao: z.string().optional(),
  preco: z.coerce.number({ invalid_type_error: 'Informe o preço' }).min(0, 'Preço inválido'),
  duracaoMinutos: z.coerce.number().optional(),
  ativo: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ServicoFormModal({
  open,
  onClose,
  servico,
}: {
  open: boolean;
  onClose: () => void;
  servico?: ServicoResponse | null;
}) {
  const isEditing = !!servico;
  const createMutation = useCreateServico();
  const updateMutation = useUpdateServico();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { ativo: true } });

  useEffect(() => {
    if (open) {
      reset(
        servico
          ? {
              nome: servico.nome ?? '',
              descricao: servico.descricao ?? '',
              preco: servico.preco ?? 0,
              duracaoMinutos: servico.duracaoMinutos ?? undefined,
              ativo: servico.ativo ?? true,
            }
          : { ativo: true },
      );
    }
  }, [open, servico, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && servico?.id != null) {
        await updateMutation.mutateAsync({ id: servico.id, payload: values });
        toast.success('Serviço atualizado.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Serviço cadastrado.');
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o serviço.'));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar serviço' : 'Novo serviço'}
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
        <Input label="Nome" required error={errors.nome?.message} {...register('nome')} />
        <Textarea label="Descrição" {...register('descricao')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Preço (R$)" type="number" step="0.01" required error={errors.preco?.message} {...register('preco')} />
          <Input label="Duração (min)" type="number" {...register('duracaoMinutos')} />
        </div>
        {isEditing && <Checkbox label="Serviço ativo" {...register('ativo')} />}
      </form>
    </Modal>
  );
}
