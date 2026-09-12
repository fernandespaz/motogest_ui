import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { AgendamentoRequest, AgendamentoResponse, AgendamentoStatus } from '../types';

const base = createCrudApi<AgendamentoResponse, AgendamentoRequest>(API_ROUTES.agenda.base);

export const agendaApi = {
  ...base,
  periodo: (inicio: string, fim: string) =>
    apiClient
      .get<AgendamentoResponse[]>(API_ROUTES.agenda.periodo, { params: { inicio, fim } })
      .then((r) => r.data),
  atualizarStatus: (id: number, status: AgendamentoStatus) =>
    apiClient
      .patch<AgendamentoResponse>(API_ROUTES.agenda.status(id), null, { params: { status } })
      .then((r) => r.data),
};
