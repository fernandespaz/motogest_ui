import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { ChecklistRequest, ChecklistResponse } from '../types';

export const checklistsApi = {
  list: (ordemServicoId: number) =>
    apiClient.get<ChecklistResponse[]>(API_ROUTES.checklists.base(ordemServicoId)).then((r) => r.data),
  criar: (ordemServicoId: number, payload: ChecklistRequest) =>
    apiClient.post<ChecklistResponse>(API_ROUTES.checklists.base(ordemServicoId), payload).then((r) => r.data),
};
