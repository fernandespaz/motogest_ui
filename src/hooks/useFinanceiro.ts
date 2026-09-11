import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caixaApi } from '@/api/endpoints/caixa';
import { contasPagarApi } from '@/api/endpoints/contasPagar';
import { contasReceberApi } from '@/api/endpoints/contasReceber';
import type {
  CaixaMovimentoRequest,
  ContaPagarRequest,
  ContaPagarResponse,
  ContaReceberRequest,
  ContaReceberResponse,
  PageParams,
} from '@/api/types';
import { createCrudHooks } from './factory';

// Caixa
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
  });
}

export function useCancelarContaPagar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contasPagarApi.cancelar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contasPagarKeys.all }),
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
  });
}

export function useCancelarContaReceber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contasReceberApi.cancelar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contasReceberKeys.all }),
  });
}
