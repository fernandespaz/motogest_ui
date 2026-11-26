import type { OrdemServicoResponse } from '@/api/types';
import { onlyDigits } from '@/lib/formatters';
import { normalizarPlaca } from '@/lib/placa';

/**
 * Como a busca da lista de O.S. é feita, conforme o que foi digitado. A API só filtra por número e por documento
 * (CPF/CNPJ) do cliente; placa e nome são buscados entre as O.S. mais recentes, aqui no cliente.
 */
export type BuscaOS =
  | { tipo: 'vazio' }
  | { tipo: 'numero'; valor: string }
  | { tipo: 'documento'; valor: string }
  | { tipo: 'texto'; valor: string };

/** Quantas O.S. mais recentes a busca por placa/nome percorre (a API não filtra por placa nem por nome). */
export const LIMITE_BUSCA_TEXTO = 200;

export function classificarBuscaOS(termo: string): BuscaOS {
  const t = termo.trim();
  if (!t) return { tipo: 'vazio' };
  const digitos = onlyDigits(t);
  // CPF (11) ou CNPJ (14) digitados, com ou sem pontuação.
  if (/^[\d.\-/\s]+$/.test(t) && (digitos.length === 11 || digitos.length === 14)) return { tipo: 'documento', valor: digitos };
  // "123", "OS-000123", "o.s. 123": só o número da O.S.
  if (/^(o\.?s\.?[-\s]?)?\d{1,9}$/i.test(t)) return { tipo: 'numero', valor: t.replace(/^o\.?s\.?[-\s]?/i, '') };
  return { tipo: 'texto', valor: t };
}

function normaliza(s: string | undefined | null): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Casa o texto com cliente, placa (com ou sem hífen) ou número da O.S. */
export function casaComTexto(os: OrdemServicoResponse, texto: string): boolean {
  const alvo = normaliza(texto);
  if (normaliza(os.clienteNome).includes(alvo) || normaliza(os.numero).includes(alvo)) return true;
  const placa = normalizarPlaca(texto);
  return placa.length > 0 && normalizarPlaca(os.veiculoPlaca).includes(placa);
}

/** "OS-000049" → "O.S. 000049"; sem número, usa o id. */
export function rotuloOS(numero?: string | null, id?: number | null): string {
  if (numero) return `O.S. ${numero.replace(/^OS-?/i, '')}`;
  return id != null ? `O.S. #${id}` : 'O.S.';
}
