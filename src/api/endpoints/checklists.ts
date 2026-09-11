import { apiClient } from '../client';
import type { ChecklistRequest, ChecklistResponse } from '../types';

export const checklistsApi = {
  list: (ordemServicoId: number) =>
    apiClient
      .get<ChecklistResponse[]>(`/api/v1/ordens-servico/${ordemServicoId}/checklists`)
      .then((r) => r.data),
  criar: (ordemServicoId: number, payload: ChecklistRequest) =>
    apiClient
      .post<ChecklistResponse>(`/api/v1/ordens-servico/${ordemServicoId}/checklists`, payload)
      .then((r) => r.data),
};
