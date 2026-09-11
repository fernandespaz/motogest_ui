import { createCrudApi } from '../crud';
import type { ClienteRequest, ClienteResponse, PageParams } from '../types';

type ListParams = PageParams & { nome?: string };

export const clientesApi = createCrudApi<ClienteResponse, ClienteRequest, ListParams>('/api/v1/clientes');
