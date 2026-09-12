import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

function isSessionExpired(): boolean {
  const { token, expiresAt } = useAuthStore.getState();
  return !!token && !!expiresAt && Date.now() >= expiresAt;
}

function forceReauth(requestUrl?: string) {
  const isLoginRequest = requestUrl?.includes('/auth/login');
  if (isLoginRequest) return;
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined') {
    window.location.assign('/login?sessao=expirada');
  }
}

apiClient.interceptors.request.use((config) => {
  // The JWT's own lifetime (expiresAt, tracked from expiraEmSegundos at login) is
  // known client-side — catching it here means the very first request after expiry
  // redirects immediately instead of letting every subsequent click hit the API
  // and come back with a 401/403 the user has no way to act on.
  if (isSessionExpired()) {
    forceReauth(config.url);
    return Promise.reject(new axios.CanceledError('Sessão expirada'));
  }
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class ApiForbiddenError extends Error {
  constructor() {
    super('Você não tem permissão para executar esta ação.');
    this.name = 'ApiForbiddenError';
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      forceReauth(error.config?.url);
    }
    if (error.response?.status === 403) {
      // This backend has, in practice, returned 403 (not 401) for a token that's
      // no longer valid server-side — if our own record of the session says it
      // should already be expired, treat it as the same case instead of showing
      // a "sem permissão" toast that never goes away no matter what the user does.
      if (isSessionExpired()) {
        forceReauth(error.config?.url);
        return Promise.reject(error);
      }
      return Promise.reject(new ApiForbiddenError());
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (error instanceof ApiForbiddenError) return error.message;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; erro?: string; error?: string } | undefined;
    return data?.message ?? data?.erro ?? data?.error ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
