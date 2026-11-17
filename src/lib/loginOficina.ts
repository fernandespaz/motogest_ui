import axios from 'axios';

/**
 * "Lembrar oficina e usuário neste dispositivo". Guarda SÓ o que não é segredo (código da oficina e do usuário):
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

export interface OpcaoOficina {
  codigo: string;
  nome: string;
}

export const CODIGO_ESCOLHER_OFICINA = 'ESCOLHER_OFICINA';

/**
 * Login por e-mail cuja senha confere em mais de uma oficina: o back-end responde 409 com codigo ESCOLHER_OFICINA e as
 * oficinas em `details`, no formato "CODIGO|Nome". Devolve a lista, ou null se o erro for outro.
 */
export function opcoesDeOficinaDoErro(error: unknown): OpcaoOficina[] | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
  const data = error.response.data as { codigo?: string; details?: string[] } | undefined;
  if (data?.codigo !== CODIGO_ESCOLHER_OFICINA || !Array.isArray(data.details)) return null;
  return data.details.map((d) => {
    const [codigo, ...resto] = d.split('|');
    return { codigo, nome: resto.join('|') || codigo };
  });
}
