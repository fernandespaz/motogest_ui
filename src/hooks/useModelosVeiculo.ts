import { modelosVeiculoApi, type ModelosVeiculoListParams } from '@/api/endpoints/modelosVeiculo';
import type { ModeloVeiculoRequest, ModeloVeiculoResponse } from '@/api/types';
import { createCrudHooks } from './factory';

const hooks = createCrudHooks<ModeloVeiculoResponse, ModeloVeiculoRequest, ModelosVeiculoListParams>(
  'modelos-veiculo',
  modelosVeiculoApi,
);

export const modelosVeiculoKeys = hooks.keys;
export const useModelosVeiculo = hooks.useList;
export const useModeloVeiculo = hooks.useDetail;
export const useCreateModeloVeiculo = hooks.useCreate;
export const useUpdateModeloVeiculo = hooks.useUpdate;
export const useDeleteModeloVeiculo = hooks.useRemove;
