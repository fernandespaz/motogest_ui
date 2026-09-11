import { createCrudApi } from '../crud';
import type { ServicoRequest, ServicoResponse } from '../types';

export const servicosApi = createCrudApi<ServicoResponse, ServicoRequest>('/api/v1/servicos');
