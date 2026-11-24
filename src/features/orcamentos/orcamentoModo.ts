import type { CategoriaComplexidade, OrcamentoResponse } from '@/api/types';

/**
 * CADASTRADO = cliente e veículo escolhidos nos cadastros. INTERESSADO = o
 * vendedor ainda não tem o cadastro: nome/contato e dados mínimos do veículo
 * ficam gravados no próprio orçamento (só vale em RASCUNHO).
 */
export type ModoCliente = 'CADASTRADO' | 'INTERESSADO';

export interface DadosInteressado {
  interessadoNome?: string;
  interessadoTelefone?: string;
  interessadoEmail?: string;
  veiculoCategoria?: CategoriaComplexidade;
  veiculoPlaca?: string;
  veiculoDescricao?: string;
}

const vazioParaUndefined = (v?: string) => (v?.trim() ? v.trim() : undefined);

/**
 * O backend rejeita (422) cliente junto com campos de interessado, e veículo
 * cadastrado junto com campos de veículo avulso — então cada modo manda só os
 * seus campos. Os do outro modo continuam no form (alternar não apaga o que
 * foi digitado), mas nunca vão pro payload.
 */
export function camposDoModo<T extends { clienteId?: number; veiculoId?: number } & DadosInteressado>(
  modo: ModoCliente,
  values: T,
) {
  const { interessadoNome, interessadoTelefone, interessadoEmail, veiculoCategoria, veiculoPlaca, veiculoDescricao, ...resto } = values;
  if (modo === 'CADASTRADO') {
    return { ...resto, clienteId: values.clienteId || undefined, veiculoId: values.veiculoId || undefined };
  }
  return {
    ...resto,
    clienteId: undefined,
    veiculoId: undefined,
    interessadoNome: vazioParaUndefined(interessadoNome),
    interessadoTelefone: vazioParaUndefined(interessadoTelefone),
    interessadoEmail: vazioParaUndefined(interessadoEmail),
    veiculoCategoria: veiculoCategoria || undefined,
    veiculoPlaca: vazioParaUndefined(veiculoPlaca),
    veiculoDescricao: vazioParaUndefined(veiculoDescricao),
  };
}

/** Orçamento sem cliente cadastrado: sem `clienteId`/`veiculoId` na resposta (o JSON omite nulos). */
export function orcamentoSemCadastro(o?: Pick<OrcamentoResponse, 'clienteId' | 'veiculoId'>): boolean {
  return !!o && (o.clienteId == null || o.veiculoId == null);
}

/** Termo pra procurar um cadastro existente do interessado: telefone e e-mail identificam melhor que o nome. */
export function termoBuscaDuplicata(d: Pick<DadosInteressado, 'interessadoTelefone' | 'interessadoEmail'>): string | undefined {
  const tel = (d.interessadoTelefone ?? '').replace(/\D/g, '');
  if (tel.length >= 8) return tel;
  const email = d.interessadoEmail?.trim();
  return email && email.includes('@') ? email : undefined;
}

export const MENSAGEM_ENVIAR_SEM_CADASTRO = 'Vincule um cliente e um veículo cadastrados antes de enviar o orçamento.';
