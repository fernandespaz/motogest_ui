import { apiClient } from '../client';
import type { LicencaResponse, UpgradeLicencaRequest } from '../types';

export const licencaApi = {
  atual: () => apiClient.get<LicencaResponse>('/api/v1/licenca/atual').then((r) => r.data),
  upgrade: (payload: UpgradeLicencaRequest) =>
    apiClient.post<LicencaResponse>('/api/v1/licenca/upgrade', payload).then((r) => r.data),
};
