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
import type { ClienteResponse, OrcamentoResponse } from '@/api/types';
import { useCreateOrcamento, useOrcamento, useUpdateOrcamento } from '@/hooks/useOrcamentos';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  ItemsEditor,
  MENSAGEM_SERVICO_SEM_TEMPO,
  erroListaItens,
  itemParaPayload,
  temServicoPorHTSemTempo,
} from '@/features/shared/ItemsEditor';
import { HoraTecnicaReferencia } from '@/features/shared/HoraTecnicaReferencia';
import { ModeloVeiculoThumb, useModeloVeiculoImagem } from '@/features/shared/ModeloVeiculoField';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { formatCurrency, formatDateTime, formatDocumento, toDateTimeLocalValue } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';
import { isMecanico } from '@/lib/perfil';
import { getLandingPath } from '@/layout/nav';

const itemSchema = z.object({
  id: z.number().optional(),
  tipoItem: z.enum(['SERVICO', 'PRODUTO']),
  servicoId: z.coerce.number().optional(),
  produtoId: z.coerce.number().optional(),
  descricao: z.string().min(1, 'Informe a descrição'),
  quantidade: z.coerce.number().int('Quantidade deve ser um número inteiro').positive('Quantidade inválida'),
  valorUnitario: z.coerce.number().min(0, 'Valor inválido'),
  tempoVendidoMinutos: z.coerce.number().min(0).optional(),
  precificadoPorHT: z.boolean().optional(),
});

const schema = z.object({
  clienteId: z.coerce.number().positive('Selecione o cliente'),
  veiculoId: z.coerce.number().positive('Selecione o veículo'),
  validadeDias: z.coerce.number().optional(),
  // "yyyy-MM-ddTHH:mm" local, sem fuso — o backend guarda LocalDateTime e
  // compara com o próprio relógio. Base do "tempo médio de resposta" do
  // consultor (emissão − entrada), por isso não pode estar no futuro.
  dataEntradaVeiculo: z
    .string()
    .optional()
    .refine((v) => !v || new Date(v).getTime() <= Date.now() + 60_000, 'A entrada não pode estar no futuro'),
  observacoes: z.string().optional(),
  itens: z
    .array(itemSchema)
    .min(1, 'Adicione ao menos um item')
    .refine((itens) => !temServicoPorHTSemTempo(itens), MENSAGEM_SERVICO_SEM_TEMPO),
});

type FormValues = z.infer<typeof schema>;

// Usado tanto pra popular o form ao carregar um orçamento existente quanto
// pra sincronizar os ids reais dos itens depois do auto-save silencioso (ver
// garantirOrigem) — o mesmo mapeamento de resposta da API pro shape do form.
function itensParaFormValues(itens: OrcamentoResponse['itens']): FormValues['itens'] {
  return (
    itens?.map((i) => ({
      id: i.id,
      tipoItem: i.tipoItem ?? 'SERVICO',
      servicoId: i.servicoId ?? undefined,
      produtoId: i.produtoId ?? undefined,
      descricao: i.descricao ?? '',
      quantidade: i.quantidade ?? 1,
      valorUnitario: i.valorUnitario ?? 0,
      tempoVendidoMinutos: i.tempoVendidoMinutos ?? undefined,
    })) ?? []
  );
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
  // "/orcamentos/novo" e "/orcamentos/:id" apontam pro mesmo elemento de rota,
  // então o React Router reaproveita a mesma instância do componente ao
  // navegar entre os dois (ou entre dois orçamentos diferentes) — sem isso, o
  // useForm mantém os valores antigos em memória, já que só é resetado
  // reativamente quando existe um `orcamento` carregado (fluxo de edição). O
  // `key` força um remount completo (useForm do zero) toda vez que o alvo
  // muda, seja "novo" ou outro id.
  const { id } = useParams();
  return <OrcamentoFormContent key={id ?? 'novo'} />;
}

function OrcamentoFormContent() {
  const { id } = useParams();
  const orcamentoId = id ? Number(id) : undefined;
  const isEditing = !!orcamentoId;
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const perfil = useAuthStore((s) => s.perfil);
  // Atalho de UX, não trava de segurança (ver lib/perfil.ts): Mecânico não
  // tem nenhum motivo de negócio pra estar aqui (orçamento é conversa com o
  // cliente antes da OS existir, não faz parte do trabalho técnico) — nem
  // /orcamentos/novo nem /orcamentos/:id aparecem no menu dele, mas nada
  // impedia acessar direto pela URL. Redireciona pra onde o perfil realmente
  // deveria estar em vez de deixar o formulário completo (itens, valores)
  // aberto pra edição.
  const redirecionandoForaDeOrcamento = isMecanico(perfil);
  useEffect(() => {
    if (redirecionandoForaDeOrcamento) navigate(getLandingPath(hasPermission, perfil), { replace: true });
  }, [redirecionandoForaDeOrcamento, hasPermission, perfil, navigate]);

  const { data: orcamento, isLoading } = useOrcamento(orcamentoId);
  const createMutation = useCreateOrcamento();
  const updateMutation = useUpdateOrcamento();
  // Id de um rascunho criado silenciosamente (ver garantirOrigem) antes do
  // usuário clicar em "Criar rascunho" — a URL continua em /orcamentos/novo
  // (evita o remount forçado pelo `key` do wrapper), mas a partir daqui o
  // registro já existe de verdade no backend.
  const [savedId, setSavedId] = useState<number | undefined>(undefined);
  const efetivoId = orcamentoId ?? savedId;

  const [buscaClienteInput, setBuscaClienteInput] = useState('');
  const [buscaVeiculo, setBuscaVeiculo] = useState('');
  const buscaCliente = useDebouncedValue(buscaClienteInput, 300);
  const { data: clientes, isFetching: buscandoClientes } = useClientes({ size: 20, busca: buscaCliente || undefined });

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { itens: [], validadeDias: 7, dataEntradaVeiculo: toDateTimeLocalValue(new Date().toISOString()) },
  });
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = methods;
  const clienteId = watch('clienteId');
  const veiculoId = watch('veiculoId');
  const { data: veiculos, isFetching: buscandoVeiculos } = useVeiculosDoCliente(clienteId || undefined);

  const readOnly = isEditing && orcamento?.status !== 'RASCUNHO';
  const selectedVeiculo = veiculos?.find((v) => v.id === veiculoId);
  const imagemVeiculo = useModeloVeiculoImagem(selectedVeiculo?.marca, selectedVeiculo?.modelo);

  useEffect(() => {
    if (orcamento) {
      reset({
        clienteId: orcamento.clienteId ?? 0,
        veiculoId: orcamento.veiculoId ?? 0,
        validadeDias: orcamento.validadeDias ?? 7,
        dataEntradaVeiculo: toDateTimeLocalValue(orcamento.dataEntradaVeiculo),
        observacoes: orcamento.observacoes ?? '',
        itens: itensParaFormValues(orcamento.itens),
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

  // "id" e "precificadoPorHT" são só do form; serviço cobrado pela hora
  // técnica vai sem valorUnitario pro backend calcular (ver itemParaPayload).
  function paraPayload(values: FormValues) {
    return {
      ...values,
      // Vazio = não informado: na criação o backend assume "agora"; na edição mantém o que já tinha.
      dataEntradaVeiculo: values.dataEntradaVeiculo || undefined,
      itens: values.itens.map(itemParaPayload),
    };
  }

  async function onSubmit(values: FormValues) {
    try {
      if (efetivoId) {
        await updateMutation.mutateAsync({ id: efetivoId, payload: paraPayload(values) });
        toast.success(orcamentoId ? 'Orçamento atualizado.' : 'Orçamento criado como rascunho.');
      } else {
        await createMutation.mutateAsync(paraPayload(values));
        toast.success('Orçamento criado como rascunho.');
      }
      navigate('/orcamentos');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o orçamento.'));
    }
  }

  // Chamado pela primeira vez que o consultor pede desconto ou reserva de
  // estoque num orçamento ainda não salvo — as duas ações do backend exigem
  // um id de orçamento (e de item) real, então salvamos o rascunho na hora,
  // silenciosamente, sem esperar o clique em "Criar rascunho". Só roda uma
  // vez: com efetivoId já definido, devolve a origem existente direto.
  async function garantirOrigem() {
    if (efetivoId) return { tipo: 'ORCAMENTO' as const, id: efetivoId };
    const valores = getValues();
    if (!valores.clienteId || !valores.veiculoId) {
      toast.error('Selecione cliente e veículo antes de solicitar desconto ou reservar estoque.');
      return undefined;
    }
    // Esse auto-save pula o zod (usa getValues direto) — sem esta checagem um
    // serviço pela hora técnica sem tempo iria com valorUnitario 0 e ficaria
    // gravado a R$ 0, já desatrelado da hora técnica ao recarregar.
    if (temServicoPorHTSemTempo(valores.itens)) {
      toast.error(MENSAGEM_SERVICO_SEM_TEMPO);
      return undefined;
    }
    try {
      const criado = await createMutation.mutateAsync(paraPayload(valores));
      if (!criado.id) return undefined;
      setSavedId(criado.id);
      reset({
        clienteId: criado.clienteId ?? valores.clienteId,
        veiculoId: criado.veiculoId ?? valores.veiculoId,
        validadeDias: criado.validadeDias ?? valores.validadeDias,
        dataEntradaVeiculo: toDateTimeLocalValue(criado.dataEntradaVeiculo) || valores.dataEntradaVeiculo,
        observacoes: criado.observacoes ?? valores.observacoes,
        itens: itensParaFormValues(criado.itens),
      });
      toast.success('Rascunho salvo automaticamente.');
      return { tipo: 'ORCAMENTO' as const, id: criado.id };
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o rascunho automaticamente.'));
      return undefined;
    }
  }

  if (isEditing && isLoading) return <PageSpinner />;
  if (redirecionandoForaDeOrcamento) return <PageSpinner />;

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
        subtitle={
          orcamento?.consultorNome
            ? `Consultor: ${orcamento.consultorNome}${orcamento.dataEmissao ? ` · emitido em ${formatDateTime(orcamento.dataEmissao)}` : ''}`
            : undefined
        }
        action={
          <div className="flex items-center gap-2">
            {orcamento?.tokenAprovacao && orcamento.status !== 'RASCUNHO' && (
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
              {/* Não uso <fieldset disabled> aqui — com className="contents" (necessário
                  pra não quebrar o grid abaixo) o Chrome/Firefox não propaga o disabled
                  pros campos descendentes, então cada controle recebe o disabled
                  explicitamente. */}
              <div className="contents">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name="clienteId"
                    render={({ field }) => (
                      <Combobox
                        label="Cliente"
                        required
                        disabled={readOnly}
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
                        disabled={readOnly || !clienteId}
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
                  <Input label="Validade (dias)" type="number" disabled={readOnly} {...register('validadeDias')} />
                  <Input
                    label="Entrada do veículo"
                    type="datetime-local"
                    disabled={readOnly}
                    max={toDateTimeLocalValue(new Date().toISOString())}
                    hint="Usada no tempo de resposta do orçamento"
                    error={errors.dataEntradaVeiculo?.message}
                    {...register('dataEntradaVeiculo')}
                  />
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
                        <div className="mb-3 flex items-center gap-2">
                          <ModeloVeiculoThumb base64={imagemVeiculo} size={32} />
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                            Dados do veículo
                          </p>
                        </div>
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
                  <ItemsEditor
                    name="itens"
                    mostrarTempoVendido
                    disabled={readOnly}
                    origem={efetivoId ? { tipo: 'ORCAMENTO', id: efetivoId } : undefined}
                    onGarantirOrigem={garantirOrigem}
                  />
                  {erroListaItens(errors.itens) && (
                    <p className="mt-1 text-xs font-medium text-danger">{erroListaItens(errors.itens)}</p>
                  )}
                  <div className="mt-3">
                    <HoraTecnicaReferencia name="itens" />
                  </div>
                </div>

                <div className="mt-4">
                  <Textarea label="Observações" disabled={readOnly} {...register('observacoes')} />
                </div>
              </div>

              {!readOnly && (
                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button type="submit" loading={saving}>
                    {efetivoId ? 'Salvar alterações' : 'Criar rascunho'}
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
