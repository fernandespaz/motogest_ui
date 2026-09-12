import { useEffect, useState } from 'react';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { useClientes } from '@/hooks/useClientes';
import { useVeiculos } from '@/hooks/useVeiculos';
import { useUsuarios } from '@/hooks/useUsuarios';
import {
  useCreateOrdemServico,
  useOrdemServico,
  useUpdateOrdemServico,
  useAtualizarStatusOS,
} from '@/hooks/useOrdensServico';
import { ItemsEditor } from '@/features/shared/ItemsEditor';
import { ChecklistTab } from './ChecklistTab';
import { FotosTab } from './FotosTab';
import type { ClienteResponse, OrdemServicoStatus, VeiculoResponse } from '@/api/types';
import { ordemServicoStatusMeta, metaFor } from '@/lib/statusMeta';
import { toDateTimeLocalValue } from '@/lib/formatters';
import { ordensServicoApi } from '@/api/endpoints/ordensServico';
import { openPdfInNewTab } from '@/lib/downloadBlob';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

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
  usuarioResponsavelId: z.coerce.number().optional(),
  dataPrevisao: z.string().optional(),
  kmEntrada: z.coerce.number().optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemSchema).min(1, 'Adicione ao menos um item'),
});

type FormValues = z.infer<typeof schema>;

const statusOptions: OrdemServicoStatus[] = [
  'ABERTA',
  'EM_ANDAMENTO',
  'AGUARDANDO_PECA',
  'CONCLUIDA',
  'CANCELADA',
  'ENTREGUE',
];

export function OrdemServicoFormPage() {
  const { id } = useParams();
  const osId = id ? Number(id) : undefined;
  const isEditing = !!osId;
  const navigate = useNavigate();
  const [tab, setTab] = useState('dados');

  const { data: os, isLoading } = useOrdemServico(osId);
  const createMutation = useCreateOrdemServico();
  const updateMutation = useUpdateOrdemServico();
  const atualizarStatus = useAtualizarStatusOS();

  const [buscaCliente, setBuscaCliente] = useState('');
  const { data: clientes } = useClientes({ size: 50, nome: buscaCliente || undefined });
  const { data: usuarios } = useUsuarios();

  const methods = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { itens: [] } });
  const { control, register, handleSubmit, watch, reset, formState: { errors } } = methods;
  const clienteId = watch('clienteId');
  const { data: veiculos } = useVeiculos({ clienteId: clienteId || undefined, size: 100 });

  const encerrada = isEditing && ['CONCLUIDA', 'CANCELADA', 'ENTREGUE'].includes(os?.status ?? '');

  useEffect(() => {
    if (os) {
      reset({
        clienteId: os.clienteId ?? 0,
        veiculoId: os.veiculoId ?? 0,
        usuarioResponsavelId: os.usuarioResponsavelId ?? undefined,
        dataPrevisao: toDateTimeLocalValue(os.dataPrevisao),
        kmEntrada: os.kmEntrada ?? undefined,
        observacoes: os.observacoes ?? '',
        itens:
          os.itens?.map((i) => ({
            tipoItem: i.tipoItem ?? 'SERVICO',
            servicoId: i.servicoId ?? undefined,
            produtoId: i.produtoId ?? undefined,
            descricao: i.descricao ?? '',
            quantidade: i.quantidade ?? 1,
            valorUnitario: i.valorUnitario ?? 0,
          })) ?? [],
      });
    }
  }, [os, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        dataPrevisao: values.dataPrevisao ? new Date(values.dataPrevisao).toISOString() : undefined,
      };
      if (isEditing && osId) {
        await updateMutation.mutateAsync({ id: osId, payload });
        toast.success('Ordem de Serviço atualizada.');
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success('Ordem de Serviço criada.');
        navigate(`/ordens-servico/${created.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar a Ordem de Serviço.'));
    }
  }

  async function handleStatusChange(status: OrdemServicoStatus) {
    if (!osId) return;
    try {
      await atualizarStatus.mutateAsync({ id: osId, status });
      toast.success('Status atualizado.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível atualizar o status.'));
    }
  }

  async function baixarPdf() {
    if (!osId) return;
    try {
      await openPdfInNewTab(() => ordensServicoApi.pdf(osId), `os-${os?.numero ?? osId}.pdf`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível gerar o PDF.'));
    }
  }

  if (isEditing && isLoading) return <PageSpinner />;

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title={isEditing ? `OS ${os?.numero ?? `#${osId}`}` : 'Nova Ordem de Serviço'}
        action={
          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                <Badge tone={metaFor(ordemServicoStatusMeta, os?.status).tone}>{metaFor(ordemServicoStatusMeta, os?.status).label}</Badge>
                <Button variant="secondary" size="sm" onClick={baixarPdf}>
                  <FileDown size={16} /> PDF
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate('/ordens-servico')}>
              <ArrowLeft size={16} /> Voltar
            </Button>
          </div>
        }
      />

      {isEditing && (
        <div className="mb-4 max-w-xs">
          <Select value={os?.status} onChange={(e) => handleStatusChange(e.target.value as OrdemServicoStatus)}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {metaFor(ordemServicoStatusMeta, s).label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {isEditing ? (
        <Tabs
          tabs={[
            { key: 'dados', label: 'Dados' },
            { key: 'checklists', label: 'Checklists' },
            { key: 'fotos', label: 'Fotos' },
          ]}
          active={tab}
          onChange={setTab}
        />
      ) : null}

      <TabPanel hidden={isEditing && tab !== 'dados'}>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Card>
              <CardBody className="flex flex-col gap-4">
                <fieldset disabled={encerrada} className="contents">
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
                    <Select label="Responsável" {...register('usuarioResponsavelId')}>
                      <option value="">Não definido</option>
                      {usuarios?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </Select>
                    <Input label="Previsão de conclusão" type="datetime-local" {...register('dataPrevisao')} />
                    <Input label="KM de entrada" type="number" {...register('kmEntrada')} />
                  </div>

                  <div className="mt-4 border-t border-border pt-4">
                    <ItemsEditor name="itens" />
                    {errors.itens && !Array.isArray(errors.itens) && (
                      <p className="mt-1 text-xs font-medium text-danger">{errors.itens.message as string}</p>
                    )}
                  </div>

                  <Textarea label="Observações" {...register('observacoes')} />
                </fieldset>

                {!encerrada && (
                  <div className="flex justify-end gap-2 border-t border-border pt-4">
                    <Button type="submit" loading={saving}>
                      {isEditing ? 'Salvar alterações' : 'Criar Ordem de Serviço'}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          </form>
        </FormProvider>
      </TabPanel>

      {isEditing && osId && (
        <>
          <TabPanel hidden={tab !== 'checklists'}>
            <ChecklistTab ordemServicoId={osId} />
          </TabPanel>
          <TabPanel hidden={tab !== 'fotos'}>
            <FotosTab ordemServicoId={osId} />
          </TabPanel>
        </>
      )}
    </div>
  );
}
