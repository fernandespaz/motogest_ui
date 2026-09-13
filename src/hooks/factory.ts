import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PageParams } from '@/api/types';

interface CrudLike<TResponse, TRequest, TListParams> {
  list: (params?: TListParams) => Promise<any>;
  get: (id: number) => Promise<TResponse>;
  create: (payload: TRequest) => Promise<TResponse>;
  update: (id: number, payload: TRequest) => Promise<TResponse>;
  remove: (id: number) => Promise<void>;
}

export function createCrudHooks<TResponse, TRequest, TListParams = PageParams>(
  resourceKey: string,
  api: CrudLike<TResponse, TRequest, TListParams>,
) {
  const keys = {
    all: [resourceKey] as const,
    list: (params?: TListParams) => [resourceKey, 'list', params] as const,
    detail: (id: number) => [resourceKey, 'detail', id] as const,
  };

  function useList(params?: TListParams, options?: { enabled?: boolean }) {
    return useQuery({
      queryKey: keys.list(params),
      queryFn: () => api.list(params),
      enabled: options?.enabled,
    });
  }

  function useDetail(id: number | undefined) {
    return useQuery({
      queryKey: keys.detail(id!),
      queryFn: () => api.get(id!),
      enabled: !!id,
    });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (payload: TRequest) => api.create(payload),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
      // Call sites use mutateAsync + their own try/catch to show a
      // action-specific error message; this only stops a duplicate toast,
      // it does not remove error handling (the global cache still surfaces
      // any mutation that forgets this flag).
      meta: { hasLocalErrorHandling: true },
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TRequest }) => api.update(id, payload),
      onSuccess: (_data, variables) => {
        qc.invalidateQueries({ queryKey: keys.all });
        qc.invalidateQueries({ queryKey: keys.detail(variables.id) });
      },
      meta: { hasLocalErrorHandling: true },
    });
  }

  function useRemove() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: number) => api.remove(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
      meta: { hasLocalErrorHandling: true },
    });
  }

  return { keys, useList, useDetail, useCreate, useUpdate, useRemove };
}
