import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { LicencaResponse, UpgradeLicencaRequest } from '../types';

export const licencaApi = {
  atual: () => apiClient.get<LicencaResponse>(API_ROUTES.licenca.atual).then((r) => r.data),
  upgrade: (payload: UpgradeLicencaRequest) =>
    apiClient.post<LicencaResponse>(API_ROUTES.licenca.upgrade, payload).then((r) => r.data),
};
