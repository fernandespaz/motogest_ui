import { clientesApi } from '@/api/endpoints/clientes';
import type { ClienteRequest, ClienteResponse, PageParams } from '@/api/types';
import { createCrudHooks } from './factory';

type ListParams = PageParams & { nome?: string; busca?: string };

const hooks = createCrudHooks<ClienteResponse, ClienteRequest, ListParams>('clientes', clientesApi);

export const clientesKeys = hooks.keys;
export const useClientes = hooks.useList;
export const useCliente = hooks.useDetail;
export const useCreateCliente = hooks.useCreate;
export const useUpdateCliente = hooks.useUpdate;
export const useDeleteCliente = hooks.useRemove;

/**
 * Vehicles now come embedded in ClienteResponse.veiculos (the standalone
 * GET /veiculos list lost its clienteId filter) — this is the single place
 * that reads them, so every "pick a vehicle for this client" UI stays in
 * sync with however the embedding ends up shaped.
 */
export function useVeiculosDoCliente(clienteId: number | undefined) {
  const query = useCliente(clienteId);
  return { ...query, data: query.data?.veiculos ?? [] };
}
