import { useEffect, useState } from 'react';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { PageSpinner } from '@/components/ui/Spinner';
import { useClientes } from '@/hooks/useClientes';
import { useVeiculos } from '@/hooks/useVeiculos';
import type { ClienteResponse, VeiculoResponse } from '@/api/types';
import { useCreateOrcamento, useOrcamento, useUpdateOrcamento } from '@/hooks/useOrcamentos';
import { ItemsEditor } from '@/features/shared/ItemsEditor';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { formatCurrency } from '@/lib/formatters';

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

export function OrcamentoFormPage() {
  const { id } = useParams();
  const orcamentoId = id ? Number(id) : undefined;
  const isEditing = !!orcamentoId;
  const navigate = useNavigate();

  const { data: orcamento, isLoading } = useOrcamento(orcamentoId);
  const createMutation = useCreateOrcamento();
  const updateMutation = useUpdateOrcamento();

  const [buscaCliente, setBuscaCliente] = useState('');
  const { data: clientes } = useClientes({ size: 50, nome: buscaCliente || undefined });

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { itens: [], validadeDias: 7 },
  });
  const { control, register, handleSubmit, watch, reset, formState: { errors } } = methods;
  const clienteId = watch('clienteId');
  const { data: veiculos } = useVeiculos({ clienteId: clienteId || undefined, size: 100 });

  const readOnly = isEditing && orcamento?.status !== 'RASCUNHO';

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

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && orcamentoId) {
        await updateMutation.mutateAsync({ id: orcamentoId, payload: values });
        toast.success('Orçamento atualizado.');
      } else {
        const created = await createMutation.mutateAsync(values);
        toast.success('Orçamento criado como rascunho.');
        navigate(`/orcamentos/${created.id}`, { replace: true });
        return;
      }
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
                  <Input label="Validade (dias)" type="number" {...register('validadeDias')} />
                </div>

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
