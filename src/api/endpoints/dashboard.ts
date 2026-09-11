import { apiClient } from '../client';
import type { DashboardResponse } from '../types';

export const dashboardApi = {
  gerar: () => apiClient.get<DashboardResponse>('/api/v1/dashboard').then((r) => r.data),
};
