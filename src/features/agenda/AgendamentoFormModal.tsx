import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Checkbox } from '@/components/ui/Field';
import { useCreateAgendamento, useUpdateAgendamento } from '@/hooks/useAgenda';
import { useClientes } from '@/hooks/useClientes';
import { useVeiculos } from '@/hooks/useVeiculos';
import { useServicos } from '@/hooks/useServicos';
import type { AgendamentoResponse, ClienteResponse, ServicoResponse, VeiculoResponse } from '@/api/types';
import { toDateTimeLocalValue } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const FORM_ID = 'agendamento-form';

const schema = z.object({
  clienteId: z.coerce.number().positive('Selecione o cliente'),
  veiculoId: z.coerce.number().positive('Selecione o veículo'),
  dataHora: z.string().min(1, 'Informe a data e hora'),
  observacoes: z.string().optional(),
  servicoIds: z.array(z.coerce.number()).min(1, 'Selecione ao menos um serviço'),
});

type FormValues = z.infer<typeof schema>;

export function AgendamentoFormModal({
  open,
  onClose,
  agendamento,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  agendamento?: AgendamentoResponse | null;
  defaultDate?: string;
}) {
  const isEditing = !!agendamento;
  const [buscaCliente, setBuscaCliente] = useState('');
  const { data: clientes } = useClientes({ size: 50, nome: buscaCliente || undefined });
  const createMutation = useCreateAgendamento();
  const updateMutation = useUpdateAgendamento();

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { servicoIds: [] } });

  const clienteId = watch('clienteId');
  const { data: veiculos } = useVeiculos({ clienteId: clienteId || undefined, size: 100 });
  const { data: servicos } = useServicos({ size: 100 });

  useEffect(() => {
    if (open) {
      reset(
        agendamento
          ? {
              clienteId: agendamento.clienteId ?? 0,
              veiculoId: agendamento.veiculoId ?? 0,
              dataHora: toDateTimeLocalValue(agendamento.dataHora),
              observacoes: agendamento.observacoes ?? '',
              servicoIds: agendamento.servicos?.map((s) => s.id!).filter(Boolean) ?? [],
            }
          : { dataHora: defaultDate ?? '', servicoIds: [] },
      );
    }
  }, [open, agendamento, defaultDate, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = { ...values, dataHora: new Date(values.dataHora).toISOString() };
      if (isEditing && agendamento?.id != null) {
        await updateMutation.mutateAsync({ id: agendamento.id, payload });
        toast.success('Agendamento atualizado.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Agendamento criado.');
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o agendamento.'));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar agendamento' : 'Novo agendamento'}
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
        <Controller
          control={control}
          name="clienteId"
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <Input placeholder="Buscar cliente..." value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} />
              <Select label="Cliente" required error={errors.clienteId?.message} value={field.value ?? 0} onChange={(e) => field.onChange(Number(e.target.value))}>
                <option value={0}>Selecione um cliente</option>
                {clientes?.content?.map((c: ClienteResponse) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </div>
          )}
        />

        <Controller
          control={control}
          name="veiculoId"
          render={({ field }) => (
            <Select label="Veículo" required error={errors.veiculoId?.message} value={field.value ?? 0} onChange={(e) => field.onChange(Number(e.target.value))}>
              <option value={0}>Selecione um veículo</option>
              {veiculos?.content?.map((v: VeiculoResponse) => (
                <option key={v.id} value={v.id}>
                  {v.placa} — {v.marca} {v.modelo}
                </option>
              ))}
            </Select>
          )}
        />

        <Input label="Data e hora" type="datetime-local" required error={errors.dataHora?.message} {...register('dataHora')} />

        <div>
          <p className="mb-2 text-sm font-medium text-ink">
            Serviços <span className="text-danger">*</span>
          </p>
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
            {servicos?.content?.map((s: ServicoResponse) => (
              <Controller
                key={s.id}
                control={control}
                name="servicoIds"
                render={({ field }) => (
                  <Checkbox
                    label={s.nome ?? ''}
                    checked={field.value?.includes(s.id!)}
                    onChange={(e) => {
                      const set = new Set(field.value ?? []);
                      if (e.target.checked) set.add(s.id!);
                      else set.delete(s.id!);
                      field.onChange(Array.from(set));
                    }}
                  />
                )}
              />
            ))}
          </div>
          {errors.servicoIds && <p className="mt-1 text-xs font-medium text-danger">{errors.servicoIds.message}</p>}
        </div>

        <Textarea label="Observações" {...register('observacoes')} />
      </form>
    </Modal>
  );
}
