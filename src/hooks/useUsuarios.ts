import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usuariosApi } from '@/api/endpoints/usuarios';
import type { UsuarioRequest } from '@/api/types';

export const usuariosKeys = {
  all: ['usuarios'] as const,
  detail: (id: number) => ['usuarios', 'detail', id] as const,
};

export function useUsuarios() {
  return useQuery({ queryKey: usuariosKeys.all, queryFn: () => usuariosApi.list() });
}

export function useUsuario(id: number | undefined) {
  return useQuery({
    queryKey: usuariosKeys.detail(id!),
    queryFn: () => usuariosApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UsuarioRequest) => usuariosApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: usuariosKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useUpdateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UsuarioRequest }) => usuariosApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: usuariosKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useDeleteUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usuariosApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: usuariosKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
