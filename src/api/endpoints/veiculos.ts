import { createCrudApi } from '../crud';
import type { PageParams, VeiculoRequest, VeiculoResponse } from '../types';

type ListParams = PageParams & { clienteId?: number };

export const veiculosApi = createCrudApi<VeiculoResponse, VeiculoRequest, ListParams>('/api/v1/veiculos');
