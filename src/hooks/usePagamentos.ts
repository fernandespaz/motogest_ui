import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pagamentosApi } from '@/api/endpoints/pagamentos';
import { useAuthStore } from '@/store/authStore';
import type { IniciarAssinaturaRequest, IniciarPedidoRequest, IniciarPixRequest } from '@/api/types';

export function useIniciarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IniciarPedidoRequest) => pagamentosApi.iniciarPedido(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['licenca', 'atual'] }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useIniciarAssinatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IniciarAssinaturaRequest) => pagamentosApi.iniciarAssinatura(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['licenca', 'atual'] }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useIniciarPix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IniciarPixRequest) => pagamentosApi.iniciarPix(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['licenca', 'atual'] }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useChavePublicaPagBank() {
  // Gateado por OFICINA_WRITE (igual ao endpoint no backend) — sem isso, um
  // perfil sem essa permissão veria um 403 global só de abrir a tela de
  // pagamento, mesmo sem tentar pagar nada ainda.
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return useQuery({
    queryKey: ['pagamentos', 'chave-publica'],
    queryFn: () => pagamentosApi.chavePublica(),
    enabled: hasPermission('OFICINA_WRITE'),
    // O backend já cacheia por 12h (a chave pública do PagBank não muda) —
    // não faz sentido o frontend rebater nela a cada foco de janela/remount.
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
    // PagamentoCartaoModal já mostra um aviso dedicado + desabilita o botão
    // quando isError — o toast genérico global (queryClient.ts) duplicaria
    // a mesma informação de um jeito menos claro (some em 4.5s, sem dizer
    // que o Pix continua disponível).
    meta: { silentError: true },
  });
}
