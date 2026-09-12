import { createCrudApi } from '../crud';
import { API_ROUTES } from '../routes';
import type { ClienteRequest, ClienteResponse, PageParams } from '../types';

// 'busca' matches nome, CPF/CNPJ ou placa de qualquer veículo vinculado, e tem
// prioridade sobre 'nome' quando os dois são informados (ver GET /clientes no Swagger).
type ListParams = PageParams & { nome?: string; busca?: string };

export const clientesApi = createCrudApi<ClienteResponse, ClienteRequest, ListParams>(API_ROUTES.clientes.base);
