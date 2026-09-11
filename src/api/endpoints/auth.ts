import { apiClient } from '../client';
import type { LoginRequest, LoginResponse } from '../types';

export const authApi = {
  login: (payload: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/v1/auth/login', payload).then((r) => r.data),
};
