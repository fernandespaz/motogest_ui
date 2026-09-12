import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { oficinasAdminApi } from '@/api/endpoints/oficinas';
import type { OficinaRegistrationRequest, PageParams } from '@/api/types';

export const oficinasAdminKeys = {
  all: ['admin-oficinas'] as const,
  list: (adminToken: string, params?: PageParams) => ['admin-oficinas', adminToken, params] as const,
};

/**
 * Disabled (no request fired) until a non-empty adminToken is provided — the
 * Root Console gates on this via `enabled`, so a blank/removed token never
 * hits the network with an empty X-Admin-Token header.
 */
export function useOficinasAdmin(adminToken: string, params?: PageParams) {
  return useQuery({
    queryKey: oficinasAdminKeys.list(adminToken, params),
    queryFn: () => oficinasAdminApi.list(adminToken, params),
    enabled: !!adminToken,
    retry: false,
    meta: { silentError: true },
  });
}

export function useCriarOficinaAdmin(adminToken: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OficinaRegistrationRequest) => oficinasAdminApi.criar(adminToken, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: oficinasAdminKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
