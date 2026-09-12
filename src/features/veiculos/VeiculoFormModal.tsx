import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useCreateVeiculo, useUpdateVeiculo } from '@/hooks/useVeiculos';
import { useClientes } from '@/hooks/useClientes';
import type { ClienteResponse, VeiculoResponse } from '@/api/types';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

const FORM_ID = 'veiculo-form';
const CURRENT_YEAR = new Date().getFullYear();

const schema = z.object({
  clienteId: z.coerce.number({ invalid_type_error: 'Selecione o cliente' }).positive('Selecione o cliente'),
  placa: z.string().min(1, 'Informe a placa'),
  marca: z.string().optional(),
  modelo: z.string().min(1, 'Informe o modelo'),
  anoFabricacao: z.coerce
    .number({ invalid_type_error: 'Informe o ano de fabricação' })
    .min(1900, 'Ano inválido')
    .max(CURRENT_YEAR + 1, 'Ano inválido'),
  anoModelo: z.coerce.number().optional(),
  cor: z.string().min(1, 'Informe a cor'),
  kmAtual: z.coerce.number().optional(),
  chassi: z.string().min(1, 'Informe o chassi'),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function VeiculoFormModal({
  open,
  onClose,
  veiculo,
  defaultClienteId,
}: {
  open: boolean;
  onClose: () => void;
  veiculo?: VeiculoResponse | null;
  defaultClienteId?: number;
}) {
  const isEditing = !!veiculo;
  const [busca, setBusca] = useState('');
  const { data: clientes } = useClientes({ size: 50, nome: busca || undefined });
  const createMutation = useCreateVeiculo();
  const updateMutation = useUpdateVeiculo();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset(
        veiculo
          ? {
              clienteId: veiculo.clienteId ?? 0,
              placa: veiculo.placa ?? '',
              marca: veiculo.marca ?? '',
              modelo: veiculo.modelo ?? '',
              anoFabricacao: veiculo.anoFabricacao ?? undefined,
              anoModelo: veiculo.anoModelo ?? undefined,
              cor: veiculo.cor ?? '',
              kmAtual: veiculo.kmAtual ?? undefined,
              chassi: veiculo.chassi ?? '',
              observacoes: veiculo.observacoes ?? '',
            }
          : { clienteId: defaultClienteId ?? 0 },
      );
    }
  }, [open, veiculo, defaultClienteId, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && veiculo?.id != null) {
        await updateMutation.mutateAsync({ id: veiculo.id, payload: values });
        toast.success('Veículo atualizado com sucesso.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Veículo cadastrado com sucesso.');
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o veículo.'));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar veículo' : 'Novo veículo'}
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
              <Input placeholder="Buscar cliente pelo nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Placa" required error={errors.placa?.message} {...register('placa')} />
          <Input label="Marca" {...register('marca')} />
          <Input label="Modelo" required error={errors.modelo?.message} {...register('modelo')} />
          <Input label="Cor" required error={errors.cor?.message} {...register('cor')} />
          <Input
            label="Ano de fabricação"
            type="number"
            required
            error={errors.anoFabricacao?.message}
            {...register('anoFabricacao')}
          />
          <Input label="Ano do modelo" type="number" {...register('anoModelo')} />
          <Input label="KM atual" type="number" {...register('kmAtual')} />
          <Input label="Chassi" required error={errors.chassi?.message} {...register('chassi')} />
        </div>
        <Textarea label="Observações" {...register('observacoes')} />
      </form>
    </Modal>
  );
}
