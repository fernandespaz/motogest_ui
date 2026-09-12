import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { oficinasApi } from '@/api/endpoints/oficinas';
import { licencaApi } from '@/api/endpoints/licenca';
import type { OficinaUpdateRequest, UpgradeLicencaRequest } from '@/api/types';

export function useOficinaAtual() {
  return useQuery({ queryKey: ['oficina', 'atual'], queryFn: () => oficinasApi.atual() });
}

export function useAtualizarOficina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OficinaUpdateRequest) => oficinasApi.atualizar(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oficina', 'atual'] }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useLicencaAtual() {
  return useQuery({ queryKey: ['licenca', 'atual'], queryFn: () => licencaApi.atual() });
}

export function useUpgradeLicenca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpgradeLicencaRequest) => licencaApi.upgrade(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['licenca', 'atual'] }),
    meta: { hasLocalErrorHandling: true },
  });
}
