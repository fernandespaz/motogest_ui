import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import type { AgendamentoRequest, AgendamentoResponse, AgendamentoStatus } from '../types';

const base = createCrudApi<AgendamentoResponse, AgendamentoRequest>('/api/v1/agendamentos');

export const agendaApi = {
  ...base,
  periodo: (inicio: string, fim: string) =>
    apiClient
      .get<AgendamentoResponse[]>('/api/v1/agendamentos/periodo', { params: { inicio, fim } })
      .then((r) => r.data),
  atualizarStatus: (id: number, status: AgendamentoStatus) =>
    apiClient
      .patch<AgendamentoResponse>(`/api/v1/agendamentos/${id}/status`, null, { params: { status } })
      .then((r) => r.data),
};
