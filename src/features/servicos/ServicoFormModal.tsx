import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select, Checkbox } from '@/components/ui/Field';
import { useCreateServico, useUpdateServico } from '@/hooks/useServicos';
import type { ServicoResponse } from '@/api/types';
import { CATEGORIAS_COMPLEXIDADE } from '@/lib/categoria';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const FORM_ID = 'servico-form';

const schema = z
  .object({
    nome: z.string().min(1, 'Informe o nome'),
    descricao: z.string().optional(),
    categoria: z.enum(['A', 'B', 'C'], { errorMap: () => ({ message: 'Selecione a categoria' }) }),
    tempoMinHoras: z.coerce.number({ invalid_type_error: 'Informe o tempo mínimo' }).gt(0, 'Deve ser maior que zero'),
    tempoMaxHoras: z.coerce.number({ invalid_type_error: 'Informe o tempo máximo' }).gt(0, 'Deve ser maior que zero'),
    // Opcional: hora técnica própria do serviço, fallback quando a categoria
    // do veículo está zerada ("não uso essa categoria"). Vazio = não informado.
    valorHoraPadrao: z.preprocess(
      (v) => (v === '' || v == null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
      z.coerce.number({ invalid_type_error: 'Informe um valor válido' }).min(0, 'Mínimo 0').optional(),
    ),
    ativo: z.boolean().optional(),
  })
  .refine((v) => v.tempoMaxHoras >= v.tempoMinHoras, {
    message: 'O tempo máximo precisa ser maior ou igual ao mínimo',
    path: ['tempoMaxHoras'],
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
              categoria: servico.categoria ?? 'A',
              tempoMinHoras: servico.tempoMinHoras ?? undefined,
              tempoMaxHoras: servico.tempoMaxHoras ?? undefined,
              valorHoraPadrao: servico.valorHoraPadrao ?? undefined,
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
        <div className="grid grid-cols-3 gap-4">
          <Select label="Categoria" required error={errors.categoria?.message} {...register('categoria')}>
            {CATEGORIAS_COMPLEXIDADE.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Input
            label="Tempo mín. (h)"
            type="number"
            step="0.1"
            required
            error={errors.tempoMinHoras?.message}
            {...register('tempoMinHoras')}
          />
          <Input
            label="Tempo máx. (h)"
            type="number"
            step="0.1"
            required
            error={errors.tempoMaxHoras?.message}
            {...register('tempoMaxHoras')}
          />
        </div>
        <Input
          label="Hora técnica própria (R$/h)"
          type="number"
          step="0.01"
          hint="Opcional. Usada quando a categoria do veículo está marcada como não utilizada"
          error={errors.valorHoraPadrao?.message}
          {...register('valorHoraPadrao')}
        />
        {isEditing && <Checkbox label="Serviço ativo" {...register('ativo')} />}
      </form>
    </Modal>
  );
}
