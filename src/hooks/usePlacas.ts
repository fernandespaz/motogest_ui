import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { placasApi } from '@/api/endpoints/placas';
import { useAuthStore } from '@/store/authStore';
import type { PageParams } from '@/api/types';

export const placasKeys = {
  carteira: ['placas', 'carteira'] as const,
  extrato: (params: PageParams) => ['placas', 'extrato', params] as const,
  recarga: (id: number) => ['placas', 'recarga', id] as const,
};

/** Saldo e preços — o backend aceita VEICULO_WRITE (quem cadastra) ou PLACAS_CARTEIRA (quem recarrega). */
export function useCarteiraPlacas({ enabled = true }: { enabled?: boolean } = {}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const permitido = hasPermission('VEICULO_WRITE') || hasPermission('PLACAS_CARTEIRA');
  return useQuery({
    queryKey: placasKeys.carteira,
    queryFn: () => placasApi.carteira(),
    enabled: permitido && enabled,
    staleTime: 30_000,
    // Sem a carteira o cadastro segue manual; um toast global por isso só atrapalharia.
    meta: { silentError: true },
  });
}

/**
 * Mutation (e não query) de propósito: cada consulta pode cobrar da carteira,
 * então nunca pode rodar sozinha por refetch/foco de janela — só quando o usuário pede.
 */
export function useConsultarPlaca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (placa: string) => placasApi.consultar(placa),
    onSuccess: () => qc.invalidateQueries({ queryKey: placasKeys.carteira }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useConsultarChassi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (placa: string) => placasApi.consultarChassi(placa),
    onSuccess: () => qc.invalidateQueries({ queryKey: placasKeys.carteira }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useExtratoPlacas(params: PageParams) {
  return useQuery({
    queryKey: placasKeys.extrato(params),
    queryFn: () => placasApi.extrato(params),
    placeholderData: (prev) => prev,
  });
}

export function useCriarRecargaPlacas() {
  return useMutation({
    mutationFn: (valorCentavos: number) => placasApi.criarRecarga(valorCentavos),
    meta: { hasLocalErrorHandling: true },
  });
}

/** Acompanha uma recarga Pix: repete a cada 5s enquanto PENDENTE e para sozinha ao resolver. */
export function useRecargaPlacas(id: number | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: placasKeys.recarga(id ?? 0),
    queryFn: async () => {
      const recarga = await placasApi.buscarRecarga(id!);
      if (recarga.status === 'PAGA') {
        qc.invalidateQueries({ queryKey: placasKeys.carteira });
        qc.invalidateQueries({ queryKey: ['placas', 'extrato'] });
      }
      return recarga;
    },
    enabled: id != null,
    // Para ao resolver (PAGA/EXPIRADA/RECUSADA) e também se a consulta falhar, para não martelar o backend em silêncio.
    refetchInterval: (query) => {
      if (query.state.status === 'error') return false;
      return !query.state.data || query.state.data.status === 'PENDENTE' ? 5000 : false;
    },
    meta: { silentError: true },
  });
}
