import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { LoginRequest, LoginResponse } from '../types';

export const authApi = {
  login: (payload: LoginRequest) =>
    apiClient.post<LoginResponse>(API_ROUTES.auth.login, payload).then((r) => r.data),
  logout: () => apiClient.post<void>(API_ROUTES.auth.logout).then(() => undefined),
};
