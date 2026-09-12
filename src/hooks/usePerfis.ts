import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { perfisApi } from '@/api/endpoints/perfis';
import type { PerfilRequest } from '@/api/types';

export const perfisKeys = {
  all: ['perfis'] as const,
  detail: (id: number) => ['perfis', 'detail', id] as const,
  permissoes: ['perfis', 'permissoes-disponiveis'] as const,
};

export function usePerfis() {
  return useQuery({ queryKey: perfisKeys.all, queryFn: () => perfisApi.list() });
}

export function usePerfil(id: number | undefined) {
  return useQuery({
    queryKey: perfisKeys.detail(id!),
    queryFn: () => perfisApi.get(id!),
    enabled: !!id,
  });
}

export function usePermissoesDisponiveis() {
  return useQuery({ queryKey: perfisKeys.permissoes, queryFn: () => perfisApi.permissoesDisponiveis() });
}

export function useCreatePerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PerfilRequest) => perfisApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: perfisKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useUpdatePerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PerfilRequest }) => perfisApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: perfisKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useDeletePerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => perfisApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: perfisKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
