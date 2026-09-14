import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { ApiForbiddenError, apiClient, extractErrorMessage } from './client';

function makeAxiosError(data: unknown, status = 400, url = '/api/v1/clientes'): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = { data, status, statusText: '', headers: {}, config: error.config! } as never;
  error.config = { url } as never;
  return error;
}

// Axios doesn't expose a public way to invoke a registered interceptor directly —
// reaching into the internal handlers array is the standard way to unit test one
// without spinning up a real HTTP call.
function requestInterceptor() {
  return (apiClient.interceptors.request as unknown as { handlers: Array<{ fulfilled: (c: unknown) => unknown }> })
    .handlers[0].fulfilled;
}
function responseInterceptorRejection() {
  return (
    apiClient.interceptors.response as unknown as {
      handlers: Array<{ rejected: (e: AxiosError) => unknown }>;
    }
  ).handlers[0].rejected;
}
function responseInterceptorFulfilled() {
  return (
    apiClient.interceptors.response as unknown as { handlers: Array<{ fulfilled: (r: unknown) => unknown }> }
  ).handlers[0].fulfilled;
}

describe('extractErrorMessage', () => {
  it('reads the backend "message" field first', () => {
    expect(extractErrorMessage(makeAxiosError({ message: 'Cliente já cadastrado' }))).toBe('Cliente já cadastrado');
  });

  it('falls back to "erro" then "error" fields', () => {
    expect(extractErrorMessage(makeAxiosError({ erro: 'Falha ao processar' }))).toBe('Falha ao processar');
    expect(extractErrorMessage(makeAxiosError({ error: 'Bad request' }))).toBe('Bad request');
  });

  it('uses the fallback message when the response has no recognizable field', () => {
    expect(extractErrorMessage(makeAxiosError({}), 'Erro genérico')).toBe('Erro genérico');
  });

  it('returns the ApiForbiddenError message directly', () => {
    expect(extractErrorMessage(new ApiForbiddenError())).toBe('Você não tem permissão para executar esta ação.');
  });

  it('returns a plain Error message', () => {
    expect(extractErrorMessage(new Error('Falha de rede'))).toBe('Falha de rede');
  });

  it('returns the default fallback for a completely unknown error shape', () => {
    expect(extractErrorMessage('string-thrown')).toBe('Ocorreu um erro inesperado.');
    expect(extractErrorMessage(null)).toBe('Ocorreu um erro inesperado.');
  });
});

describe('session-expiry handling', () => {
  let assignMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuthStore.setState({ token: null, expiresAt: null, isAuthenticated: false, permissoes: [] });
    assignMock = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not touch a request when there is no active session', () => {
    const config = { url: '/api/v1/clientes', headers: {} as Record<string, string> };
    const result = requestInterceptor()(config);
    expect(result).toBe(config);
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('attaches the bearer token for a live session', () => {
    useAuthStore.setState({ token: 'abc123', expiresAt: Date.now() + 60_000, isAuthenticated: true });
    const config = { url: '/api/v1/clientes', headers: {} as Record<string, string> };
    const result = requestInterceptor()(config) as typeof config;
    expect(result.headers.Authorization).toBe('Bearer abc123');
  });

  it('logs out and redirects before ever sending a request past expiry', async () => {
    useAuthStore.setState({ token: 'abc123', expiresAt: Date.now() - 1000, isAuthenticated: true });
    const config = { url: '/api/v1/clientes', headers: {} as Record<string, string> };

    await expect(Promise.resolve(requestInterceptor()(config))).rejects.toBeTruthy();
    expect(window.location.assign).toHaveBeenCalledWith('/login?sessao=expirada');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('never redirects the login request itself, even mid-expiry', async () => {
    useAuthStore.setState({ token: 'abc123', expiresAt: Date.now() - 1000, isAuthenticated: true });
    const config = { url: '/api/v1/auth/login', headers: {} as Record<string, string> };

    await expect(Promise.resolve(requestInterceptor()(config))).rejects.toBeTruthy();
    // logout() still runs (the stale token shouldn't linger), but no redirect —
    // the user is already on the login screen trying to sign back in.
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('passes a successful response straight through', () => {
    const response = { data: { id: 1 }, status: 200 };
    expect(responseInterceptorFulfilled()(response)).toBe(response);
  });

  it('surfaces a 403 as a plain permission error when the session is still valid', async () => {
    useAuthStore.setState({ token: 'abc123', expiresAt: Date.now() + 60_000, isAuthenticated: true });
    await expect(responseInterceptorRejection()(makeAxiosError({}, 403))).rejects.toBeInstanceOf(ApiForbiddenError);
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('treats a 403 as an expired session when our own record says it should be', async () => {
    useAuthStore.setState({ token: 'abc123', expiresAt: Date.now() - 1000, isAuthenticated: true });
    await expect(responseInterceptorRejection()(makeAxiosError({}, 403))).rejects.toBeTruthy();
    expect(window.location.assign).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('logs out and redirects on a plain 401 for a non-login request', async () => {
    useAuthStore.setState({ token: 'abc123', expiresAt: Date.now() + 60_000, isAuthenticated: true });
    await expect(responseInterceptorRejection()(makeAxiosError({}, 401))).rejects.toBeTruthy();
    expect(window.location.assign).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('does not redirect on a 401 from the login request itself (bad credentials)', async () => {
    useAuthStore.setState({ token: null, expiresAt: null, isAuthenticated: false });
    await expect(
      responseInterceptorRejection()(makeAxiosError({ message: 'Credenciais invalidas' }, 401, '/api/v1/auth/login')),
    ).rejects.toBeTruthy();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
