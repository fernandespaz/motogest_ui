import { createCrudApi } from '../crud';
import { API_ROUTES } from '../routes';
import type { PageParams, VeiculoRequest, VeiculoResponse } from '../types';

type ListParams = PageParams & { clienteId?: number };

export const veiculosApi = createCrudApi<VeiculoResponse, VeiculoRequest, ListParams>(API_ROUTES.veiculos.base);
