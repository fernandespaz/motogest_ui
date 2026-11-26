import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, ReadOnlyField } from '@/components/ui/Field';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useClientes } from '@/hooks/useClientes';
import { useVeiculosDoCliente } from '@/hooks/useClientes';
import type { ClienteResponse, OrcamentoResponse } from '@/api/types';
import { useCreateOrcamento, useOrcamento, useUpdateOrcamento } from '@/hooks/useOrcamentos';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAgendamento } from '@/hooks/useAgenda';
import {
  type ItemFormValue,
  ItemsEditor,
  MENSAGEM_SERVICO_SEM_TEMPO,
  erroListaItens,
  itemParaPayload,
  temServicoPorHTSemTempo,
} from '@/features/shared/ItemsEditor';
import { HoraTecnicaReferencia } from '@/features/shared/HoraTecnicaReferencia';
import { ModeloVeiculoThumb, useModeloVeiculoImagem } from '@/features/shared/ModeloVeiculoField';
import { ConsultorBadge } from '@/features/shared/ConsultorBadge';
import { VistoriaEntrada } from '@/features/vistoria/VistoriaEntrada';
import { MAX_AVARIAS, avariaSchema, avariasParaFormValues, avariasParaPayload } from '@/features/vistoria/avarias';
import { acrescimoSobreBase } from '@/lib/margem';
import { ehNivelCombustivel } from '@/lib/combustivel';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { formatCurrency, formatDateTime, formatDocumento, toDateTimeLocalValue } from '@/lib/formatters';
import { TOM_CATEGORIA_COMPLEXIDADE } from '@/lib/categoria';
import { useAuthStore } from '@/store/authStore';
import { isMecanico, isConsultor } from '@/lib/perfil';
import { getLandingPath } from '@/layout/nav';
import { resolverNomeFantasiaOficina } from '@/hooks/useOficina';
import { CamposInteressado, SeletorModoCliente, SugestoesClienteExistente } from './ClienteOrcamentoModo';
import { Disclosure } from '@/components/ui/Disclosure';
import { AvisoAlteracoesNaoSalvas } from '@/components/AvisoAlteracoesNaoSalvas';
import { ConcluirCadastroModal } from './ConcluirCadastroModal';
import { ResumoOrcamentoPanel, pendenciasEnvio } from './ResumoOrcamentoPanel';
import { VeiculoAvulsoSecao } from './VeiculoAvulsoSecao';
import { camposDoModo, orcamentoSemCadastro } from './orcamentoModo';

/** Quanto esperar sem novas alterações antes de salvar o rascunho sozinho. */
export const ATRASO_AUTOSAVE_MS = 2500;

/** Remove ausentes/nulos/'' (recursivo): o form guarda '' onde o servidor devolve nada, e isso não é diferença real. */
function semVazios(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(semVazios);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => x !== undefined && x !== null && x !== '')
        .map(([k, x]) => [k, semVazios(x)]),
    );
  }
  return v;
}

type EstadoAutosave = { estado: 'ocioso' | 'pendente' | 'salvando' | 'salvo' | 'erro' | 'incompleto'; em?: Date; erro?: string };

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
  // INTERNO: valor da peça e acréscimo do consultor. Valores já chegam como number (ou undefined) do ItemsEditor.
  custoUnitario: z.number().min(0, 'Valor da peça inválido').optional(),
  acrescimoPercentual: z.number().min(0, 'Acréscimo inválido').optional(),
}).refine((i) => i.acrescimoPercentual == null || i.custoUnitario != null, {
  path: ['custoUnitario'],
  message: 'Informe o valor da peça para usar o acréscimo',
});

const anoOpcional = z.preprocess(
  (v) => (v === '' || v == null ? undefined : Number(v)),
  z.number().int().min(1900, 'Ano inválido').max(new Date().getFullYear() + 1, 'Ano inválido').optional(),
);

const schema = z
  .object({
  // O que vai pro backend depende do modo (ver camposDoModo): cliente/veículo cadastrados OU interessado/veículo avulso.
  modo: z.enum(['CADASTRADO', 'INTERESSADO']),
  clienteId: z.coerce.number().optional(),
  veiculoId: z.coerce.number().optional(),
  interessadoNome: z.string().optional(),
  interessadoTelefone: z.string().optional(),
  interessadoEmail: z.string().optional(),
  veiculoCategoria: z.enum(['A', 'B', 'C']).optional().or(z.literal('')),
  veiculoPlaca: z.string().optional(),
  veiculoDescricao: z.string().optional(),
  // Demais dados do veículo avulso (os mesmos do cadastro de veículo). Anos vêm de <input type="number">: '' vira ausente.
  veiculoMarca: z.string().optional(),
  veiculoModelo: z.string().optional(),
  veiculoAnoFabricacao: anoOpcional,
  veiculoAnoModelo: anoOpcional,
  veiculoCor: z.string().optional(),
  veiculoChassi: z.string().optional(),
  // Vínculo com a Agenda. Não é editável aqui, mas PRECISA ir de volta no PUT: o backend grava null quando falta.
  agendamentoId: z.number().optional(),
  validadeDias: z.coerce.number().optional(),
  // "yyyy-MM-ddTHH:mm" local, sem fuso — o backend guarda LocalDateTime e
  // compara com o próprio relógio. Base do "tempo médio de resposta" do
  // consultor (emissão − entrada), por isso não pode estar no futuro.
  dataEntradaVeiculo: z
    .string()
    .optional()
    .refine((v) => !v || new Date(v).getTime() <= Date.now() + 60_000, 'A entrada não pode estar no futuro'),
  nivelCombustivel: z.number().optional(),
  avarias: z.array(avariaSchema).max(MAX_AVARIAS, `No máximo ${MAX_AVARIAS} avarias`),
  observacoes: z.string().optional(),
  itens: z
    .array(itemSchema)
    .min(1, 'Adicione ao menos um item')
    .refine((itens) => !temServicoPorHTSemTempo(itens), MENSAGEM_SERVICO_SEM_TEMPO),
  })
  .superRefine((v, ctx) => {
    if (v.modo === 'CADASTRADO') {
      if (!v.clienteId) ctx.addIssue({ code: 'custom', path: ['clienteId'], message: 'Selecione o cliente' });
      if (!v.veiculoId) ctx.addIssue({ code: 'custom', path: ['veiculoId'], message: 'Selecione o veículo' });
      return;
    }
    if (!v.interessadoNome?.trim()) ctx.addIssue({ code: 'custom', path: ['interessadoNome'], message: 'Informe o nome do cliente' });
    if (!v.veiculoCategoria) ctx.addIssue({ code: 'custom', path: ['veiculoCategoria'], message: 'Informe a categoria do veículo' });
    if (v.interessadoEmail?.trim() && !z.string().email().safeParse(v.interessadoEmail.trim()).success) {
      ctx.addIssue({ code: 'custom', path: ['interessadoEmail'], message: 'E-mail inválido' });
    }
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
      // Sem o valor da peça, o próximo save apagaria o custo gravado (o backend grava null quando falta).
      // O acréscimo não é gravado: reconstrói-se do preço atual, então um desconto aprovado aparece certo.
      // Item livre antigo (só preço, sem valor da peça): o preço vira o valor, com acréscimo zero — o consultor só informa o valor.
      custoUnitario: i.custoUnitario ?? (i.servicoId == null && i.produtoId == null ? (i.valorUnitario ?? undefined) : undefined),
      acrescimoPercentual:
        i.custoUnitario != null ? acrescimoSobreBase(i.custoUnitario, i.valorUnitario ?? 0) : undefined,
    })) ?? []
  );
}

// Campos do interessado/veículo avulso vindos da resposta (ausentes quando o orçamento é de cliente cadastrado).
function interessadoParaFormValues(o: OrcamentoResponse) {
  return {
    interessadoNome: o.interessadoNome ?? '',
    interessadoTelefone: o.interessadoTelefone ?? '',
    interessadoEmail: o.interessadoEmail ?? '',
    veiculoCategoria: o.veiculoCategoria ?? ('' as const),
    // Na resposta, veiculoPlaca já vem preenchida com a placa avulsa quando não há cadastro.
    veiculoPlaca: o.veiculoId == null ? (o.veiculoPlaca ?? '') : '',
    veiculoDescricao: o.veiculoDescricao ?? '',
    veiculoMarca: o.veiculoMarca ?? '',
    // Rascunho antigo só tem a descrição livre: ela vira o modelo e o consultor ajusta.
    veiculoModelo: o.veiculoModelo ?? (o.veiculoMarca ? '' : (o.veiculoDescricao ?? '')),
    veiculoAnoFabricacao: o.veiculoAnoFabricacao ?? undefined,
    veiculoAnoModelo: o.veiculoAnoModelo ?? undefined,
    veiculoCor: o.veiculoCor ?? '',
    veiculoChassi: o.veiculoChassi ?? '',
  };
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
  const nomeUsuarioLogado = useAuthStore((s) => s.nome);
  const usuarioId = useAuthStore((s) => s.usuarioId);
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
  // "Criar orçamento" na Agenda abre /orcamentos/novo?agendamentoId=N: cliente, veículo e vínculo já vêm preenchidos.
  const [searchParams] = useSearchParams();
  const agendamentoOrigemId = isEditing ? undefined : Number(searchParams.get('agendamentoId')) || undefined;
  const { data: agendamentoOrigem } = useAgendamento(agendamentoOrigemId);
  // "Novo orçamento" a partir do perfil do cliente: /orcamentos/novo?clienteId=&clienteNome=&veiculoId=.
  // clienteNome só rotula o campo enquanto a lista de clientes (paginada) não traz esse cliente.
  const clienteIdUrl = isEditing ? undefined : Number(searchParams.get('clienteId')) || undefined;
  const veiculoIdUrl = isEditing ? undefined : Number(searchParams.get('veiculoId')) || undefined;
  const clienteNomeUrl = isEditing ? undefined : searchParams.get('clienteNome') || undefined;
  // Mesmo atalho de UX do redirecionamento acima, não controle de acesso de
  // verdade (ver comentário em OrcamentosPage sobre o gap real: ORCAMENTO_READ
  // não distingue "ver os próprios" de "ver todos" no backend) — evita que um
  // consultor abra o orçamento de outro colando o id na URL, já que a lista
  // já esconde isso mas não impede o acesso direto.
  const bloqueadoPorOutroConsultor =
    isEditing && isConsultor(perfil) && orcamento?.consultorId != null && orcamento.consultorId !== usuarioId;
  useEffect(() => {
    if (bloqueadoPorOutroConsultor) {
      toast.error('Este orçamento pertence a outro consultor.');
      navigate('/orcamentos', { replace: true });
    }
  }, [bloqueadoPorOutroConsultor, navigate]);

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
    // agendamentoId vem do parâmetro da URL (não do GET do agendamento): se o GET falhar (sem AGENDA_READ, rede),
    // o vínculo com a Agenda não pode se perder em silêncio.
    defaultValues: { modo: 'CADASTRADO', clienteId: clienteIdUrl, veiculoId: clienteIdUrl ? veiculoIdUrl : undefined, itens: [], avarias: [], validadeDias: 7, agendamentoId: agendamentoOrigemId, dataEntradaVeiculo: toDateTimeLocalValue(new Date().toISOString()) },
  });
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isDirty },
  } = methods;
  const [concluindoCadastro, setConcluindoCadastro] = useState(false);
  // A navegação que o próprio formulário faz depois de salvar não pode disparar o aviso de "sair sem salvar".
  const saidaAposSalvar = useRef(false);
  // Salvamento automático do rascunho (ver autoSalvar). `emVoo` evita dois saves ao mesmo tempo (inclusive com o
  // clique em "Criar rascunho" e com o auto-save de desconto/reserva); `ultimoSalvo` é o payload que o servidor já tem.
  const [autosave, setAutosave] = useState<EstadoAutosave>({ estado: 'ocioso' });
  const efetivoIdRef = useRef<number | undefined>(undefined);
  efetivoIdRef.current = efetivoId;
  const emVoo = useRef<Promise<unknown> | null>(null);
  const ultimoSalvo = useRef<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoSalvarRef = useRef<() => Promise<void>>(async () => {});
  // Durante o reset() que devolve a resposta do servidor ao form, as notificações do react-hook-form não são edições.
  const sincronizando = useRef(false);
  const clienteId = watch('clienteId');
  const veiculoId = watch('veiculoId');
  const modo = watch('modo');
  const veiculoCategoriaAvulso = watch('veiculoCategoria');
  const interessadoTelefone = watch('interessadoTelefone');
  const interessadoEmail = watch('interessadoEmail');
  const semCadastro = modo === 'INTERESSADO';
  const itens = watch('itens') ?? [];
  const avarias = watch('avarias') ?? [];
  // A vistoria (canvas 3D) é opcional e pesada: começa fechada e só abre sozinha quando já há avarias
  // (orçamento salvo, ou marcadas antes) — senão o consultor pode ficar sem ver o que está registrado.
  const [vistoriaAberta, setVistoriaAberta] = useState(false);
  const temAvarias = avarias.length > 0;
  useEffect(() => {
    if (temAvarias) setVistoriaAberta(true);
  }, [temAvarias]);
  // Orçamento já salvo sem cliente cadastrado (diferente de só ter alternado o modo na tela).
  const semCadastroSalvo = orcamentoSemCadastro(orcamento);
  // Cria cliente e veículo junto: o backend exige as duas permissões de escrita.
  const podeConcluirCadastro =
    isEditing &&
    semCadastroSalvo &&
    orcamento?.status === 'RASCUNHO' &&
    hasPermission('ORCAMENTO_WRITE') &&
    hasPermission('CLIENTE_WRITE') &&
    hasPermission('VEICULO_WRITE');
  const { data: veiculos, isFetching: buscandoVeiculos } = useVeiculosDoCliente(clienteId || undefined);

  const readOnly = isEditing && orcamento?.status !== 'RASCUNHO';
  // Consultor não é um campo do request (o backend atribui pelo token de
  // quem cria/converte, ver OrcamentoRequest em openapi.json) — aqui é só
  // exibição, sempre bloqueada. Num orçamento existente mostra quem
  // efetivamente criou (pode ser outra pessoa editando); num novo, mostra
  // quem está logado agora, já que é quem o backend vai atribuir ao salvar.
  const consultorNome = isEditing ? (orcamento?.consultorNome ?? '—') : (nomeUsuarioLogado ?? '—');
  const selectedVeiculo = veiculos?.find((v) => v.id === veiculoId);
  const imagemVeiculo = useModeloVeiculoImagem(selectedVeiculo?.marca, selectedVeiculo?.modelo);

  useEffect(() => {
    if (!agendamentoOrigem || isEditing) return;
    reset({
      ...getValues(),
      clienteId: agendamentoOrigem.clienteId ?? 0,
      veiculoId: agendamentoOrigem.veiculoId ?? 0,
      observacoes: agendamentoOrigem.observacoes ?? '',
    });
    // só reaplica quando o agendamento de origem chega.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamentoOrigem]);

  function valoresDoOrcamento(o: OrcamentoResponse): FormValues {
    return {
      // Sem clienteId na resposta = orçamento criado "ainda não cadastrado".
      modo: o.clienteId == null ? 'INTERESSADO' : 'CADASTRADO',
      ...interessadoParaFormValues(o),
      clienteId: o.clienteId ?? 0,
      veiculoId: o.veiculoId ?? 0,
      agendamentoId: o.agendamentoId ?? undefined,
      validadeDias: o.validadeDias ?? 7,
      dataEntradaVeiculo: toDateTimeLocalValue(o.dataEntradaVeiculo),
      nivelCombustivel: ehNivelCombustivel(o.nivelCombustivel) ? o.nivelCombustivel : undefined,
      observacoes: o.observacoes ?? '',
      avarias: avariasParaFormValues(o.avarias),
      itens: itensParaFormValues(o.itens),
    } as FormValues;
  }

  // Compara "o que está num formulário" com "o que o servidor tem" sem ruído: valida/coage com o mesmo schema do
  // salvar (números como número), monta o payload e descarta vazios. Chave igual = nada a salvar.
  function chaveDeValores(valores: FormValues): string {
    const r = schema.safeParse(valores);
    return JSON.stringify(semVazios(paraPayload(r.success ? r.data : valores)));
  }
  const chaveAtual = () => chaveDeValores(getValues() as FormValues);

  // O orçamento chega do servidor: na 1ª vez popula o form. Depois (cada save invalida a consulta; desconto aprovado,
  // "concluir cadastro" etc. também mudam o registro) só reaplica quando é mudança de FORA e o consultor não tem
  // nada digitado a salvar — nunca pisa em alteração pendente, nem refaz as linhas por eco do próprio autosave.
  const carregado = useRef(false);
  useEffect(() => {
    if (!orcamento) return;
    const valores = valoresDoOrcamento(orcamento);
    if (!carregado.current) {
      carregado.current = true;
      reset(valores);
      // O que acabou de chegar do servidor já está salvo: não conta como alteração a salvar.
      ultimoSalvo.current = chaveAtual();
      return;
    }
    const doServidor = chaveDeValores(valores);
    if (doServidor === ultimoSalvo.current) return; // eco do que o próprio formulário salvou
    if (chaveAtual() !== ultimoSalvo.current) return; // há alterações do consultor a salvar: não sobrescreve
    reset(valores);
    ultimoSalvo.current = doServidor;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamento]);

  const clienteOptions: ComboboxOption[] = (clientes?.content ?? []).map((c: ClienteResponse) => ({
    value: c.id!,
    label: c.nome ?? '',
    sublabel: formatDocumento(c.documento ?? '', c.tipoPessoa === 'PJ' ? 'PJ' : 'PF'),
  }));
  // The client list above is a searched/paginated subset — when editing an
  // existing orçamento, its client may not be in it, which would otherwise
  // blank out the combobox's label for a value that's actually set.
  const nomeClienteConhecido = orcamento?.clienteNome ?? agendamentoOrigem?.clienteNome ?? clienteNomeUrl;
  if (clienteId && nomeClienteConhecido && !clienteOptions.some((o) => o.value === clienteId)) {
    clienteOptions.unshift({ value: clienteId, label: nomeClienteConhecido });
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

  // As posições 3D das avarias foram tiradas no modelo do veículo anterior — num carro diferente os pinos
  // ficariam em lugares sem sentido (e seriam salvos assim). Mesmo princípio dos itens ao trocar o cliente.
  function descartarAvarias() {
    if ((getValues('avarias') ?? []).length === 0) return;
    setValue('avarias', []);
    toast.info('As avarias marcadas foram removidas ao trocar de veículo.');
  }

  // "id" e "precificadoPorHT" são só do form; serviço cobrado pela hora
  // técnica vai sem valorUnitario pro backend calcular (ver itemParaPayload).
  function paraPayload(values: FormValues) {
    const { modo: modoValor, ...resto } = values;
    return {
      ...camposDoModo(modoValor, { ...resto, veiculoCategoria: resto.veiculoCategoria || undefined }),
      // Vazio = não informado: na criação o backend assume "agora"; na edição mantém o que já tinha.
      dataEntradaVeiculo: values.dataEntradaVeiculo || undefined,
      itens: values.itens.map(itemParaPayload),
      // A vistoria só existe com veículo cadastrado (some da tela sem cadastro) e o backend recusa avaria com foto
      // sem veículo: ao alternar pra "ainda não cadastrado" as avarias antigas não podem seguir escondidas no payload.
      avarias: modoValor === 'INTERESSADO' ? [] : avariasParaPayload(values.avarias),
    };
  }

  // Volta ao form o que o servidor devolveu (ids reais dos itens, valores normalizados) — assim desconto/reserva
  // enxergam os itens salvos e o formulário deixa de contar como "sujo". Os campos que só existem na tela
  // (hora técnica, valor da hora do catálogo) e as avarias vêm do que está no form agora.
  function sincronizarComResposta(resposta: OrcamentoResponse, valores: FormValues) {
    const doServidor = itensParaFormValues(resposta.itens);
    const naTela = (getValues('itens') ?? []) as ItemFormValue[];
    const itensSync =
      doServidor.length === naTela.length
        ? doServidor.map((it, i) => ({ ...it, precificadoPorHT: naTela[i].precificadoPorHT, precoPorHoraCatalogo: naTela[i].precoPorHoraCatalogo }))
        : doServidor;
    sincronizando.current = true;
    reset({
      modo: valores.modo,
      ...interessadoParaFormValues(resposta),
      clienteId: resposta.clienteId ?? valores.clienteId,
      veiculoId: resposta.veiculoId ?? valores.veiculoId,
      agendamentoId: resposta.agendamentoId ?? valores.agendamentoId,
      validadeDias: resposta.validadeDias ?? valores.validadeDias,
      dataEntradaVeiculo: toDateTimeLocalValue(resposta.dataEntradaVeiculo) || valores.dataEntradaVeiculo,
      nivelCombustivel: ehNivelCombustivel(resposta.nivelCombustivel) ? resposta.nivelCombustivel : valores.nivelCombustivel,
      observacoes: resposta.observacoes ?? valores.observacoes,
      // Avarias não vêm do servidor de volta: a lista da tela é a fonte da verdade (o payload nunca
      // usa o id delas) e o getValues pega o que o consultor marcou enquanto o save estava em voo.
      avarias: getValues('avarias') ?? valores.avarias,
      itens: itensSync as FormValues['itens'],
    });
    // O que o form tem agora (já normalizado pelo servidor: '' no lugar de ausente etc.) É o que está salvo.
    ultimoSalvo.current = chaveAtual();
    // As notificações do reset chegam de forma síncrona; solta a trava logo depois do ciclo atual.
    queueMicrotask(() => {
      sincronizando.current = false;
    });
  }

  // O autosave NÃO usa reset(): ele recria as linhas dos itens e o campo onde o consultor está digitando perde o foco
  // (e o que ele digita a seguir se perde). Só entrega os ids reais dos itens (desconto/reserva precisam deles).
  function aplicarIdsDosItens(resposta: OrcamentoResponse) {
    const doServidor = resposta.itens ?? [];
    const naTela = (getValues('itens') ?? []) as ItemFormValue[];
    if (doServidor.length !== naTela.length) return;
    doServidor.forEach((it, i) => {
      if (it.id != null && naTela[i].id !== it.id) setValue(`itens.${i}.id` as 'itens.0.id', it.id, { shouldDirty: false });
    });
  }

  function agendarAutosave() {
    if (readOnly) return;
    // O que está na tela já é o que o servidor tem (ex.: ecos do reset que devolve a resposta): não é alteração.
    if (chaveAtual() === ultimoSalvo.current) return;
    clearTimeout(temporizador.current);
    setAutosave((a) => (a.estado === 'pendente' ? a : { ...a, estado: 'pendente' }));
    temporizador.current = setTimeout(() => void autoSalvarRef.current(), ATRASO_AUTOSAVE_MS);
  }

  // Salva o rascunho sozinho, sem toast nem navegação, quando o formulário já está válido (mesmas regras do "Criar
  // rascunho": identificação, ao menos um item, hora técnica com tempo). Incompleto não salva — só avisa o que falta.
  async function autoSalvar() {
    if (readOnly) return;
    if (emVoo.current) {
      agendarAutosave(); // há um save em andamento: tenta de novo depois dele
      return;
    }
    const validado = schema.safeParse(getValues());
    if (!validado.success) {
      setAutosave((a) => ({ ...a, estado: 'incompleto' }));
      return;
    }
    const payload = paraPayload(validado.data);
    const chave = chaveAtual();
    if (chave === ultimoSalvo.current) {
      setAutosave((a) => (a.em ? { ...a, estado: 'salvo' } : { estado: 'ocioso' }));
      return;
    }
    setAutosave((a) => ({ ...a, estado: 'salvando' }));
    const tarefa = (async () => {
      try {
        let resposta: OrcamentoResponse;
        if (efetivoIdRef.current) {
          resposta = await updateMutation.mutateAsync({ id: efetivoIdRef.current, payload });
        } else {
          resposta = await createMutation.mutateAsync(payload);
          if (resposta.id) {
            efetivoIdRef.current = resposta.id;
            setSavedId(resposta.id);
          }
        }
        ultimoSalvo.current = chave;
        setAutosave({ estado: 'salvo', em: new Date() });
        aplicarIdsDosItens(resposta);
        // Se algo mudou enquanto salvava, a próxima rodada cuida.
        if (chaveAtual() !== chave) agendarAutosave();
      } catch (error) {
        // Ex.: o backend recusa editar com desconto pendente de aprovação — mostra o motivo em vez de só "falhou".
        setAutosave((a) => ({ ...a, estado: 'erro', erro: extractErrorMessage(error, '') || undefined }));
      } finally {
        emVoo.current = null;
      }
    })();
    emVoo.current = tarefa;
    await tarefa;
  }
  autoSalvarRef.current = autoSalvar;

  // Qualquer edição do usuário (name definido; reset() não tem nome) reinicia a contagem para salvar. Vai por ref
  // porque o efeito é montado uma vez e `readOnly`/handlers mudam a cada render.
  const agendarRef = useRef(agendarAutosave);
  agendarRef.current = agendarAutosave;
  useEffect(() => {
    const assinatura = watch((_valores, { name }) => {
      if (name && !sincronizando.current) agendarRef.current();
    });
    return () => {
      assinatura.unsubscribe();
      clearTimeout(temporizador.current);
    };
  }, [watch]);

  // Roda um salvamento manual (clique em Salvar, auto-save de desconto/reserva) NA MESMA FILA do autosave: espera o que
  // estiver em voo, cancela o que estava agendado e publica a própria promessa — assim nenhum dos caminhos cria o
  // mesmo orçamento duas vezes nem se atropelam.
  async function protegido<T>(tarefa: () => Promise<T>): Promise<T> {
    if (emVoo.current) await emVoo.current;
    clearTimeout(temporizador.current);
    const promessa = tarefa();
    emVoo.current = promessa.then(
      () => undefined,
      () => undefined,
    );
    try {
      return await promessa;
    } finally {
      emVoo.current = null;
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      await protegido(async () => {
        const idAtual = efetivoIdRef.current;
        if (idAtual) {
          await updateMutation.mutateAsync({ id: idAtual, payload: paraPayload(values) });
          toast.success(orcamentoId ? 'Orçamento atualizado.' : 'Orçamento criado como rascunho.');
        } else {
          await createMutation.mutateAsync(paraPayload(values));
          toast.success('Orçamento criado como rascunho.');
        }
      });
      saidaAposSalvar.current = true;
      navigate('/orcamentos');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o orçamento.'));
      agendarAutosave(); // as alterações continuam pendentes: o autosave tenta de novo
    }
  }

  // Chamado pela primeira vez que o consultor pede desconto ou reserva de
  // estoque num orçamento ainda não salvo — as duas ações do backend exigem
  // um id de orçamento (e de item) real, então salvamos o rascunho na hora,
  // silenciosamente, sem esperar o clique em "Criar rascunho". Só roda uma
  // vez: com efetivoId já definido, devolve a origem existente direto.
  async function garantirOrigem() {
    if (emVoo.current) await emVoo.current; // o autosave pode estar criando o rascunho agora mesmo
    if (efetivoIdRef.current) return { tipo: 'ORCAMENTO' as const, id: efetivoIdRef.current };
    return protegido(() => criarRascunhoParaAcao());
  }

  async function criarRascunhoParaAcao() {
    // outra chamada pode ter criado enquanto esta esperava na fila
    if (efetivoIdRef.current) return { tipo: 'ORCAMENTO' as const, id: efetivoIdRef.current };
    const valores = getValues();
    if (valores.modo === 'CADASTRADO' && (!valores.clienteId || !valores.veiculoId)) {
      toast.error('Selecione cliente e veículo antes de solicitar desconto ou reservar estoque.');
      return undefined;
    }
    if (valores.modo === 'INTERESSADO' && (!valores.interessadoNome?.trim() || !valores.veiculoCategoria)) {
      toast.error('Informe o nome e a categoria do veículo antes de solicitar desconto ou reservar estoque.');
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
      efetivoIdRef.current = criado.id;
      sincronizarComResposta(criado, valores);
      if ((criado.avarias?.length ?? 0) < valores.avarias.length) {
        // Schema presente não prova persistência (ver prohibited-actions #5): se o backend devolveu menos
        // avarias do que enviamos, mantemos as da tela e avisamos em vez de mostrar sucesso silencioso.
        toast.error('O servidor não confirmou todas as avarias marcadas. Elas continuam na tela — revise antes de salvar.');
      } else {
        toast.success('Rascunho salvo automaticamente.');
      }
      return { tipo: 'ORCAMENTO' as const, id: criado.id };
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível salvar o rascunho automaticamente.'));
      return undefined;
    }
  }

  if (isEditing && isLoading) return <PageSpinner />;
  if (redirecionandoForaDeOrcamento || bloqueadoPorOutroConsultor) return <PageSpinner />;

  const saving = createMutation.isPending || updateMutation.isPending;
  const textoSalvamento = readOnly
    ? undefined
    : autosave.estado === 'salvando'
      ? 'Salvando…'
      : autosave.estado === 'pendente'
        ? 'Alterações ainda não salvas'
        : autosave.estado === 'erro'
          ? `Não foi possível salvar automaticamente${autosave.erro ? `: ${autosave.erro}` : ''}. Use o botão acima.`
          : autosave.estado === 'incompleto'
            ? efetivoId
              ? 'Complete os campos destacados para salvar automaticamente.'
              : 'Escolha cliente, veículo e ao menos 1 item para salvar automaticamente.'
            : autosave.estado === 'salvo' && autosave.em
              ? `Salvo automaticamente às ${format(autosave.em, 'HH:mm')}`
              : efetivoId
                ? undefined
                : 'O rascunho é salvo sozinho quando houver cliente, veículo e itens.';

  async function compartilharWhatsApp() {
    if (!orcamento?.tokenAprovacao) return;
    // Abre a aba em branco já no clique (preserva a ativação do usuário) e só
    // navega pra wa.me depois do await — do contrário o navegador bloqueia o
    // popup, já que ele deixaria de contar como resposta direta ao clique.
    const win = window.open('', '_blank');
    const nomeFantasia = await resolverNomeFantasiaOficina();
    const link = `${window.location.origin}/orcamentos/publico/${orcamento.tokenAprovacao}`;
    const texto = `Olá! Aqui é da ${nomeFantasia}. Segue o orçamento nº ${orcamento.id}${orcamento.clienteNome ? ` para ${orcamento.clienteNome}` : ''}, no valor de ${formatCurrency(orcamento.valorTotal)}. Você pode conferir e aprovar por aqui: ${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    if (win) win.location.href = url;
    else window.open(url, '_blank');
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? `Orçamento #${orcamentoId}` : 'Novo orçamento'}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <ConsultorBadge nome={consultorNome} />
            {orcamento?.dataEmissao && <span>· emitido em {formatDateTime(orcamento.dataEmissao)}</span>}
          </span>
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

      {agendamentoOrigem && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-ink dark:border-brand-800 dark:bg-brand-900/30">
          <p className="font-medium">
            Orçamento do agendamento de {formatDateTime(agendamentoOrigem.dataHora)} — {agendamentoOrigem.veiculoPlaca}
          </p>
          <p className="text-ink-muted">
            Serviços agendados: {agendamentoOrigem.servicos?.map((s) => s.nome).join(', ') || '—'}. Adicione-os como itens abaixo.
            Depois de aprovado, gere a OS pela Agenda ou pela lista de orçamentos.
          </p>
        </div>
      )}
      {isEditing && orcamento?.agendamentoId != null && hasPermission('AGENDA_READ') && (
        <p className="mb-4 text-sm text-ink-muted">
          Vinculado a um agendamento da <Link to="/agenda" className="text-brand-700 underline underline-offset-2 dark:text-brand-300">Agenda</Link>.
        </p>
      )}

      {/* Montado só aberto: nada é consultado antes de o consultor pedir, e cada abertura parte do zero. */}
      {podeConcluirCadastro && concluindoCadastro && orcamento && (
        <ConcluirCadastroModal open onClose={() => setConcluindoCadastro(false)} orcamento={orcamento} />
      )}

      {/* Perder a cotação por um clique no menu é o pior erro da tela: avisa antes de sair com alterações não salvas. */}
      <AvisoAlteracoesNaoSalvas
        ativo={isDirty && !readOnly && chaveAtual() !== ultimoSalvo.current}
        permitirSaida={saidaAposSalvar}
        mensagem="Este orçamento tem alterações que ainda não foram salvas."
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card>
            <CardBody className="flex flex-col gap-4">
              {/* Não uso <fieldset disabled> aqui — com className="contents" (necessário
                  pra não quebrar o grid abaixo) o Chrome/Firefox não propaga o disabled
                  pros campos descendentes, então cada controle recebe o disabled
                  explicitamente. */}
              <div className="contents">
                {!readOnly && (
                  <div className="mb-4 flex flex-col gap-3">
                    <SeletorModoCliente modo={modo} onChange={(m) => setValue('modo', m, { shouldDirty: true })} />
                    {isEditing && semCadastroSalvo && !semCadastro && !clienteId && (
                      <p className="text-sm text-ink-muted">
                        Escolha o cliente e o veículo cadastrados e salve — os itens do orçamento são mantidos.
                      </p>
                    )}
                    {!semCadastro && !clienteId && (
                      <SugestoesClienteExistente
                        telefone={interessadoTelefone}
                        email={interessadoEmail}
                        onEscolher={(id, nome) => {
                          setValue('clienteId', id, { shouldDirty: true });
                          setValue('veiculoId', 0);
                          setBuscaClienteInput(nome);
                        }}
                      />
                    )}
                  </div>
                )}
                {semCadastro && (
                  <div className="mb-4 flex flex-col gap-3">
                    <CamposInteressado disabled={readOnly} />
                    {!readOnly && <VeiculoAvulsoSecao />}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-alt px-3 py-2 text-xs text-ink-muted">
                      <p>
                        Dá para montar e salvar o rascunho agora. Para enviar ao cliente é preciso vincular um cliente e um
                        veículo cadastrados.
                      </p>
                      {podeConcluirCadastro && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={isDirty}
                          title={isDirty ? 'Salve as alterações antes de concluir o cadastro' : undefined}
                          onClick={() => setConcluindoCadastro(true)}
                        >
                          <UserPlus size={14} /> Concluir cadastro
                        </Button>
                      )}
                    </div>
                    {podeConcluirCadastro && isDirty && (
                      <p className="text-xs text-ink-muted">Salve o rascunho para poder concluir o cadastro.</p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {!semCadastro && (
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
                          // Os itens foram precificados pela categoria do veículo anterior. Sem cliente
                          // anterior (ex.: vinculando um orçamento "ainda não cadastrado") os itens ficam:
                          // o ItemsEditor reprecifica sozinho se a categoria do veículo real for outra.
                          if (field.value && value !== field.value) {
                            setValue('itens', []);
                            descartarAvarias();
                          }
                          setBuscaVeiculo('');
                        }}
                        options={clienteOptions}
                        query={buscaClienteInput}
                        onQueryChange={setBuscaClienteInput}
                        loading={buscandoClientes}
                      />
                    )}
                  />
                  )}
                  {!semCadastro && (
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
                        onChange={(value) => {
                          if (value !== field.value) descartarAvarias();
                          field.onChange(value);
                        }}
                        options={veiculoOptions}
                        query={buscaVeiculo}
                        onQueryChange={setBuscaVeiculo}
                        loading={buscandoVeiculos}
                        emptyLabel="Este cliente não tem veículos cadastrados."
                      />
                    )}
                  />
                  )}
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
                          <ReadOnlyField
                            label="Modelo"
                            value={`${selectedVeiculo.marca ?? ''} ${selectedVeiculo.modelo ?? ''}`.trim() || '—'}
                          />
                          <ReadOnlyField
                            label="Ano"
                            value={
                              selectedVeiculo.anoFabricacao
                                ? `${selectedVeiculo.anoFabricacao}${selectedVeiculo.anoModelo ? '/' + selectedVeiculo.anoModelo : ''}`
                                : '—'
                            }
                          />
                          <ReadOnlyField label="Cor" value={selectedVeiculo.cor || '—'} />
                          <ReadOnlyField label="Chassi" value={selectedVeiculo.chassi || '—'} />
                          <div>
                            <p className="text-xs font-medium text-ink-muted">Categoria</p>
                            {selectedVeiculo.categoria ? (
                              <Badge tone={TOM_CATEGORIA_COMPLEXIDADE[selectedVeiculo.categoria]}>
                                {selectedVeiculo.categoria} · hora técnica deste veículo
                              </Badge>
                            ) : (
                              <p className="text-sm font-semibold text-ink">—</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-4 border-t border-border pt-4">
                  <ItemsEditor
                    name="itens"
                    mostrarTempoVendido
                    permitirItemLivre
                    categoriaVeiculo={semCadastro ? veiculoCategoriaAvulso || undefined : selectedVeiculo?.categoria}
                    disabled={readOnly}
                    origem={efetivoId ? { tipo: 'ORCAMENTO', id: efetivoId } : undefined}
                    onGarantirOrigem={garantirOrigem}
                    ocultarResumo
                  />
                  {erroListaItens(errors.itens) && (
                    <p className="mt-1 text-xs font-medium text-danger">{erroListaItens(errors.itens)}</p>
                  )}
                  <div className="mt-3">
                    <HoraTecnicaReferencia name="itens" />
                  </div>
                </div>

                {/* Avaria com foto é do veículo cadastrado — sem ele a vistoria 3D não se aplica. */}
                {!semCadastro && (
                  <div className="mt-4">
                    <Disclosure
                      title="Vistoria de entrada (opcional)"
                      summary={temAvarias ? `${avarias.length} ${avarias.length === 1 ? 'avaria' : 'avarias'}` : 'Registrar avarias e combustível'}
                      open={vistoriaAberta}
                      onOpenChange={setVistoriaAberta}
                    >
                      <VistoriaEntrada veiculo={selectedVeiculo} readOnly={readOnly} />
                    </Disclosure>
                  </div>
                )}

                <div className="mt-4">
                  <Textarea label="Observações" disabled={readOnly} {...register('observacoes')} />
                </div>
              </div>

              {readOnly && (
                <p className="rounded-lg bg-surface-alt px-3 py-2 text-sm text-ink-muted">
                  Este orçamento não está mais em rascunho e não pode ser editado.
                </p>
              )}
            </CardBody>
          </Card>

          <ResumoOrcamentoPanel
            itens={itens as ItemFormValue[]}
            pendencias={readOnly ? [] : pendenciasEnvio({ semCadastro, clienteId, veiculoId, itens })}
            mostrarSalvar={!readOnly}
            saving={saving}
            rotuloSalvar={efetivoId ? 'Salvar alterações' : 'Criar rascunho'}
            statusSalvamento={textoSalvamento}
          />
        </form>
      </FormProvider>
    </div>
  );
}
