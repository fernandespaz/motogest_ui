import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { horaTecnicaApi } from '@/api/endpoints/horaTecnica';
import type { CategoriaHoraTecnicaRequest, PageParams } from '@/api/types';
import { useAuthStore } from '@/store/authStore';

export const PERMISSAO_GERENCIAR_HORA_TECNICA = 'HORA_TECNICA_GERENCIAR';

// Espelha o @PreAuthorize de GET /financeiro/hora-tecnica: quem monta
// Orçamento/OS ou acessa o financeiro precisa do valor da hora por categoria.
// Fora dessa lista a consulta nem sai — evita o 403 com toast global (ver
// prohibited-actions #2).
const PERMISSOES_CONSULTA = [
  PERMISSAO_GERENCIAR_HORA_TECNICA,
  'FINANCEIRO_READ',
  'ORCAMENTO_READ',
  'ORDEM_SERVICO_READ',
];

export const horaTecnicaKeys = {
  all: ['hora-tecnica'] as const,
  categorias: ['hora-tecnica', 'categorias'] as const,
  auditoria: (params?: PageParams) => ['hora-tecnica', 'auditoria', params] as const,
};

/**
 * As 3 categorias (A/B/C) configuradas — pode vir array vazio se a oficina
 * ainda não configurou nada (ver HoraTecnicaNaoConfigurada). Usada tanto na
 * tela de gestão quanto como referência de preço em Orçamento/OS/Catálogo de
 * Serviço (ver ItemsEditor, ServicoFormModal).
 */
export function useCategoriasHoraTecnica(options?: { silentError?: boolean }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return useQuery({
    queryKey: horaTecnicaKeys.categorias,
    queryFn: () => horaTecnicaApi.consultar(),
    enabled: PERMISSOES_CONSULTA.some(hasPermission),
    // Muda só quando um admin mexe no valor da hora — não precisa refazer a
    // consulta a cada orçamento aberto.
    staleTime: 5 * 60 * 1000,
    // Opt-in pra quem usa isso só como referência visual (Orçamento/OS): uma
    // falha aqui não pode interromper o formulário com toast (prohibited-actions #10).
    // A tela de gestão quer o erro, então não passa.
    meta: options?.silentError ? { silentError: true } : undefined,
  });
}

export function useAuditoriaHoraTecnica(params?: PageParams) {
  return useQuery({
    queryKey: horaTecnicaKeys.auditoria(params),
    queryFn: () => horaTecnicaApi.auditoria(params),
  });
}

export function useAtualizarHoraTecnica() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoriaHoraTecnicaRequest) => horaTecnicaApi.atualizar(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: horaTecnicaKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
