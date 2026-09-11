import { apiClient } from './client';
import type { PageParams, PageResponse } from './types';

export function createCrudApi<TResponse, TRequest = TResponse, TListParams = PageParams>(basePath: string) {
  return {
    list: (params?: TListParams) =>
      apiClient.get<PageResponse<TResponse>>(basePath, { params: params as Record<string, unknown> | undefined }).then((r) => r.data),
    get: (id: number) => apiClient.get<TResponse>(`${basePath}/${id}`).then((r) => r.data),
    create: (payload: TRequest) => apiClient.post<TResponse>(basePath, payload).then((r) => r.data),
    update: (id: number, payload: TRequest) =>
      apiClient.put<TResponse>(`${basePath}/${id}`, payload).then((r) => r.data),
    remove: (id: number) => apiClient.delete<void>(`${basePath}/${id}`).then((r) => r.data),
  };
}
