import { createCrudApi } from '../crud';
import { API_ROUTES } from '../routes';
import type { ServicoRequest, ServicoResponse } from '../types';

export const servicosApi = createCrudApi<ServicoResponse, ServicoRequest>(API_ROUTES.servicos.base);
