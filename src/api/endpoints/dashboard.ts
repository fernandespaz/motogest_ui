import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { DashboardResponse } from '../types';

export const dashboardApi = {
  gerar: () => apiClient.get<DashboardResponse>(API_ROUTES.dashboard.base).then((r) => r.data),
};
