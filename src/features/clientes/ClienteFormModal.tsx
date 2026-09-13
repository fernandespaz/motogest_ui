import { useEffect, useState } from 'react';
import { FormProvider, useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Checkbox } from '@/components/ui/Field';
import { useCreateCliente, useUpdateCliente, clientesKeys } from '@/hooks/useClientes';
import { useDeleteVeiculo } from '@/hooks/useVeiculos';
import { useCepLookup } from '@/hooks/useCepLookup';
import { veiculosApi } from '@/api/endpoints/veiculos';
import type { ClienteResponse } from '@/api/types';
import { formatCep, formatCnpj, formatCpf, formatPhone, onlyDigits } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { preventEnterSubmit } from '@/lib/preventEnterSubmit';
import { VeiculosEditor } from './VeiculosEditor';
import { VeiculoVinculadoRow } from './VeiculoVinculadoRow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const FORM_ID = 'cliente-form';
const CURRENT_YEAR = new Date().getFullYear();

const veiculoNovoSchema = z.object({
  placa: z.string().min(1, 'Informe a placa'),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  anoFabricacao: z.coerce.number().optional(),
  anoModelo: z.coerce.number().optional(),
  cor: z.string().optional(),
  kmAtual: z.coerce.number().optional(),
  chassi: z.string().optional(),
  observacoes: z.string().optional(),
});

// Deliberately lenient (only id + placa required): this row edits a vehicle
// that may already exist with incomplete legacy data, and saving the client
// must never be blocked by a field the user isn't even looking at — the
// dedicated Veículo form (features/veiculos) is what enforces full data
// quality when someone is actually focused on that vehicle.
const veiculoExistenteSchema = z.object({
  id: z.number(),
  placa: z.string().min(1, 'Informe a placa'),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  anoFabricacao: z.coerce
    .number()
    .optional()
    .refine((v) => !v || (v >= 1900 && v <= CURRENT_YEAR + 1), 'Ano inválido'),
  anoModelo: z.coerce.number().optional(),
  cor: z.string().optional(),
  kmAtual: z.coerce.number().optional(),
  chassi: z.string().optional(),
  observacoes: z.string().optional(),
});

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
  veiculosExistentes: z.array(veiculoExistenteSchema).optional(),
  veiculosNovos: z.array(veiculoNovoSchema).optional(),
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
  const qc = useQueryClient();
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();
  const deleteVeiculoMutation = useDeleteVeiculo();
  const { buscando: buscandoCep, buscar: buscarCep } = useCepLookup();
  const [removendo, setRemovendo] = useState<{ index: number; id: number; placa: string } | null>(null);

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipoPessoa: 'PF', ativo: true, veiculosExistentes: [], veiculosNovos: [] },
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = methods;

  async function handleCepBlur(cep: string) {
    const endereco = await buscarCep(cep);
    if (!endereco) return;
    setValue('logradouro', endereco.logradouro, { shouldDirty: true });
    setValue('bairro', endereco.bairro, { shouldDirty: true });
    setValue('cidade', endereco.cidade, { shouldDirty: true });
    setValue('uf', endereco.uf, { shouldDirty: true });
  }

  const { fields: veiculosExistentesFields, remove: removeVeiculoExistente } = useFieldArray({
    control,
    name: 'veiculosExistentes',
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
              veiculosExistentes: (cliente.veiculos ?? []).map((v) => ({
                id: v.id!,
                placa: v.placa ?? '',
                marca: v.marca ?? '',
                modelo: v.modelo ?? '',
                anoFabricacao: v.anoFabricacao ?? undefined,
                anoModelo: v.anoModelo ?? undefined,
                cor: v.cor ?? '',
                kmAtual: v.kmAtual ?? undefined,
                chassi: v.chassi ?? '',
                observacoes: v.observacoes ?? '',
              })),
              veiculosNovos: [],
            }
          : { tipoPessoa: 'PF', ativo: true, veiculosExistentes: [], veiculosNovos: [] },
      );
    }
  }, [open, cliente, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const { veiculosNovos, veiculosExistentes, ...clienteFields } = values;
      const payload = { ...clienteFields, email: clienteFields.email || undefined };

      if (isEditing && cliente?.id != null) {
        await updateMutation.mutateAsync({ id: cliente.id, payload });

        // PUT /clientes/{id} aceita "veiculos" no payload mas não os persiste
        // (confirmado direto no backend) — edições e novos veículos, na edição
        // de um cliente existente, vão pelo endpoint de veículo avulso, que já
        // funciona hoje.
        for (const v of veiculosExistentes ?? []) {
          await veiculosApi.update(v.id, { ...v, clienteId: cliente.id });
        }
        for (const v of veiculosNovos ?? []) {
          await veiculosApi.create({ ...v, clienteId: cliente.id });
        }
        if ((veiculosExistentes?.length ?? 0) > 0 || (veiculosNovos?.length ?? 0) > 0) {
          qc.invalidateQueries({ queryKey: clientesKeys.all });
        }
        toast.success('Cliente atualizado com sucesso.');
      } else {
        await createMutation.mutateAsync({
          ...payload,
          veiculos: veiculosNovos && veiculosNovos.length > 0 ? veiculosNovos : undefined,
        });
        toast.success('Cliente cadastrado com sucesso.');
      }
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o cliente.'));
    }
  }

  async function confirmRemoverVeiculo() {
    if (!removendo) return;
    try {
      await deleteVeiculoMutation.mutateAsync(removendo.id);
      removeVeiculoExistente(removendo.index);
      qc.invalidateQueries({ queryKey: clientesKeys.all });
      toast.success('Veículo removido.');
      setRemovendo(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível remover o veículo.'));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar cliente' : 'Novo cliente'}
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
      <FormProvider {...methods}>
        <form
          id={FORM_ID}
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={preventEnterSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
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
                  autoComplete="off"
                  value={tipoPessoa === 'PJ' ? formatCnpj(field.value ?? '') : formatCpf(field.value ?? '')}
                  onChange={(e) =>
                    field.onChange(onlyDigits(e.target.value).slice(0, tipoPessoa === 'PJ' ? 14 : 11))
                  }
                  error={errors.documento?.message}
                />
              )}
            />
            <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
            <Controller
              control={control}
              name="telefone"
              render={({ field }) => (
                <Input
                  label="Telefone"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="(11) 91234-5678"
                  value={formatPhone(field.value ?? '')}
                  onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 11))}
                />
              )}
            />
            <Controller
              control={control}
              name="cep"
              render={({ field }) => (
                <Input
                  label="CEP"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="00000-000"
                  hint={buscandoCep ? 'Buscando endereço...' : undefined}
                  value={formatCep(field.value ?? '')}
                  onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 8))}
                  onBlur={(e) => handleCepBlur(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter here means "look up this CEP", not "submit the form".
                    if (e.key === 'Enter') handleCepBlur(e.currentTarget.value);
                  }}
                />
              )}
            />
            <Input label="Logradouro" autoComplete="off" {...register('logradouro')} />
            <Input label="Número" autoComplete="off" {...register('numero')} />
            <Input label="Bairro" autoComplete="off" {...register('bairro')} />
            <Input label="Cidade" autoComplete="off" {...register('cidade')} />
            <Input label="UF" autoComplete="off" maxLength={2} {...register('uf')} />
          </div>
          <Textarea label="Observações" {...register('observacoes')} />
          {isEditing && <Checkbox label="Cliente ativo" {...register('ativo')} />}

          {isEditing && veiculosExistentesFields.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-semibold text-ink">Veículos vinculados</p>
              <div className="flex flex-col gap-2">
                {veiculosExistentesFields.map((field, index) => (
                  <VeiculoVinculadoRow
                    key={field.id}
                    index={index}
                    onRemover={() => {
                      // fields[].id is react-hook-form's own synthetic key, not
                      // our vehicle's real id — read the live value instead.
                      const atual = getValues(`veiculosExistentes.${index}`);
                      if (!atual) return;
                      setRemovendo({ index, id: atual.id, placa: atual.placa });
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <VeiculosEditor name="veiculosNovos" />
          </div>

          <p className="text-xs text-ink-muted">
            Alterações em veículos (editados, novos ou removidos) só são salvas quando você clica em "Salvar" abaixo.
          </p>
        </form>
      </FormProvider>

      <ConfirmDialog
        open={!!removendo}
        title="Remover veículo"
        description={`Tem certeza que deseja remover a placa "${removendo?.placa}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        variant="danger"
        loading={deleteVeiculoMutation.isPending}
        onConfirm={confirmRemoverVeiculo}
        onCancel={() => setRemovendo(null)}
      />
    </Modal>
  );
}
