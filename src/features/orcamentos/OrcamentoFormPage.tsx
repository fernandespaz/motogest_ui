import { useEffect, useState } from 'react';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { PageSpinner } from '@/components/ui/Spinner';
import { useClientes } from '@/hooks/useClientes';
import { useVeiculosDoCliente } from '@/hooks/useClientes';
import type { ClienteResponse } from '@/api/types';
import { useCreateOrcamento, useOrcamento, useUpdateOrcamento } from '@/hooks/useOrcamentos';
import { ItemsEditor } from '@/features/shared/ItemsEditor';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { formatCurrency, formatDocumento } from '@/lib/formatters';

const itemSchema = z.object({
  tipoItem: z.enum(['SERVICO', 'PRODUTO']),
  servicoId: z.coerce.number().optional(),
  produtoId: z.coerce.number().optional(),
  descricao: z.string().min(1, 'Informe a descrição'),
  quantidade: z.coerce.number().positive('Quantidade inválida'),
  valorUnitario: z.coerce.number().min(0, 'Valor inválido'),
});

const schema = z.object({
  clienteId: z.coerce.number().positive('Selecione o cliente'),
  veiculoId: z.coerce.number().positive('Selecione o veículo'),
  validadeDias: z.coerce.number().optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemSchema).min(1, 'Adicione ao menos um item'),
});

type FormValues = z.infer<typeof schema>;

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function CampoBloqueado({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

export function OrcamentoFormPage() {
  const { id } = useParams();
  const orcamentoId = id ? Number(id) : undefined;
  const isEditing = !!orcamentoId;
  const navigate = useNavigate();

  const { data: orcamento, isLoading } = useOrcamento(orcamentoId);
  const createMutation = useCreateOrcamento();
  const updateMutation = useUpdateOrcamento();

  const [buscaClienteInput, setBuscaClienteInput] = useState('');
  const [buscaVeiculo, setBuscaVeiculo] = useState('');
  const buscaCliente = useDebouncedValue(buscaClienteInput, 300);
  const { data: clientes, isFetching: buscandoClientes } = useClientes({ size: 20, busca: buscaCliente || undefined });

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { itens: [], validadeDias: 7 },
  });
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = methods;
  const clienteId = watch('clienteId');
  const veiculoId = watch('veiculoId');
  const { data: veiculos, isFetching: buscandoVeiculos } = useVeiculosDoCliente(clienteId || undefined);

  const readOnly = isEditing && orcamento?.status !== 'RASCUNHO';
  const selectedVeiculo = veiculos?.find((v) => v.id === veiculoId);

  useEffect(() => {
    if (orcamento) {
      reset({
        clienteId: orcamento.clienteId ?? 0,
        veiculoId: orcamento.veiculoId ?? 0,
        validadeDias: orcamento.validadeDias ?? 7,
        observacoes: orcamento.observacoes ?? '',
        itens:
          orcamento.itens?.map((i) => ({
            tipoItem: i.tipoItem ?? 'SERVICO',
            servicoId: i.servicoId ?? undefined,
            produtoId: i.produtoId ?? undefined,
            descricao: i.descricao ?? '',
            quantidade: i.quantidade ?? 1,
            valorUnitario: i.valorUnitario ?? 0,
          })) ?? [],
      });
    }
  }, [orcamento, reset]);

  const clienteOptions: ComboboxOption[] = (clientes?.content ?? []).map((c: ClienteResponse) => ({
    value: c.id!,
    label: c.nome ?? '',
    sublabel: formatDocumento(c.documento ?? '', c.tipoPessoa === 'PJ' ? 'PJ' : 'PF'),
  }));
  // The client list above is a searched/paginated subset — when editing an
  // existing orçamento, its client may not be in it, which would otherwise
  // blank out the combobox's label for a value that's actually set.
  if (clienteId && orcamento?.clienteNome && !clienteOptions.some((o) => o.value === clienteId)) {
    clienteOptions.unshift({ value: clienteId, label: orcamento.clienteNome });
  }

  const veiculoOptions: ComboboxOption[] = (veiculos ?? [])
    .filter((v) => {
      const termo = buscaVeiculo.trim().toLowerCase();
      if (!termo) return true;
      return (
        v.placa?.toLowerCase().includes(termo) ||
        `${v.marca ?? ''} ${v.modelo ?? ''}`.toLowerCase().includes(termo)
      );
    })
    .map((v) => ({
      value: v.id!,
      label: v.placa ?? '',
      sublabel: `${v.marca ?? ''} ${v.modelo ?? ''}`.trim() || undefined,
    }));

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && orcamentoId) {
        await updateMutation.mutateAsync({ id: orcamentoId, payload: values });
        toast.success('Orçamento atualizado.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Orçamento criado como rascunho.');
      }
      navigate('/orcamentos');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o orçamento.'));
    }
  }

  if (isEditing && isLoading) return <PageSpinner />;

  const saving = createMutation.isPending || updateMutation.isPending;

  function compartilharWhatsApp() {
    if (!orcamento?.tokenAprovacao) return;
    const link = `${window.location.origin}/orcamentos/publico/${orcamento.tokenAprovacao}`;
    const texto = `Olá! Segue o orçamento nº ${orcamento.id}${orcamento.clienteNome ? ` para ${orcamento.clienteNome}` : ''}, no valor de ${formatCurrency(orcamento.valorTotal)}. Você pode conferir e aprovar por aqui: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? `Orçamento #${orcamentoId}` : 'Novo orçamento'}
        action={
          <div className="flex items-center gap-2">
            {orcamento?.tokenAprovacao && (
              <Button variant="secondary" onClick={compartilharWhatsApp}>
                <MessageCircle size={16} /> Compartilhar
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/orcamentos')}>
              <ArrowLeft size={16} /> Voltar
            </Button>
          </div>
        }
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Card>
            <CardBody className="flex flex-col gap-4">
              <fieldset disabled={readOnly} className="contents">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name="clienteId"
                    render={({ field }) => (
                      <Combobox
                        label="Cliente"
                        required
                        error={errors.clienteId?.message}
                        placeholder="Buscar por nome ou CPF/CNPJ..."
                        value={field.value || undefined}
                        onChange={(value) => {
                          field.onChange(value);
                          // A vehicle belongs to one client — a stale selection
                          // from whoever was picked before must not survive this.
                          setValue('veiculoId', 0);
                          setBuscaVeiculo('');
                        }}
                        options={clienteOptions}
                        query={buscaClienteInput}
                        onQueryChange={setBuscaClienteInput}
                        loading={buscandoClientes}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="veiculoId"
                    render={({ field }) => (
                      <Combobox
                        label="Veículo"
                        required
                        disabled={!clienteId}
                        error={errors.veiculoId?.message}
                        placeholder={clienteId ? 'Buscar por placa...' : 'Selecione um cliente primeiro'}
                        value={field.value || undefined}
                        onChange={field.onChange}
                        options={veiculoOptions}
                        query={buscaVeiculo}
                        onQueryChange={setBuscaVeiculo}
                        loading={buscandoVeiculos}
                        emptyLabel="Este cliente não tem veículos cadastrados."
                      />
                    )}
                  />
                  <Input label="Validade (dias)" type="number" {...register('validadeDias')} />
                </div>

                <AnimatePresence>
                  {selectedVeiculo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 rounded-lg border border-border bg-surface-alt p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                          Dados do veículo
                        </p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <CampoBloqueado
                            label="Modelo"
                            value={`${selectedVeiculo.marca ?? ''} ${selectedVeiculo.modelo ?? ''}`.trim() || '—'}
                          />
                          <CampoBloqueado
                            label="Ano"
                            value={
                              selectedVeiculo.anoFabricacao
                                ? `${selectedVeiculo.anoFabricacao}${selectedVeiculo.anoModelo ? '/' + selectedVeiculo.anoModelo : ''}`
                                : '—'
                            }
                          />
                          <CampoBloqueado label="Cor" value={selectedVeiculo.cor || '—'} />
                          <CampoBloqueado label="Chassi" value={selectedVeiculo.chassi || '—'} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-4 border-t border-border pt-4">
                  <ItemsEditor name="itens" />
                  {errors.itens && !Array.isArray(errors.itens) && (
                    <p className="mt-1 text-xs font-medium text-danger">{errors.itens.message as string}</p>
                  )}
                </div>

                <div className="mt-4">
                  <Textarea label="Observações" {...register('observacoes')} />
                </div>
              </fieldset>

              {!readOnly && (
                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button type="submit" loading={saving}>
                    {isEditing ? 'Salvar alterações' : 'Criar rascunho'}
                  </Button>
                </div>
              )}
              {readOnly && (
                <p className="rounded-lg bg-surface-alt px-3 py-2 text-sm text-ink-muted">
                  Este orçamento não está mais em rascunho e não pode ser editado.
                </p>
              )}
            </CardBody>
          </Card>
        </form>
      </FormProvider>
    </div>
  );
}
