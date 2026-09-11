import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
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
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.assign('/login?sessao=expirada');
        }
      }
    }
    if (error.response?.status === 403) {
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
