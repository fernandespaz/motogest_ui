import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caixaApi } from '@/api/endpoints/caixa';
import { contasPagarApi } from '@/api/endpoints/contasPagar';
import { contasReceberApi } from '@/api/endpoints/contasReceber';
import type {
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

export function useRelatorioCaixaPeriodo(inicio: string, fim: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['caixa', 'relatorios', 'periodo', inicio, fim] as const,
    queryFn: () => caixaApi.relatorios.periodo(inicio, fim),
    enabled: (options?.enabled ?? true) && !!inicio && !!fim,
  });
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
    mutationFn: (id: number) => contasPagarApi.pagar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contasPagarKeys.all });
      qc.invalidateQueries({ queryKey: caixaKeys.all });
    },
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
    mutationFn: (id: number) => contasReceberApi.receber(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contasReceberKeys.all });
      qc.invalidateQueries({ queryKey: caixaKeys.all });
    },
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
