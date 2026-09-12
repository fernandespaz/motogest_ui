import { createCrudApi } from '../crud';
import { API_ROUTES } from '../routes';
import type { PageParams, VeiculoRequest, VeiculoResponse } from '../types';

// GET /veiculos no longer accepts a clienteId filter — see useVeiculosDoCliente.
export const veiculosApi = createCrudApi<VeiculoResponse, VeiculoRequest, PageParams>(API_ROUTES.veiculos.base);
