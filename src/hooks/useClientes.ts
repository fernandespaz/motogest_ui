import { clientesApi } from '@/api/endpoints/clientes';
import type { ClienteRequest, ClienteResponse, PageParams } from '@/api/types';
import { createCrudHooks } from './factory';

type ListParams = PageParams & { nome?: string };

const hooks = createCrudHooks<ClienteResponse, ClienteRequest, ListParams>('clientes', clientesApi);

export const clientesKeys = hooks.keys;
export const useClientes = hooks.useList;
export const useCliente = hooks.useDetail;
export const useCreateCliente = hooks.useCreate;
export const useUpdateCliente = hooks.useUpdate;
export const useDeleteCliente = hooks.useRemove;
