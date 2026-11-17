import { useAuthStore } from '@/store/authStore';

/**
 * Sessão única também entre as abas do MESMO navegador. O JWT vive em cookie HttpOnly, e o cookie é compartilhado por
 * todas as abas: um novo login só troca o cookie, e a aba antiga seguiria "logada" — mostrando o nome/perfil de um
 * usuário enquanto as requisições já saem como outro. Por isso quem entra (ou sai) avisa as demais abas, e a mais
 * antiga é forçada ao login. Entre navegadores/dispositivos diferentes quem derruba a sessão é o servidor (jti único).
 */
const NOME_CANAL = 'motogest.sessao';

type Mensagem = { tipo: 'login'; loginEm: number } | { tipo: 'logout' };

let canalDeEnvio: BroadcastChannel | null | undefined;

function criarCanal(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(NOME_CANAL);
  } catch {
    return null; // navegador/contexto sem BroadcastChannel: fica o comportamento sem aviso entre abas
  }
}

function enviar(mensagem: Mensagem) {
  canalDeEnvio ??= criarCanal();
  canalDeEnvio?.postMessage(mensagem);
}

export function anunciarLogin(loginEm: number) {
  enviar({ tipo: 'login', loginEm });
}

export function anunciarLogout() {
  enviar({ tipo: 'logout' });
}

function derrubarEsta(motivo: 'outra-aba' | 'encerrada') {
  useAuthStore.getState().logout();
  window.location.assign(`/login?sessao=${motivo}`);
}

/** Começa a ouvir as outras abas; devolve a função que para de ouvir. */
export function iniciarEscutaEntreAbas(): () => void {
  const canal = criarCanal();
  if (!canal) return () => undefined;

  canal.onmessage = (evento: MessageEvent<Mensagem>) => {
    const { isAuthenticated, loginEm } = useAuthStore.getState();
    if (!isAuthenticated) return;
    const mensagem = evento.data;
    if (mensagem?.tipo === 'logout') {
      derrubarEsta('encerrada');
    } else if (mensagem?.tipo === 'login' && mensagem.loginEm > (loginEm ?? 0)) {
      // só cai se o login anunciado for MAIS NOVO que o desta aba (dois logins quase simultâneos: vence o último)
      derrubarEsta('outra-aba');
    }
  };
  return () => canal.close();
}
