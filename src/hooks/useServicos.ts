import { servicosApi } from '@/api/endpoints/servicos';
import type { ServicoRequest, ServicoResponse } from '@/api/types';
import { createCrudHooks } from './factory';

const hooks = createCrudHooks<ServicoResponse, ServicoRequest>('servicos', servicosApi);

export const servicosKeys = hooks.keys;
export const useServicos = hooks.useList;
export const useServico = hooks.useDetail;
export const useCreateServico = hooks.useCreate;
export const useUpdateServico = hooks.useUpdate;
export const useDeleteServico = hooks.useRemove;
