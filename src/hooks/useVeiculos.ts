import { veiculosApi } from '@/api/endpoints/veiculos';
import type { PageParams, VeiculoRequest, VeiculoResponse } from '@/api/types';
import { createCrudHooks } from './factory';

// GET /veiculos no longer filters by clienteId — vehicles of a given client
// come from ClienteResponse.veiculos instead (see useVeiculosDoCliente).
const hooks = createCrudHooks<VeiculoResponse, VeiculoRequest, PageParams>('veiculos', veiculosApi);

export const veiculosKeys = hooks.keys;
export const useVeiculos = hooks.useList;
export const useVeiculo = hooks.useDetail;
export const useCreateVeiculo = hooks.useCreate;
export const useUpdateVeiculo = hooks.useUpdate;
export const useDeleteVeiculo = hooks.useRemove;
