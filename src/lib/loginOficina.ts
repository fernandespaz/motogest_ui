/**
 * "Lembrar oficina e usuário neste dispositivo". Guarda SÓ os códigos de acesso (da oficina e do usuário):
 * a senha nunca é gravada pelo app — quem a guarda, se o usuário quiser, é o gerenciador de senhas do navegador
 * (por isso os campos do login usam autoComplete="username"/"current-password"). Gravar senha em localStorage
 * deixaria qualquer falha de XSS lê-la em texto puro.
 */
const CHAVE = 'motogest:login-lembrado';

export interface LoginLembrado {
  oficina: string;
  usuario: string;
}

export function lerLoginLembrado(): LoginLembrado | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const dado = JSON.parse(bruto) as Partial<LoginLembrado>;
    if (typeof dado.oficina !== 'string' || typeof dado.usuario !== 'string') return null;
    return { oficina: dado.oficina, usuario: dado.usuario };
  } catch {
    return null; // storage indisponível/corrompido: o login simplesmente não vem pré-preenchido
  }
}

export function salvarLoginLembrado(dado: LoginLembrado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ oficina: dado.oficina, usuario: dado.usuario }));
  } catch {
    // sem localStorage (modo privado/cheio): só não lembra
  }
}

export function limparLoginLembrado() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // idem
  }
}

/** Link que abre o login já com a oficina preenchida (o admin passa para a equipe, por mensagem ou QR code). */
export function linkDeAcesso(codigoOficina: string | undefined, origem: string = window.location.origin): string {
  return codigoOficina ? `${origem}/login?oficina=${encodeURIComponent(codigoOficina)}` : `${origem}/login`;
}
