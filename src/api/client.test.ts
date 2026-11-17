import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { ApiForbiddenError, apiClient, extractErrorMessage, getBusinessErrorCode, mensagemSeguraParaUsuario } from './client';

function makeAxiosError(data: unknown, status = 400, url = '/api/v1/clientes', method = 'get'): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = { data, status, statusText: '', headers: {}, config: error.config! } as never;
  error.config = { url, method } as never;
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

  // Regressão: um 401 do PagBank por credencial inválida do nosso próprio
  // backend vazou como texto bruto no campo "message" e apareceu direto pro
  // usuário final numa tela de pagamento recusado.
  it('never surfaces a raw upstream HTTP/JSON error dump, even when it arrives in "message"', () => {
    const mensagemReal =
      'Falha ao comunicar com o PagBank: 401 Unauthorized: "{"error_messages":[{"code":"UNAUTHORIZED","description":"Invalid credential. Review AUTHORIZATION header"}]}"';
    expect(extractErrorMessage(makeAxiosError({ message: mensagemReal }), 'Erro genérico')).toBe('Erro genérico');
  });
});

describe('mensagemSeguraParaUsuario', () => {
  const fallback = 'Não foi possível concluir a operação.';

  it('returns the fallback for null/undefined/empty', () => {
    expect(mensagemSeguraParaUsuario(undefined, fallback)).toBe(fallback);
    expect(mensagemSeguraParaUsuario(null, fallback)).toBe(fallback);
    expect(mensagemSeguraParaUsuario('', fallback)).toBe(fallback);
  });

  it('passes through a short, human-written business message', () => {
    expect(mensagemSeguraParaUsuario('Saldo insuficiente.', fallback)).toBe('Saldo insuficiente.');
    expect(
      mensagemSeguraParaUsuario('Seu plano Básico permite até 2 usuários ativos. Faça upgrade.', fallback),
    ).toBe('Seu plano Básico permite até 2 usuários ativos. Faça upgrade.');
  });

  it('blocks a raw JSON/HTTP error dump and logs it to the console instead', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mensagemTecnica =
      'Falha ao comunicar com o PagBank: 401 Unauthorized: "{"error_messages":[{"code":"UNAUTHORIZED","description":"Invalid credential. Review AUTHORIZATION header"}]}"';

    expect(mensagemSeguraParaUsuario(mensagemTecnica, fallback)).toBe(fallback);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('bloqueada'), mensagemTecnica);
    consoleSpy.mockRestore();
  });

  it('blocks an overly long message even without obvious technical markers', () => {
    const mensagemLonga = 'a'.repeat(200);
    expect(mensagemSeguraParaUsuario(mensagemLonga, fallback)).toBe(fallback);
  });
});

describe('getBusinessErrorCode', () => {
  it('extracts codigo + mensagem from a structured business error body', () => {
    const error = makeAxiosError({ codigo: 'LIMITE_USUARIOS_EXCEDIDO', mensagem: 'Limite atingido.' }, 409);
    expect(getBusinessErrorCode(error)).toEqual({ codigo: 'LIMITE_USUARIOS_EXCEDIDO', mensagem: 'Limite atingido.' });
  });

  it('returns null for the default Spring validation envelope (no codigo field)', () => {
    expect(getBusinessErrorCode(makeAxiosError({ message: 'Erro de validacao' }, 400))).toBeNull();
  });

  it('returns null for a non-axios error', () => {
    expect(getBusinessErrorCode(new Error('falha'))).toBeNull();
    expect(getBusinessErrorCode('string-thrown')).toBeNull();
  });
});

describe('sessão por cookie HttpOnly', () => {
  let assignMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuthStore.setState({ loginEm: null, isAuthenticated: false, permissoes: [] });
    assignMock = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('envia cookies e o header de cliente web, e nunca um Authorization com token', () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(apiClient.defaults.headers['X-MotoGest-Client']).toBe('web');
    expect(apiClient.interceptors.request).toBeDefined();
    expect(JSON.stringify(apiClient.defaults.headers)).not.toContain('Bearer');
  });

  it('passes a successful response straight through', () => {
    const response = { data: { id: 1 }, status: 200 };
    expect(responseInterceptorFulfilled()(response)).toBe(response);
  });

  it('surfaces a 403 as a plain permission error', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    await expect(responseInterceptorRejection()(makeAxiosError({}, 403))).rejects.toBeInstanceOf(ApiForbiddenError);
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('carries method and url on the 403 error so the caches can explain the missing permission', async () => {
    useAuthStore.setState({ isAuthenticated: true });

    await expect(
      responseInterceptorRejection()(makeAxiosError({}, 403, '/api/v1/produtos/3/movimentacoes', 'post')),
    ).rejects.toMatchObject({ metodo: 'post', url: '/api/v1/produtos/3/movimentacoes' });
  });

  it('renova a sessão e repete a requisição quando recebe 401', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const repetida = vi.spyOn(apiClient, 'request').mockResolvedValue({ data: 'ok', status: 200 } as never);

    const result = await responseInterceptorRejection()(makeAxiosError({}, 401));

    expect(refresh).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      null,
      expect.objectContaining({ withCredentials: true, headers: { 'X-MotoGest-Client': 'web' } }),
    );
    expect(repetida).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: 'ok', status: 200 });
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('várias requisições com 401 compartilham uma única renovação (o refresh é rotativo)', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    vi.spyOn(apiClient, 'request').mockResolvedValue({ data: 'ok', status: 200 } as never);

    await Promise.all([
      responseInterceptorRejection()(makeAxiosError({}, 401, '/api/v1/a')),
      responseInterceptorRejection()(makeAxiosError({}, 401, '/api/v1/b')),
      responseInterceptorRejection()(makeAxiosError({}, 401, '/api/v1/c')),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('desloga e redireciona quando a renovação falha', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('401'));

    await expect(responseInterceptorRejection()(makeAxiosError({}, 401))).rejects.toBeTruthy();

    expect(window.location.assign).toHaveBeenCalledWith('/login?sessao=expirada');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('não tenta renovar mais de uma vez a mesma requisição', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const error = makeAxiosError({}, 401);
    (error.config as { _jaRenovou?: boolean })._jaRenovou = true;

    await expect(responseInterceptorRejection()(error)).rejects.toBeTruthy();

    expect(refresh).not.toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledWith('/login?sessao=expirada');
  });

  it('não tenta renovar quando não há sessão ativa', async () => {
    const refresh = vi.spyOn(axios, 'post');
    await expect(responseInterceptorRejection()(makeAxiosError({}, 401))).rejects.toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not redirect on a 401 from the login request itself (bad credentials)', async () => {
    await expect(
      responseInterceptorRejection()(makeAxiosError({ message: 'Credenciais invalidas' }, 401, '/api/v1/auth/login')),
    ).rejects.toBeTruthy();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
