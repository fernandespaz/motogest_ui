import { useEffect, useState } from 'react';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, Send, MessageCircle, Play, Pause, PlayCircle, AlertTriangle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { useClientes } from '@/hooks/useClientes';
import { useVeiculosDoCliente } from '@/hooks/useClientes';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { isMecanico } from '@/lib/perfil';
import {
  useCreateOrdemServico,
  useOrdemServico,
  useUpdateOrdemServico,
  useAtualizarStatusOS,
  useEnviarOS,
  useTimerStartOS,
  useTimerPauseOS,
  useTimerResumeOS,
} from '@/hooks/useOrdensServico';
import {
  ItemsEditor,
  MENSAGEM_SERVICO_SEM_TEMPO,
  erroListaItens,
  itemParaPayload,
  temServicoPorHTSemTempo,
} from '@/features/shared/ItemsEditor';
import { HoraTecnicaReferencia } from '@/features/shared/HoraTecnicaReferencia';
import { ConsultorBadge } from '@/features/shared/ConsultorBadge';
import { ChecklistTab } from './ChecklistTab';
import { FotosTab } from './FotosTab';
import type { ClienteResponse, OrdemServicoStatus } from '@/api/types';
import { ordemServicoStatusMeta, metaFor } from '@/lib/statusMeta';
import { toDateTimeLocalValue, formatMinutosParaHoras, formatDateTime } from '@/lib/formatters';
import { buildOrdemServicoPdfBlob } from './ordemServicoPdf';
import { openPdfInNewTab } from '@/lib/downloadBlob';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

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
  usuarioResponsavelId: z.coerce.number().optional(),
  dataPrevisao: z.string().optional(),
  kmEntrada: z.coerce.number().optional(),
  observacoes: z.string().optional(),
  itens: z
    .array(itemSchema)
    .min(1, 'Adicione ao menos um item')
    .refine((itens) => !temServicoPorHTSemTempo(itens), MENSAGEM_SERVICO_SEM_TEMPO),
});

type FormValues = z.infer<typeof schema>;

// PUT /ordens-servico/{id} bloqueia por completo a partir daqui (ver Swagger) —
// só resta olhar (PDF, checklists, fotos), nunca editar campos.
const STATUS_BLOQUEIA_EDICAO: OrdemServicoStatus[] = [
  'EM_ANDAMENTO',
  'AGUARDANDO_PECA',
  'PAUSADA',
  'CONCLUIDA',
  'CANCELADA',
  'ENTREGUE',
];

// PATCH /status recusa Em Andamento/Pausada como destino, exceto vindo de
// Aguardando Peça — fora isso, essas duas transições passam pelos botões do
// cronômetro (Iniciar/Pausar/Retomar), não pelo seletor genérico de status.
const statusOptionsPara = (statusAtual?: OrdemServicoStatus): OrdemServicoStatus[] => {
  const base: OrdemServicoStatus[] = [
    'ABERTA',
    'AGUARDANDO_APROVACAO',
    'APROVADA',
    'AGUARDANDO_PECA',
    'CONCLUIDA',
    'CANCELADA',
    'ENTREGUE',
  ];
  const opcoes: OrdemServicoStatus[] =
    statusAtual === 'AGUARDANDO_PECA' ? [...base, 'EM_ANDAMENTO', 'PAUSADA'] : [...base];
  // Em Andamento/Pausada normalmente só aparecem como opção partindo de
  // Aguardando Peça — mas o <select> precisa ter o status atual na lista pra
  // exibi-lo corretamente, senão ele cai pro primeiro item por padrão mesmo
  // com a OS realmente Em Andamento/Pausada (via cronômetro).
  if (statusAtual && !opcoes.includes(statusAtual)) opcoes.push(statusAtual);
  return opcoes;
};

export function OrdemServicoFormPage() {
  const { id } = useParams();
  const osId = id ? Number(id) : undefined;
  const isEditing = !!osId;
  const navigate = useNavigate();
  const [tab, setTab] = useState('dados');
  const [pausaModalAberto, setPausaModalAberto] = useState(false);
  const [motivoPausa, setMotivoPausa] = useState('');

  const { data: os, isLoading } = useOrdemServico(osId);
  const usuarioLogadoId = useAuthStore((s) => s.usuarioId);
  const perfil = useAuthStore((s) => s.perfil);
  // Atalho de UX, não trava de segurança (ver lib/perfil.ts): quem chega aqui
  // digitando a URL como Mecânico é redirecionado pra tela própria dele
  // (/minhas-os/:id, só leitura pros dados da OS) em vez de ver o formulário
  // completo do Consultor — mesmo caminho que a lista geral e "Minhas OS" já
  // usam pra nunca levar o Mecânico até aqui.
  const redirecionandoParaTelaDoMecanico = isEditing && isMecanico(perfil);
  useEffect(() => {
    if (redirecionandoParaTelaDoMecanico) navigate(`/minhas-os/${osId}`, { replace: true });
  }, [redirecionandoParaTelaDoMecanico, osId, navigate]);
  const createMutation = useCreateOrdemServico();
  const updateMutation = useUpdateOrdemServico();
  const atualizarStatus = useAtualizarStatusOS();
  const enviarOS = useEnviarOS();
  const timerStart = useTimerStartOS();
  const timerPause = useTimerPauseOS();
  const timerResume = useTimerResumeOS();

  const [buscaClienteInput, setBuscaClienteInput] = useState('');
  const [buscaVeiculo, setBuscaVeiculo] = useState('');
  const buscaCliente = useDebouncedValue(buscaClienteInput, 300);
  const { data: clientes, isFetching: buscandoClientes } = useClientes({ size: 20, busca: buscaCliente || undefined });
  const { data: usuarios } = useUsuarios();
  // Só técnicos (perfil Mecânico) executam OS — Administrador e Consultor
  // ficam de fora da lista pra um NOVO responsável.
  const mecanicos = usuarios?.filter((u) => isMecanico(u.perfilNome)) ?? [];
  // Perfis sem USUARIO_READ não carregam a lista completa; e se o
  // responsável já atribuído não for (mais) Mecânico — perfil trocado depois,
  // por exemplo — ele ainda entra na lista pra não sumir do seletor com o
  // valor certo salvo por trás.
  const responsavelAtual =
    os?.usuarioResponsavelId != null && os.usuarioResponsavelNome
      ? { id: os.usuarioResponsavelId, nome: os.usuarioResponsavelNome }
      : undefined;
  const responsavelOptions = usuarios
    ? responsavelAtual && !mecanicos.some((u) => u.id === responsavelAtual.id)
      ? [...mecanicos, responsavelAtual]
      : mecanicos
    : responsavelAtual
      ? [responsavelAtual]
      : [];

  const methods = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { itens: [] } });
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
  const { data: veiculos, isFetching: buscandoVeiculos } = useVeiculosDoCliente(clienteId || undefined);

  const readOnly = isEditing && STATUS_BLOQUEIA_EDICAO.includes(os?.status as OrdemServicoStatus);
  // "Enviar" só funciona a partir de ABERTA (o backend rejeita com 422 fora
  // disso) — é o único jeito de gerar o tokenAprovacao usado por "Compartilhar"
  // depois, inclusive quando um edit reverte uma OS já Aprovada de volta pra
  // Aguardando Aprovação (PUT já revalida esse status sozinho; só falta avisar
  // o cliente do valor novo, e pra isso precisa do token que já existe).
  const podeEnviar = isEditing && os?.status === 'ABERTA';
  // Só o técnico atribuído inicia o cronômetro — se ainda não tem responsável
  // definido, libera pra quem estiver vendo (alguém precisa poder assumir).
  // O backend hoje NÃO valida isso (testado: qualquer usuário autenticado
  // consegue chamar /timer/start numa OS de outro técnico) — esse gate aqui é
  // só de UI; a garantia de verdade precisa vir do backend também.
  const podeIniciar =
    isEditing &&
    os?.status === 'APROVADA' &&
    (os?.usuarioResponsavelId == null || os.usuarioResponsavelId === usuarioLogadoId);
  const podePausar = isEditing && os?.status === 'EM_ANDAMENTO';
  const podeRetomar = isEditing && os?.status === 'PAUSADA';
  const podeCompartilhar = isEditing && !!os?.tokenAprovacao && os?.status !== 'ABERTA';

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
            id: i.id,
            tipoItem: i.tipoItem ?? 'SERVICO',
            servicoId: i.servicoId ?? undefined,
            produtoId: i.produtoId ?? undefined,
            descricao: i.descricao ?? '',
            quantidade: i.quantidade ?? 1,
            valorUnitario: i.valorUnitario ?? 0,
            tempoVendidoMinutos: i.tempoVendidoMinutos ?? undefined,
          })) ?? [],
      });
    }
  }, [os, reset]);

  const clienteOptions: ComboboxOption[] = (clientes?.content ?? []).map((c: ClienteResponse) => ({
    value: c.id!,
    label: c.nome ?? '',
  }));
  // A lista de clientes é uma busca paginada — ao editar uma OS já criada, o
  // cliente dela pode não estar nessa página, o que deixaria o combobox sem
  // rótulo pra um value que já está de fato selecionado.
  if (clienteId && os?.clienteNome && !clienteOptions.some((o) => o.value === clienteId)) {
    clienteOptions.unshift({ value: clienteId, label: os.clienteNome });
  }

  const veiculoOptions: ComboboxOption[] = (veiculos ?? [])
    .filter((v) => {
      const termo = buscaVeiculo.trim().toLowerCase();
      if (!termo) return true;
      return (
        v.placa?.toLowerCase().includes(termo) || `${v.marca ?? ''} ${v.modelo ?? ''}`.toLowerCase().includes(termo)
      );
    })
    .map((v) => ({
      value: v.id!,
      label: v.placa ?? '',
      sublabel: `${v.marca ?? ''} ${v.modelo ?? ''}`.trim() || undefined,
    }));

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        dataPrevisao: values.dataPrevisao ? new Date(values.dataPrevisao).toISOString() : undefined,
        // "id" e "precificadoPorHT" são só do form; serviço cobrado pela hora
        // técnica vai sem valorUnitario pro backend calcular (ver itemParaPayload).
        itens: values.itens.map(itemParaPayload),
      };
      if (isEditing && osId) {
        const atualizada = await updateMutation.mutateAsync({ id: osId, payload });
        // O backend só reverte pra Aguardando Aprovação quando o valor total
        // aumenta (edições que não mudam o valor, como reatribuir o técnico,
        // mantêm a OS Aprovada) — por isso o toast segue o status que
        // realmente voltou na resposta, não o status anterior à edição.
        toast.success(
          os?.status === 'APROVADA' && atualizada.status === 'AGUARDANDO_APROVACAO'
            ? 'OS atualizada — voltou para aguardando aprovação do cliente.'
            : 'Ordem de Serviço atualizada.',
        );
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Ordem de Serviço criada.');
      }
      navigate('/ordens-servico');
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

  async function handleEnviar() {
    if (!osId) return;
    try {
      await enviarOS.mutateAsync(osId);
      toast.success('OS enviada — aguardando aprovação do cliente.');
      if (os?.tokenAprovacao) compartilharWhatsApp();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível enviar a OS.'));
    }
  }

  function compartilharWhatsApp() {
    if (!os?.tokenAprovacao) return;
    const link = `${window.location.origin}/ordens-servico/publico/${os.tokenAprovacao}`;
    const texto = `Olá! Segue a Ordem de Serviço ${os.numero ?? `#${os.id}`}${os.clienteNome ? ` para ${os.clienteNome}` : ''}. Você pode conferir e aprovar por aqui: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  async function handleIniciar() {
    if (!osId) return;
    try {
      await timerStart.mutateAsync(osId);
      toast.success('Cronômetro iniciado.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível iniciar o cronômetro.'));
    }
  }

  async function handleConfirmarPausa() {
    if (!osId || !motivoPausa.trim()) return;
    try {
      await timerPause.mutateAsync({ id: osId, motivo: motivoPausa.trim() });
      toast.success('OS pausada.');
      setPausaModalAberto(false);
      setMotivoPausa('');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível pausar a OS.'));
    }
  }

  async function handleRetomar() {
    if (!osId) return;
    try {
      await timerResume.mutateAsync(osId);
      toast.success('Cronômetro retomado.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível retomar a OS.'));
    }
  }

  async function baixarPdf() {
    if (!osId || !os) return;
    try {
      await openPdfInNewTab(() => buildOrdemServicoPdfBlob(os), `os-${os.numero ?? osId}.pdf`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível gerar o PDF.'));
    }
  }

  if (isEditing && isLoading) return <PageSpinner />;
  if (redirecionandoParaTelaDoMecanico) return <PageSpinner />;

  const saving = createMutation.isPending || updateMutation.isPending;
  const temCronometro = isEditing && !!(os?.tempoVendidoMinutos || os?.tempoConsumidoMinutos || os?.pausas?.length);

  return (
    <div>
      <PageHeader
        title={isEditing ? `OS ${os?.numero ?? `#${osId}`}` : 'Nova Ordem de Serviço'}
        // Não é um campo do request (o backend atribui a partir do orçamento
        // de origem, ver OrdemServicoRequest em openapi.json) — só exibição,
        // pra rastreabilidade no fechamento de mês: quem converteu o
        // orçamento nesta OS.
        subtitle={isEditing ? <ConsultorBadge nome={os?.consultorNome ?? '—'} /> : undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isEditing && (
              <>
                <Badge tone={metaFor(ordemServicoStatusMeta, os?.status).tone}>
                  {metaFor(ordemServicoStatusMeta, os?.status).label}
                </Badge>
                {os?.status === 'APROVADA' &&
                  os.usuarioResponsavelId != null &&
                  os.usuarioResponsavelId !== usuarioLogadoId && (
                    <span className="text-xs text-ink-muted">
                      Atribuída a {os.usuarioResponsavelNome} — só ele pode iniciar
                    </span>
                  )}
                {podeEnviar && (
                  <Button variant="secondary" size="sm" onClick={handleEnviar} loading={enviarOS.isPending}>
                    <Send size={16} /> Enviar para aprovação
                  </Button>
                )}
                {podeCompartilhar && (
                  <Button variant="secondary" size="sm" onClick={compartilharWhatsApp}>
                    <MessageCircle size={16} /> Compartilhar
                  </Button>
                )}
                {podeIniciar && (
                  <Button variant="secondary" size="sm" onClick={handleIniciar} loading={timerStart.isPending}>
                    <PlayCircle size={16} /> Iniciar
                  </Button>
                )}
                {podePausar && (
                  <Button variant="secondary" size="sm" onClick={() => setPausaModalAberto(true)}>
                    <Pause size={16} /> Pausar
                  </Button>
                )}
                {podeRetomar && (
                  <Button variant="secondary" size="sm" onClick={handleRetomar} loading={timerResume.isPending}>
                    <Play size={16} /> Retomar
                  </Button>
                )}
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
            {statusOptionsPara(os?.status).map((s) => (
              <option key={s} value={s}>
                {metaFor(ordemServicoStatusMeta, s).label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {temCronometro && (
        <Card className="mb-4">
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Tempo vendido</p>
                  <p className="font-mono text-lg font-semibold text-ink">
                    {formatMinutosParaHoras(os?.tempoVendidoMinutos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Tempo consumido</p>
                  <p className="font-mono text-lg font-semibold text-ink">
                    {formatMinutosParaHoras(os?.tempoConsumidoMinutos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {os?.tempoEstourado ? 'Estouro' : 'Restante'}
                  </p>
                  <p
                    className={
                      os?.tempoEstourado
                        ? 'font-mono text-lg font-semibold text-danger'
                        : 'font-mono text-lg font-semibold text-ink'
                    }
                  >
                    {formatMinutosParaHoras((os?.tempoVendidoMinutos ?? 0) - (os?.tempoConsumidoMinutos ?? 0))}
                  </p>
                </div>
              </div>
              {os?.tempoEstourado && (
                <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-danger">
                  <AlertTriangle size={15} /> Tempo estourado
                </span>
              )}
            </div>

            {os?.pausas && os.pausas.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <Clock size={13} /> Histórico de pausas
                </p>
                <div className="flex flex-col gap-1.5">
                  {os.pausas.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-ink">{p.motivo}</span>
                      <span className="text-ink-muted">
                        {formatDateTime(p.inicio)} {p.fim ? `→ ${formatDateTime(p.fim)}` : '(em andamento)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
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
                          placeholder="Buscar por nome..."
                          value={field.value || undefined}
                          onChange={(value) => {
                            field.onChange(value);
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
                    <Controller
                      control={control}
                      name="usuarioResponsavelId"
                      render={({ field }) => (
                        <Select
                          label="Técnico Resp."
                          disabled={readOnly}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        >
                          <option value="">Não definido</option>
                          {responsavelOptions.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nome}
                            </option>
                          ))}
                        </Select>
                      )}
                    />
                    <Input
                      label="Previsão de conclusão"
                      type="datetime-local"
                      disabled={readOnly}
                      {...register('dataPrevisao')}
                    />
                    <Input label="KM de entrada" type="number" disabled={readOnly} {...register('kmEntrada')} />
                  </div>

                  <div className="mt-4 border-t border-border pt-4">
                    <ItemsEditor
                      name="itens"
                      mostrarTempoVendido
                      disabled={readOnly}
                      limitarQuantidadeAoEstoque
                      origem={osId ? { tipo: 'ORDEM_SERVICO', id: osId } : undefined}
                    />
                    {erroListaItens(errors.itens) && (
                      <p className="mt-1 text-xs font-medium text-danger">{erroListaItens(errors.itens)}</p>
                    )}
                    <div className="mt-3">
                      <HoraTecnicaReferencia name="itens" />
                    </div>
                  </div>

                  <Textarea label="Observações" disabled={readOnly} {...register('observacoes')} />
                </div>

                {!readOnly && (
                  <div className="flex justify-end gap-2 border-t border-border pt-4">
                    <Button type="submit" loading={saving}>
                      {isEditing ? 'Salvar alterações' : 'Salvar'}
                    </Button>
                  </div>
                )}
                {readOnly && (
                  <p className="rounded-lg bg-surface-alt px-3 py-2 text-sm text-ink-muted">
                    Esta OS não está mais em um status editável — os dados ficam bloqueados a partir daqui.
                  </p>
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

      <Modal
        open={pausaModalAberto}
        onClose={() => setPausaModalAberto(false)}
        title="Pausar Ordem de Serviço"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPausaModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarPausa} loading={timerPause.isPending} disabled={!motivoPausa.trim()}>
              Confirmar pausa
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo da pausa"
          required
          placeholder="Ex.: aguardando peça, aguardando cliente..."
          value={motivoPausa}
          onChange={(e) => setMotivoPausa(e.target.value)}
        />
      </Modal>
    </div>
  );
}
