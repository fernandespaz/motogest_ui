import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caixaApi } from '@/api/endpoints/caixa';
import { contasPagarApi } from '@/api/endpoints/contasPagar';
import { contasReceberApi } from '@/api/endpoints/contasReceber';
import { categoriasFinanceirasApi, type CategoriasFinanceirasParams } from '@/api/endpoints/categoriasFinanceiras';
import { fechamentosFinanceirosApi } from '@/api/endpoints/fechamentosFinanceiros';
import { parametrosFinanceirosApi } from '@/api/endpoints/parametrosFinanceiros';
import type {
  BaixaContaRequest,
  CategoriaFinanceiraRequest,
  ContaPagarLoteRequest,
  ContaReceberLoteRequest,
  FechamentoFinanceiroRequest,
  ParametroFinanceiroRequest,
  ReaberturaFinanceiraRequest,
  CaixaMovimentoRequest,
  CaixaSessaoAberturaRequest,
  CaixaSessaoFechamentoRequest,
  CaixaSessaoReaberturaRequest,
  ContaPagarRequest,
  ContaPagarResponse,
  ContaReceberRequest,
  ContaReceberResponse,
  FaturamentoOrdemServicoRequest,
  PageParams,
  PageResponse,
} from '@/api/types';
import { ordensServicoKeys } from './useOrdensServico';
import { createCrudHooks } from './factory';

// Caixa — lançamentos
export const caixaKeys = {
  all: ['caixa'] as const,
  list: (params?: PageParams) => ['caixa', 'list', params] as const,
  periodo: (inicio: string, fim: string) => ['caixa', 'periodo', inicio, fim] as const,
  saldo: (inicio: string, fim: string) => ['caixa', 'saldo', inicio, fim] as const,
};

export function useCaixaMovimentos(params?: PageParams) {
  return useQuery({ queryKey: caixaKeys.list(params), queryFn: () => caixaApi.list(params) });
}

export function useCaixaPeriodo(inicio: string, fim: string) {
  return useQuery({
    queryKey: caixaKeys.periodo(inicio, fim),
    queryFn: () => caixaApi.periodo(inicio, fim),
    enabled: !!inicio && !!fim,
  });
}

export function useCaixaSaldo(inicio: string, fim: string) {
  return useQuery({
    queryKey: caixaKeys.saldo(inicio, fim),
    queryFn: () => caixaApi.saldo(inicio, fim),
    enabled: !!inicio && !!fim,
  });
}

export function useRegistrarCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CaixaMovimentoRequest) => caixaApi.registrar(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: caixaKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

// Caixa — sessões (turnos)
export const caixaSessaoKeys = {
  all: ['caixa', 'sessoes'] as const,
  list: (params?: PageParams) => ['caixa', 'sessoes', 'list', params] as const,
  aberta: ['caixa', 'sessoes', 'aberta'] as const,
  detail: (id: number) => ['caixa', 'sessoes', 'detail', id] as const,
  eventos: (id: number) => ['caixa', 'sessoes', 'eventos', id] as const,
};

export function useCaixaSessoes(params?: PageParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: caixaSessaoKeys.list(params),
    queryFn: () => caixaApi.sessoes.listar(params),
    enabled: options?.enabled,
  });
}

/** Sessão aberta do operador atual — `data === null` (sem erro) é o estado normal "nenhum turno aberto". */
export function useCaixaSessaoAberta(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: caixaSessaoKeys.aberta,
    queryFn: () => caixaApi.sessoes.aberta(),
    enabled: options?.enabled,
  });
}

export function useCaixaSessao(id: number | undefined) {
  return useQuery({
    queryKey: caixaSessaoKeys.detail(id!),
    queryFn: () => caixaApi.sessoes.buscarPorId(id!),
    enabled: !!id,
  });
}

export function useCaixaSessaoEventos(id: number | undefined) {
  return useQuery({
    queryKey: caixaSessaoKeys.eventos(id!),
    queryFn: () => caixaApi.sessoes.eventos(id!),
    enabled: !!id,
  });
}

export function useAbrirCaixaSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CaixaSessaoAberturaRequest) => caixaApi.sessoes.abrir(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: caixaSessaoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useFecharCaixaSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CaixaSessaoFechamentoRequest }) =>
      caixaApi.sessoes.fechar(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: caixaSessaoKeys.all });
      qc.invalidateQueries({ queryKey: caixaSessaoKeys.eventos(variables.id) });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

export function useReabrirCaixaSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CaixaSessaoReaberturaRequest }) =>
      caixaApi.sessoes.reabrir(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: caixaSessaoKeys.all });
      qc.invalidateQueries({ queryKey: caixaSessaoKeys.eventos(variables.id) });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

/** Fatura uma OS direto no caixa (cria/liquida a Conta a Receber e alimenta a sessão aberta) — invalida os três recursos que essa única ação afeta. */
export function useFaturarOrdemServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ordemServicoId, payload }: { ordemServicoId: number; payload: FaturamentoOrdemServicoRequest }) =>
      caixaApi.faturar(ordemServicoId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caixaSessaoKeys.all });
      qc.invalidateQueries({ queryKey: caixaKeys.all });
      qc.invalidateQueries({ queryKey: contasReceberKeys.all });
      qc.invalidateQueries({ queryKey: ordensServicoKeys.all });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

// Caixa — relatórios (só quem tem CAIXA_GERENCIAR acessa essas telas; ver CaixaRelatoriosTab)
export function useRelatorioCaixaDiario(data: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['caixa', 'relatorios', 'diario', data] as const,
    queryFn: () => caixaApi.relatorios.diario(data),
    enabled: (options?.enabled ?? true) && !!data,
  });
}

export function useAuditoriaCaixa(inicio: string, fim: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['caixa', 'auditoria', inicio, fim] as const,
    queryFn: () => caixaApi.auditoria(inicio, fim),
    enabled: (options?.enabled ?? true) && !!inicio && !!fim && inicio <= fim,
  });
}

export function useRelatorioCaixaPeriodo(inicio: string, fim: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['caixa', 'relatorios', 'periodo', inicio, fim] as const,
    queryFn: () => caixaApi.relatorios.periodo(inicio, fim),
    enabled: (options?.enabled ?? true) && !!inicio && !!fim,
  });
}


const TAMANHO_PAGINA_TODAS = 200;

/**
 * GET /contas-pagar e /contas-receber só paginam — sem filtro de status, data
 * ou busca no backend. Pra a tela de Financeiro separar vencidas / a vencer /
 * pagas e somar cada grupo, busca todas as páginas uma vez (mesma solução de
 * useTodosServicos) e filtra por cima no cliente.
 */
async function carregarTodasAsPaginas<T>(listar: (params: PageParams) => Promise<PageResponse<T>>): Promise<T[]> {
  const params: PageParams = { page: 0, size: TAMANHO_PAGINA_TODAS, sort: 'dataVencimento,asc' };
  const primeira = await listar(params);
  const conteudo = [...(primeira.content ?? [])];
  for (let pagina = 1; pagina < (primeira.totalPages ?? 1); pagina++) {
    const proxima = await listar({ ...params, page: pagina });
    conteudo.push(...(proxima.content ?? []));
  }
  return conteudo;
}

// Contas a pagar
const contasPagarHooks = createCrudHooks<ContaPagarResponse, ContaPagarRequest, PageParams>(
  'contas-pagar',
  contasPagarApi,
);

export const contasPagarKeys = contasPagarHooks.keys;
export const useContasPagar = contasPagarHooks.useList;
export const useContaPagar = contasPagarHooks.useDetail;
export const useCreateContaPagar = contasPagarHooks.useCreate;
export const useUpdateContaPagar = contasPagarHooks.useUpdate;

/** Todas as contas a pagar (todas as páginas), já ordenadas por vencimento. `enabled` liga a busca só pra quem pode lê-la. */
export function useTodasContasPagar(options?: { enabled?: boolean; silentError?: boolean }) {
  return useQuery({
    queryKey: [...contasPagarKeys.all, 'todas'],
    queryFn: () => carregarTodasAsPaginas<ContaPagarResponse>((p) => contasPagarApi.list(p)),
    enabled: options?.enabled,
    meta: options?.silentError ? { silentError: true } : undefined,
  });
}

export function useContasPagarPendentes(inicio: string, fim: string) {
  return useQuery({
    queryKey: [...contasPagarKeys.all, 'pendentes', inicio, fim],
    queryFn: () => contasPagarApi.pendentes(inicio, fim),
    enabled: !!inicio && !!fim,
  });
}

export function usePagarConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, baixa }: { id: number; baixa?: BaixaContaRequest }) => contasPagarApi.pagar(id, baixa),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contasPagarKeys.all });
      qc.invalidateQueries({ queryKey: caixaKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

/** "Repetir todo mês" / "Parcelar": cria várias contas a pagar de uma vez, ligadas por um grupo. */
export function useCriarContasPagarEmLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ContaPagarLoteRequest) => contasPagarApi.criarLote(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: contasPagarKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useCancelarContaPagar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contasPagarApi.cancelar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contasPagarKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

// Contas a receber
const contasReceberHooks = createCrudHooks<ContaReceberResponse, ContaReceberRequest, PageParams>(
  'contas-receber',
  contasReceberApi,
);

export const contasReceberKeys = contasReceberHooks.keys;
export const useContasReceber = contasReceberHooks.useList;
export const useContaReceber = contasReceberHooks.useDetail;
export const useCreateContaReceber = contasReceberHooks.useCreate;
export const useUpdateContaReceber = contasReceberHooks.useUpdate;

/** Todas as contas a receber (todas as páginas), já ordenadas por vencimento. */
export function useTodasContasReceber(options?: { enabled?: boolean; silentError?: boolean }) {
  return useQuery({
    queryKey: [...contasReceberKeys.all, 'todas'],
    queryFn: () => carregarTodasAsPaginas<ContaReceberResponse>((p) => contasReceberApi.list(p)),
    enabled: options?.enabled,
    meta: options?.silentError ? { silentError: true } : undefined,
  });
}

export function useContasReceberPendentes(inicio: string, fim: string) {
  return useQuery({
    queryKey: [...contasReceberKeys.all, 'pendentes', inicio, fim],
    queryFn: () => contasReceberApi.pendentes(inicio, fim),
    enabled: !!inicio && !!fim,
  });
}

export function useReceberConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, baixa }: { id: number; baixa?: BaixaContaRequest }) => contasReceberApi.receber(id, baixa),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contasReceberKeys.all });
      qc.invalidateQueries({ queryKey: caixaKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

/** "Repetir todo mês" / "Parcelar": cria várias contas a receber de uma vez, ligadas por um grupo. */
export function useCriarContasReceberEmLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ContaReceberLoteRequest) => contasReceberApi.criarLote(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: contasReceberKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useCancelarContaReceber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contasReceberApi.cancelar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contasReceberKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

// Categorias financeiras — onde o dinheiro é aplicado (despesas) e de onde vem (receitas)
export const categoriasFinanceirasKeys = {
  all: ['categorias-financeiras'] as const,
  list: (params?: CategoriasFinanceirasParams) => ['categorias-financeiras', 'list', params ?? {}] as const,
};

export function useCategoriasFinanceiras(params?: CategoriasFinanceirasParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: categoriasFinanceirasKeys.list(params),
    queryFn: () => categoriasFinanceirasApi.listar(params),
    enabled: options?.enabled,
  });
}

export function useCriarCategoriaFinanceira() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoriaFinanceiraRequest) => categoriasFinanceirasApi.criar(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriasFinanceirasKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useAtualizarCategoriaFinanceira() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CategoriaFinanceiraRequest }) =>
      categoriasFinanceirasApi.atualizar(id, payload),
    // O nome da categoria vem embutido em cada conta — renomear tem que refrescar as listas de contas também.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriasFinanceirasKeys.all });
      qc.invalidateQueries({ queryKey: contasPagarKeys.all });
      qc.invalidateQueries({ queryKey: contasReceberKeys.all });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

// Parâmetros financeiros da oficina (dia de fechamento mensal)
export const parametrosFinanceirosKeys = { all: ['parametros-financeiros'] as const };

export function useParametrosFinanceiros(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: parametrosFinanceirosKeys.all,
    queryFn: () => parametrosFinanceirosApi.buscar(),
    enabled: options?.enabled,
  });
}

export function useAtualizarParametrosFinanceiros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ParametroFinanceiroRequest) => parametrosFinanceirosApi.atualizar(payload),
    // o dia de fechamento muda o período que o fechamento mostra
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: parametrosFinanceirosKeys.all });
      qc.invalidateQueries({ queryKey: fechamentosKeys.all });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

// Fechamento de período (data muro): quem fecha não mexe nas contas, só passa a travá-las.
export const fechamentosKeys = {
  all: ['fechamentos-financeiros'] as const,
  situacao: ['fechamentos-financeiros', 'situacao'] as const,
  lista: ['fechamentos-financeiros', 'lista'] as const,
};

export function useSituacaoFechamento(options?: { enabled?: boolean; silentError?: boolean }) {
  return useQuery({
    queryKey: fechamentosKeys.situacao,
    queryFn: () => fechamentosFinanceirosApi.situacao(),
    enabled: options?.enabled,
    meta: options?.silentError ? { silentError: true } : undefined,
  });
}

export function useFechamentos(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: fechamentosKeys.lista,
    queryFn: () => fechamentosFinanceirosApi.listar(),
    enabled: options?.enabled,
  });
}

export function useFecharPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FechamentoFinanceiroRequest) => fechamentosFinanceirosApi.fechar(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: fechamentosKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useReabrirFechamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReaberturaFinanceiraRequest }) =>
      fechamentosFinanceirosApi.reabrir(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: fechamentosKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
