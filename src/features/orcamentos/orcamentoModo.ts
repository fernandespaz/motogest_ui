import type { CategoriaComplexidade, ConcluirCadastroRequest, OrcamentoResponse } from '@/api/types';
import { onlyDigits } from '@/lib/formatters';

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
  /** Demais dados do veículo avulso — os mesmos do cadastro de veículo (e da consulta de placa). */
  veiculoMarca?: string;
  veiculoModelo?: string;
  veiculoAnoFabricacao?: number;
  veiculoAnoModelo?: number;
  veiculoCor?: string;
  veiculoChassi?: string;
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
  const {
    interessadoNome,
    interessadoTelefone,
    interessadoEmail,
    veiculoCategoria,
    veiculoPlaca,
    veiculoDescricao: _descricao,
    veiculoMarca,
    veiculoModelo,
    veiculoAnoFabricacao,
    veiculoAnoModelo,
    veiculoCor,
    veiculoChassi,
    ...resto
  } = values;
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
    // A descrição que as listas e o PDF mostram é só "marca modelo": deriva dos campos, nunca é digitada à parte.
    veiculoDescricao: vazioParaUndefined([veiculoMarca, veiculoModelo].filter((p) => p?.trim()).join(' ')),
    veiculoMarca: vazioParaUndefined(veiculoMarca),
    veiculoModelo: vazioParaUndefined(veiculoModelo),
    veiculoAnoFabricacao: veiculoAnoFabricacao || undefined,
    veiculoAnoModelo: veiculoAnoModelo || undefined,
    veiculoCor: vazioParaUndefined(veiculoCor),
    veiculoChassi: vazioParaUndefined(veiculoChassi),
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

/** Campos do painel "Concluir cadastro": cliente novo e veículo novo (ou os ids de cadastros existentes). */
export interface ConclusaoValues {
  tipoPessoa: 'PF' | 'PJ';
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  placa: string;
  marca: string;
  modelo: string;
  categoria: '' | 'A' | 'B' | 'C';
  /** Anos vêm de <input type="number">, então chegam como texto. */
  anoFabricacao: string;
  anoModelo: string;
  cor: string;
  chassi: string;
  kmAtual: string;
}

const apenasDigitos = onlyDigits;

/** O que o consultor já digitou no rascunho vira o ponto de partida: ele só completa o que falta. */
export function conclusaoInicial(
  o: Pick<
    OrcamentoResponse,
    | 'interessadoNome'
    | 'interessadoTelefone'
    | 'interessadoEmail'
    | 'veiculoPlaca'
    | 'veiculoDescricao'
    | 'veiculoCategoria'
    | 'veiculoMarca'
    | 'veiculoModelo'
    | 'veiculoAnoFabricacao'
    | 'veiculoAnoModelo'
    | 'veiculoCor'
    | 'veiculoChassi'
  >,
): ConclusaoValues {
  return {
    tipoPessoa: 'PF',
    nome: o.interessadoNome ?? '',
    documento: '',
    email: o.interessadoEmail ?? '',
    telefone: apenasDigitos(o.interessadoTelefone ?? ''),
    placa: (o.veiculoPlaca ?? '').toUpperCase(),
    marca: o.veiculoMarca ?? '',
    // Rascunho antigo só tem a descrição livre ("Honda CG 160"): ela vira o modelo e o consultor ajusta.
    modelo: o.veiculoModelo ?? o.veiculoDescricao ?? '',
    categoria: o.veiculoCategoria ?? '',
    anoFabricacao: o.veiculoAnoFabricacao != null ? String(o.veiculoAnoFabricacao) : '',
    anoModelo: o.veiculoAnoModelo != null ? String(o.veiculoAnoModelo) : '',
    cor: o.veiculoCor ?? '',
    chassi: o.veiculoChassi ?? '',
    kmAtual: '',
  };
}

export type ErrosConclusao = Partial<Record<keyof ConclusaoValues, string>>;

/**
 * Monta o payload do endpoint (cliente existente OU novo; veículo existente OU novo) ou devolve os erros
 * de campo. Cliente/veículo existentes dispensam os respectivos campos.
 */
export function montarConclusao(
  v: ConclusaoValues,
  existentes: { clienteId?: number; veiculoId?: number; clienteJaVinculado?: boolean },
): { payload: ConcluirCadastroRequest } | { erros: ErrosConclusao } {
  const erros: ErrosConclusao = {};
  const precisaCliente = !existentes.clienteJaVinculado && existentes.clienteId == null;
  const documento = apenasDigitos(v.documento);
  if (precisaCliente) {
    if (!v.nome.trim()) erros.nome = 'Informe o nome';
    const tamanho = v.tipoPessoa === 'PJ' ? 14 : 11;
    if (documento.length !== tamanho) erros.documento = v.tipoPessoa === 'PJ' ? 'CNPJ deve ter 14 dígitos' : 'CPF deve ter 11 dígitos';
    if (v.email.trim() && !/^\S+@\S+\.\S+$/.test(v.email.trim())) erros.email = 'E-mail inválido';
  }
  if (existentes.veiculoId == null) {
    if (!v.placa.trim()) erros.placa = 'Informe a placa';
    if (!v.categoria) erros.categoria = 'Selecione a categoria';
  }
  if (Object.keys(erros).length > 0) return { erros };

  const payload: ConcluirCadastroRequest = {};
  if (!existentes.clienteJaVinculado) {
    if (existentes.clienteId != null) payload.clienteId = existentes.clienteId;
    else
      payload.cliente = {
        tipoPessoa: v.tipoPessoa,
        nome: v.nome.trim(),
        documento,
        email: v.email.trim() || undefined,
        telefone: apenasDigitos(v.telefone) || undefined,
        ativo: true,
      };
  }
  if (existentes.veiculoId != null) payload.veiculoId = existentes.veiculoId;
  else
    payload.veiculo = {
      placa: v.placa.trim().toUpperCase(),
      marca: v.marca.trim() || undefined,
      modelo: v.modelo.trim() || undefined,
      categoria: v.categoria as 'A' | 'B' | 'C',
      anoFabricacao: Number(v.anoFabricacao) || undefined,
      anoModelo: Number(v.anoModelo) || undefined,
      cor: v.cor.trim() || undefined,
      chassi: v.chassi.trim() || undefined,
      kmAtual: Number(v.kmAtual) || undefined,
    };
  return { payload };
}
