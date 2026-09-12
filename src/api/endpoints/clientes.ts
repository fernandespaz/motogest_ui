import { createCrudApi } from '../crud';
import { API_ROUTES } from '../routes';
import type { ClienteRequest, ClienteResponse, PageParams } from '../types';

type ListParams = PageParams & { nome?: string };

export const clientesApi = createCrudApi<ClienteResponse, ClienteRequest, ListParams>(API_ROUTES.clientes.base);
