import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { Combobox } from '@/components/ui/Combobox';
import { FormSection } from '@/components/ui/FormSection';
import { Car, UserRound } from 'lucide-react';
import { VeiculoCampos } from '@/features/shared/VeiculoCampos';
import { useCreateVeiculo, useUpdateVeiculo } from '@/hooks/useVeiculos';
import { useClientes } from '@/hooks/useClientes';
import type { ClienteResponse, VeiculoRequest, VeiculoResponse } from '@/api/types';
import { formatCpfOuCnpj } from '@/lib/formatters';
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
  // É a categoria do veículo, não a do serviço escolhido, que decide a hora
  // técnica aplicada num Orçamento/OS pra ele (ver doc de Precificação por
  // Categoria, atualização 29/09) — por isso obrigatória, igual ao backend.
  // z.string() solta (não z.enum) de propósito: precisa aceitar o valor
  // vazio do placeholder do <select> pra que um veículo legado sem categoria
  // (todo veículo cadastrado antes desta feature) force uma escolha
  // explícita em vez de submeter silenciosamente com "A" pré-selecionado —
  // só o Select's próprias opções (A/B/C) chegam aqui de verdade.
  categoria: z.string().min(1, 'Categoria obrigatória'),
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
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      setBusca('');
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
              // '' (sem categoria ainda, veículo legado) deixa o placeholder
              // selecionado — o usuário precisa escolher de propósito, não
              // herdar um "A" que ninguém decidiu.
              categoria: veiculo.categoria ?? '',
            }
          : { clienteId: defaultClienteId ?? 0, categoria: 'A' },
      );
    }
  }, [open, veiculo, defaultClienteId, reset]);

  async function onSubmit(values: FormValues) {
    try {
      // categoria só chega aqui validada como 'A'|'B'|'C' (zod.min(1) barra o
      // placeholder vazio) — o cast reflete isso pro tipo gerado do backend.
      const payload = { ...values, categoria: values.categoria as VeiculoRequest['categoria'] };
      if (isEditing && veiculo?.id != null) {
        await updateMutation.mutateAsync({ id: veiculo.id, payload });
        toast.success('Veículo atualizado com sucesso.');
      } else {
        await createMutation.mutateAsync(payload);
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
      size="xl"
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
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        <FormSection title="Proprietário" icon={UserRound}>
          <Controller
            control={control}
            name="clienteId"
            render={({ field }) => (
              <Combobox
                label="Cliente"
                required
                placeholder="Buscar cliente pelo nome..."
                error={errors.clienteId?.message}
                value={field.value || undefined}
                onChange={(id) => field.onChange(id)}
                options={(clientes?.content ?? []).map((c: ClienteResponse) => ({
                  value: c.id!,
                  label: c.nome ?? '',
                  sublabel: c.documento ? formatCpfOuCnpj(c.documento) : undefined,
                }))}
                query={busca}
                onQueryChange={setBusca}
              />
            )}
          />
        </FormSection>

        <FormSection title="Dados do veículo" icon={Car}>
          <VeiculoCampos
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
            estrito
            categoriaVazia
          />
          <Textarea label="Observações" rows={2} {...register('observacoes')} />
        </FormSection>
      </form>
    </Modal>
  );
}
