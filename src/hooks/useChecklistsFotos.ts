import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checklistsApi } from '@/api/endpoints/checklists';
import { fotosApi } from '@/api/endpoints/fotos';
import type { ChecklistRequest, FotoRequest } from '@/api/types';

export function useChecklists(ordemServicoId: number | undefined) {
  return useQuery({
    queryKey: ['checklists', ordemServicoId],
    queryFn: () => checklistsApi.list(ordemServicoId!),
    enabled: !!ordemServicoId,
  });
}

export function useCriarChecklist(ordemServicoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChecklistRequest) => checklistsApi.criar(ordemServicoId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklists', ordemServicoId] }),
  });
}

export function useFotos(ordemServicoId: number | undefined) {
  return useQuery({
    queryKey: ['fotos', ordemServicoId],
    queryFn: () => fotosApi.list(ordemServicoId!),
    enabled: !!ordemServicoId,
  });
}

export function useAdicionarFoto(ordemServicoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FotoRequest) => fotosApi.adicionar(ordemServicoId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fotos', ordemServicoId] }),
  });
}

export function useRemoverFoto(ordemServicoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fotosApi.remover(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fotos', ordemServicoId] }),
  });
}
