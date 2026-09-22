import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { horaTecnicaApi } from '@/api/endpoints/horaTecnica';
import type { CustoFixoRequest, PageParams, ParametrosHoraTecnicaRequest } from '@/api/types';
import { useAuthStore } from '@/store/authStore';

export const PERMISSAO_GERENCIAR_HORA_TECNICA = 'HORA_TECNICA_GERENCIAR';

// Espelha o @PreAuthorize de GET /financeiro/hora-tecnica: quem monta
// Orçamento/OS ou acessa o financeiro precisa do preço da hora. Fora dessa
// lista a consulta nem sai — evita o 403 com toast global (ver
// prohibited-actions #2).
const PERMISSOES_CONSULTA = [
  PERMISSAO_GERENCIAR_HORA_TECNICA,
  'FINANCEIRO_READ',
  'ORCAMENTO_READ',
  'ORDEM_SERVICO_READ',
];

export const horaTecnicaKeys = {
  all: ['hora-tecnica'] as const,
  preco: ['hora-tecnica', 'preco'] as const,
  custosFixos: ['hora-tecnica', 'custos-fixos'] as const,
  auditoria: (params?: PageParams) => ['hora-tecnica', 'auditoria', params] as const,
};

/**
 * Preço da hora técnica (PHT). A `composicao` só vem preenchida pra quem tem
 * HORA_TECNICA_GERENCIAR — o backend redige o resto, então um Consultor recebe
 * apenas `precoHoraTecnica` e `configurado`.
 */
export function useHoraTecnica(options?: { silentError?: boolean }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return useQuery({
    queryKey: horaTecnicaKeys.preco,
    queryFn: () => horaTecnicaApi.consultar(),
    enabled: PERMISSOES_CONSULTA.some(hasPermission),
    // Muda só quando um admin mexe nos parâmetros — não precisa refazer a
    // consulta a cada orçamento aberto.
    staleTime: 5 * 60 * 1000,
    // Opt-in pra quem usa o PHT só como referência visual (Orçamento/OS):
    // uma falha aqui não pode interromper o formulário com toast
    // (prohibited-actions #10). A tela de gestão quer o erro, então não passa.
    meta: options?.silentError ? { silentError: true } : undefined,
  });
}

export function useCustosFixos() {
  return useQuery({
    queryKey: horaTecnicaKeys.custosFixos,
    queryFn: () => horaTecnicaApi.listarCustosFixos(),
  });
}

export function useAuditoriaHoraTecnica(params?: PageParams) {
  return useQuery({
    queryKey: horaTecnicaKeys.auditoria(params),
    queryFn: () => horaTecnicaApi.auditoria(params),
  });
}

// Toda escrita muda o PHT e gera uma linha nova de auditoria — invalidar a
// raiz 'hora-tecnica' cobre preço, custos e histórico de uma vez.
function useEscritaHoraTecnica<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: horaTecnicaKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useAtualizarParametrosHoraTecnica() {
  return useEscritaHoraTecnica((payload: ParametrosHoraTecnicaRequest) =>
    horaTecnicaApi.atualizarParametros(payload),
  );
}

export function useCriarCustoFixo() {
  return useEscritaHoraTecnica((payload: CustoFixoRequest) => horaTecnicaApi.criarCustoFixo(payload));
}

export function useAtualizarCustoFixo() {
  return useEscritaHoraTecnica(({ id, payload }: { id: number; payload: CustoFixoRequest }) =>
    horaTecnicaApi.atualizarCustoFixo(id, payload),
  );
}

export function useExcluirCustoFixo() {
  return useEscritaHoraTecnica((id: number) => horaTecnicaApi.excluirCustoFixo(id));
}
