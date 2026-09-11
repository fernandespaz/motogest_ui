import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Checkbox } from '@/components/ui/Field';
import { useCreateCliente, useUpdateCliente } from '@/hooks/useClientes';
import type { ClienteResponse } from '@/api/types';
import { formatCnpj, formatCpf, onlyDigits } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const schema = z.object({
  tipoPessoa: z.enum(['PF', 'PJ']),
  nome: z.string().min(1, 'Informe o nome'),
  documento: z.string().min(1, 'Informe o documento').transform(onlyDigits),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  cep: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ClienteFormModal({
  open,
  onClose,
  cliente,
}: {
  open: boolean;
  onClose: () => void;
  cliente?: ClienteResponse | null;
}) {
  const isEditing = !!cliente;
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipoPessoa: 'PF', ativo: true },
  });

  const tipoPessoa = watch('tipoPessoa');

  useEffect(() => {
    if (open) {
      reset(
        cliente
          ? {
              tipoPessoa: cliente.tipoPessoa ?? 'PF',
              nome: cliente.nome ?? '',
              documento: cliente.documento ?? '',
              email: cliente.email ?? '',
              telefone: cliente.telefone ?? '',
              logradouro: cliente.logradouro ?? '',
              numero: cliente.numero ?? '',
              bairro: cliente.bairro ?? '',
              cidade: cliente.cidade ?? '',
              uf: cliente.uf ?? '',
              cep: cliente.cep ?? '',
              observacoes: cliente.observacoes ?? '',
              ativo: cliente.ativo ?? true,
            }
          : { tipoPessoa: 'PF', ativo: true },
      );
    }
  }, [open, cliente, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = { ...values, email: values.email || undefined };
      if (isEditing && cliente?.id != null) {
        await updateMutation.mutateAsync({ id: cliente.id, payload });
        toast.success('Cliente atualizado com sucesso.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Cliente cadastrado com sucesso.');
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o cliente.'));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar cliente' : 'Novo cliente'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Tipo de pessoa" required {...register('tipoPessoa')}>
            <option value="PF">Pessoa física</option>
            <option value="PJ">Pessoa jurídica</option>
          </Select>
          <Input
            label={tipoPessoa === 'PJ' ? 'Razão social' : 'Nome completo'}
            required
            error={errors.nome?.message}
            {...register('nome')}
          />
          <Controller
            control={control}
            name="documento"
            render={({ field }) => (
              <Input
                label={tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}
                required
                inputMode="numeric"
                value={
                  tipoPessoa === 'PJ' ? formatCnpj(field.value ?? '') : formatCpf(field.value ?? '')
                }
                onChange={(e) => field.onChange(onlyDigits(e.target.value))}
                error={errors.documento?.message}
              />
            )}
          />
          <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Telefone" {...register('telefone')} />
          <Input label="CEP" {...register('cep')} />
          <Input label="Logradouro" {...register('logradouro')} />
          <Input label="Número" {...register('numero')} />
          <Input label="Bairro" {...register('bairro')} />
          <Input label="Cidade" {...register('cidade')} />
          <Input label="UF" maxLength={2} {...register('uf')} />
        </div>
        <Textarea label="Observações" {...register('observacoes')} />
        {isEditing && <Checkbox label="Cliente ativo" {...register('ativo')} />}

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
