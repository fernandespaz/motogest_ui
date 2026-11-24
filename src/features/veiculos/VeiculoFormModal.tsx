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
import { usePlacaConsulta, type DadosPlaca, type DadosPlacaConsultada } from '@/features/shared/usePlacaConsulta';
import { PlacaHero } from './PlacaHero';
import { VeiculoDadosValidacao } from './VeiculoDadosValidacao';
import { normalizarPlaca } from '@/lib/placa';
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

/** Nome mostrado ao usuário para cada campo obrigatório que ainda falta preencher. */
const ROTULOS_OBRIGATORIOS: Partial<Record<keyof FormValues, string>> = {
  clienteId: 'Cliente',
  placa: 'Placa',
  modelo: 'Modelo',
  anoFabricacao: 'Ano de fabricação',
  cor: 'Cor',
  chassi: 'Chassi',
  categoria: 'Categoria',
};

/** Rótulos dos campos obrigatórios ainda inválidos/vazios (na ordem do formulário). */
function camposPendentes(values: Partial<FormValues>): string[] {
  const resultado = schema.safeParse(values);
  if (resultado.success) return [];
  const pendentes = new Set(resultado.error.issues.map((i) => String(i.path[0])));
  return (Object.keys(ROTULOS_OBRIGATORIOS) as (keyof FormValues)[])
    .filter((campo) => pendentes.has(campo))
    .map((campo) => ROTULOS_OBRIGATORIOS[campo]!);
}

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
  // Dados que a consulta de placa devolveu (e a placa a que se referem) — base do indicador "da consulta" x "manual".
  const [dadosConsulta, setDadosConsulta] = useState<(Partial<DadosPlaca> & { placa: string }) | null>(null);
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
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      setBusca('');
      setDadosConsulta(null);
      consulta.reset();
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

  const placaDigitada = watch('placa');
  const consulta = usePlacaConsulta(placaDigitada, aplicarDadosConsulta, { enabled: open && !isEditing });
  // Só vale para a placa que está no campo agora: mudou a placa, a seção volta ao cadastro manual.
  const consultaVigente =
    !isEditing && dadosConsulta && dadosConsulta.placa === normalizarPlaca(placaDigitada) ? dadosConsulta : null;

  // Nunca sobrescreve o que o usuário já digitou: só completa campos vazios.
  function aplicarDadosConsulta(dados: DadosPlacaConsultada) {
    const { placa: placaConsultada, ...campos } = dados;
    setDadosConsulta((anterior) => {
      const base = anterior && anterior.placa === (placaConsultada ?? anterior.placa) ? anterior : { placa: placaConsultada ?? '' };
      const novos = Object.fromEntries(Object.entries(campos).filter(([, v]) => v != null && v !== ''));
      return { ...base, ...novos, placa: placaConsultada ?? base.placa };
    });
    for (const [campo, valor] of Object.entries(campos)) {
      if (valor == null || valor === '') continue;
      const atual = getValues(campo as keyof FormValues) as unknown;
      if (atual != null && atual !== '') continue;
      setValue(campo as keyof FormValues, valor as never, { shouldDirty: true, shouldValidate: true });
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  // Salvar só libera quando todas as informações obrigatórias (as da consulta e as complementares) estão preenchidas.
  const pendentes = camposPendentes(watch());

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
          {pendentes.length > 0 && (
            <span role="status" className="mr-auto self-center text-xs text-ink-muted">
              Para salvar, preencha: {pendentes.join(', ')}
            </span>
          )}
          <Button type="submit" form={FORM_ID} loading={saving} disabled={pendentes.length > 0}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        {!isEditing && <PlacaHero register={register} error={errors.placa?.message} consulta={consulta} />}

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

        {isEditing ? (
          <FormSection title="Dados do veículo" icon={Car}>
            <VeiculoCampos register={register} watch={watch} setValue={setValue} errors={errors} estrito categoriaVazia />
            <Textarea label="Observações" rows={2} {...register('observacoes')} />
          </FormSection>
        ) : consultaVigente ? (
          <VeiculoDadosValidacao
            placa={consultaVigente.placa}
            dadosConsulta={consultaVigente}
            register={register}
            watch={watch}
            errors={errors}
            consulta={consulta}
          />
        ) : (
          <FormSection title="Dados do veículo" icon={Car}>
            <VeiculoCampos
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
              estrito
              categoriaVazia
              ocultarPlaca
            />
            <Textarea label="Observações" rows={2} {...register('observacoes')} />
          </FormSection>
        )}
      </form>
    </Modal>
  );
}
