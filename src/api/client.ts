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

// Uma mensagem de negócio de verdade, escrita pelo nosso backend para um
// lojista ler, é curta e em português, sem estrutura de dado nem jargão
// técnico em inglês. Isso existe porque já aconteceu de um erro de
// integração (o backend falhando ao autenticar com o PagBank) vazar como
// "Falha ao comunicar com o PagBank: 401 Unauthorized: {"error_messages":
// [...]}" direto num campo pensado para o usuário final ler — nenhuma
// mensagem vinda do backend, seja de um erro capturado (extractErrorMessage)
// seja de um campo de DTO renderizado direto (ex.: PagamentoResponse.
// mensagemErro), pode chegar à tela sem passar por aqui primeiro. Regra de
// projeto, não só deste endpoint — ver CLAUDE.md/skill.
const PADRAO_MENSAGEM_TECNICA =
  /[{}[\]]|error_messages|status_code|unauthorized|forbidden|invalid credential|stack ?trace|internal server error|\bhttp\/?\d|\b\d{3}\b.*(bad request|unauthorized|forbidden|not found|internal server error)/i;

export function mensagemSeguraParaUsuario(mensagem: string | undefined | null, fallback: string): string {
  if (!mensagem) return fallback;
  const pareceTecnica = PADRAO_MENSAGEM_TECNICA.test(mensagem) || mensagem.length > 140;
  if (pareceTecnica) {
    // eslint-disable-next-line no-console -- sinal de debug intencional: a mensagem real não pode sumir sem deixar rastro.
    console.error('[api] Mensagem de erro técnica bloqueada de exibição ao usuário:', mensagem);
    return fallback;
  }
  return mensagem;
}

export function extractErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (error instanceof ApiForbiddenError) return error.message;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; erro?: string; error?: string } | undefined;
    return mensagemSeguraParaUsuario(data?.message ?? data?.erro ?? data?.error, fallback);
  }
  if (error instanceof Error) return mensagemSeguraParaUsuario(error.message, fallback);
  return fallback;
}

/**
 * Alguns erros de regra de negócio (ex.: LIMITE_USUARIOS_EXCEDIDO) vêm num
 * corpo estruturado { codigo, mensagem } em vez do envelope padrão de
 * validação do Spring ({ message, error, ... }) — extractErrorMessage não
 * cobre esse formato. Use isto quando o call site precisa tratar um código
 * específico de forma diferenciada (ex.: CTA de upgrade em vez de um toast
 * genérico), não como substituto geral de extractErrorMessage. A `mensagem`
 * devolvida ainda não passou por mensagemSeguraParaUsuario — o call site
 * decide o fallback apropriado ao seu contexto e deve chamá-la antes de
 * exibir.
 */
export function getBusinessErrorCode(error: unknown): { codigo: string; mensagem?: string } | null {
  if (!axios.isAxiosError(error)) return null;
  const data = error.response?.data as { codigo?: string; mensagem?: string } | undefined;
  if (!data?.codigo) return null;
  return { codigo: data.codigo, mensagem: data.mensagem };
}
