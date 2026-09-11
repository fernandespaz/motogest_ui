import { veiculosApi } from '@/api/endpoints/veiculos';
import type { PageParams, VeiculoRequest, VeiculoResponse } from '@/api/types';
import { createCrudHooks } from './factory';

type ListParams = PageParams & { clienteId?: number };

const hooks = createCrudHooks<VeiculoResponse, VeiculoRequest, ListParams>('veiculos', veiculosApi);

export const veiculosKeys = hooks.keys;
export const useVeiculos = hooks.useList;
export const useVeiculo = hooks.useDetail;
export const useCreateVeiculo = hooks.useCreate;
export const useUpdateVeiculo = hooks.useUpdate;
export const useDeleteVeiculo = hooks.useRemove;
