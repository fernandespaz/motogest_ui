import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { LicencaResponse } from '../types';

export const licencaApi = {
  atual: () => apiClient.get<LicencaResponse>(API_ROUTES.licenca.atual).then((r) => r.data),
};
