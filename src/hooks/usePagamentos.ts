import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pagamentosApi } from '@/api/endpoints/pagamentos';
import type { IniciarAssinaturaRequest, IniciarPedidoRequest } from '@/api/types';

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
