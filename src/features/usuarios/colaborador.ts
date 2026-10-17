import { z } from 'zod';
import type { DadosColaborador, EstadoCivil, Sexo, TipoContrato, UsuarioResponse } from '@/api/types';
import { onlyDigits, toDateInputValue } from '@/lib/formatters';
import { isCpfValido, isPisValido } from '@/lib/documentos';

export const SEXO_LABEL: Record<Sexo, string> = {
  MASCULINO: 'Masculino',
  FEMININO: 'Feminino',
  OUTRO: 'Outro',
  NAO_INFORMADO: 'Prefiro não informar',
};

export const ESTADO_CIVIL_LABEL: Record<EstadoCivil, string> = {
  SOLTEIRO: 'Solteiro(a)',
  CASADO: 'Casado(a)',
  UNIAO_ESTAVEL: 'União estável',
  SEPARADO: 'Separado(a)',
  DIVORCIADO: 'Divorciado(a)',
  VIUVO: 'Viúvo(a)',
};

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  INDETERMINADO: 'Prazo indeterminado',
  EXPERIENCIA: 'Contrato de experiência',
  DETERMINADO: 'Prazo determinado',
  APRENDIZ: 'Aprendiz',
};

const texto = z.string().optional();
const data = z.string().optional();
const uf = z
  .string()
  .optional()
  .refine((v) => !v || /^[A-Za-z]{2}$/.test(v), 'UF com 2 letras');

// Tudo aqui é opcional de propósito: dado de RH nunca pode impedir a criação
// de um acesso ao sistema (ver docs/backend-cadastro-colaborador-clt.md).
// Texto em branco = "não informado"; só validamos o que foi preenchido.
export const colaboradorShape = {
  cpf: texto.refine((v) => !v || isCpfValido(v), 'CPF inválido'),
  rg: texto,
  rgOrgaoEmissor: texto,
  rgUf: uf,
  rgDataEmissao: data,
  dataNascimento: data.refine((v) => {
    if (!v) return true;
    const limite = new Date();
    limite.setFullYear(limite.getFullYear() - 14);
    return new Date(`${v}T00:00:00`) <= limite;
  }, 'Idade mínima de 14 anos'),
  sexo: texto,
  estadoCivil: texto,
  nacionalidade: texto,
  naturalidade: texto,
  naturalidadeUf: uf,
  nomeMae: texto,
  nomePai: texto,
  pisPasep: texto.refine((v) => !v || isPisValido(v), 'PIS/PASEP inválido'),
  ctpsNumero: texto,
  ctpsSerie: texto,
  ctpsUf: uf,
  tituloEleitor: texto,

  emailPessoal: texto.refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido'),
  telefone: texto,
  celular: texto,
  contatoEmergenciaNome: texto,
  contatoEmergenciaParentesco: texto,
  contatoEmergenciaTelefone: texto,

  cep: texto.refine((v) => !v || onlyDigits(v).length === 8, 'CEP com 8 dígitos'),
  logradouro: texto,
  numero: texto,
  complemento: texto,
  bairro: texto,
  cidade: texto,
  uf,

  matricula: texto,
  cargo: texto,
  cbo: texto.refine((v) => !v || onlyDigits(v).length === 6, 'CBO com 6 dígitos'),
  dataAdmissao: data,
  tipoContrato: texto,
  dataFimContrato: data,
  jornadaSemanalHoras: texto.refine(
    (v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 44),
    'Entre 1 e 44 horas (limite da CLT)',
  ),
  salario: texto.refine((v) => !v || Number(v) >= 0, 'Salário inválido'),
  dataDemissao: data,
};

export type ColaboradorForm = { [K in keyof typeof colaboradorShape]?: string };

/** A demissão não pode ser anterior à admissão — checagem cruzada, usada nos dois schemas do modal. */
export const demissaoDepoisDaAdmissao = (v: { dataAdmissao?: string; dataDemissao?: string }) =>
  !v.dataAdmissao || !v.dataDemissao || v.dataDemissao >= v.dataAdmissao;

// Em qual aba mora cada campo — o submit com erro leva o usuário até a aba
// do primeiro campo inválido (os campos das outras abas nem estão montados).
export type AbaUsuario = 'acesso' | 'pessoais' | 'contato' | 'contratacao';

const ABA_POR_CAMPO: Record<string, AbaUsuario> = {
  nome: 'acesso', email: 'acesso', perfilId: 'acesso', senha: 'acesso', confirmacaoSenha: 'acesso', ativo: 'acesso',
  emailPessoal: 'contato', telefone: 'contato', celular: 'contato',
  contatoEmergenciaNome: 'contato', contatoEmergenciaParentesco: 'contato', contatoEmergenciaTelefone: 'contato',
  cep: 'contato', logradouro: 'contato', numero: 'contato', complemento: 'contato', bairro: 'contato',
  cidade: 'contato', uf: 'contato',
  matricula: 'contratacao', cargo: 'contratacao', cbo: 'contratacao', dataAdmissao: 'contratacao',
  tipoContrato: 'contratacao', dataFimContrato: 'contratacao', jornadaSemanalHoras: 'contratacao',
  salario: 'contratacao', dataDemissao: 'contratacao',
};

export function abaDoCampo(campo: string): AbaUsuario {
  return ABA_POR_CAMPO[campo] ?? 'pessoais';
}

const CAMPOS_SO_DIGITOS: (keyof ColaboradorForm)[] = [
  'cpf', 'pisPasep', 'tituloEleitor', 'cep', 'telefone', 'celular', 'contatoEmergenciaTelefone', 'cbo',
];
const CAMPOS_UF: (keyof ColaboradorForm)[] = ['rgUf', 'naturalidadeUf', 'ctpsUf', 'uf'];
const CAMPOS_DATA: (keyof ColaboradorForm)[] = ['rgDataEmissao', 'dataNascimento', 'dataAdmissao', 'dataFimContrato', 'dataDemissao'];
const CAMPOS_NUMERO: (keyof ColaboradorForm)[] = ['salario', 'jornadaSemanalHoras'];

const campos = Object.keys(colaboradorShape) as (keyof ColaboradorForm)[];

/** Resposta da API → valores do formulário (sempre string; ausente vira vazio). */
export function colaboradorParaForm(u?: Partial<UsuarioResponse> | null): ColaboradorForm {
  const out: ColaboradorForm = {};
  for (const campo of campos) {
    const bruto = u?.[campo as keyof DadosColaborador];
    if (bruto == null) out[campo] = '';
    else out[campo] = CAMPOS_DATA.includes(campo) ? toDateInputValue(String(bruto)) : String(bruto);
  }
  return out;
}

/**
 * Valores do formulário → payload: sem máscara, números como número.
 * Campo em branco é omitido na criação; na edição vai como `null`, porque o
 * PUT precisa de um sinal explícito pra limpar um dado já gravado.
 */
export function formParaColaborador(v: ColaboradorForm, { limparVazios = false } = {}): DadosColaborador {
  const payload: Record<string, unknown> = {};
  for (const campo of campos) {
    let valor = v[campo]?.trim();
    if (!valor) {
      if (limparVazios) payload[campo] = null;
      continue;
    }
    if (CAMPOS_SO_DIGITOS.includes(campo)) valor = onlyDigits(valor);
    if (CAMPOS_UF.includes(campo)) valor = valor.toUpperCase();
    payload[campo] = CAMPOS_NUMERO.includes(campo) ? Number(valor) : valor;
  }
  return payload as DadosColaborador;
}

const ORDEM_ABAS: AbaUsuario[] = ['acesso', 'pessoais', 'contato', 'contratacao'];

/** Aba mais à esquerda que tem algum campo com erro (a ordem das chaves do RHF não segue a da tela). */
export function primeiraAbaComErro(campos: string[]): AbaUsuario | undefined {
  const abas = new Set(campos.map(abaDoCampo));
  return ORDEM_ABAS.find((a) => abas.has(a));
}

/** Todas as abas que têm algum campo com erro (pro ponto vermelho no cabeçalho). */
export function abasComErro(campos: string[]): Set<AbaUsuario> {
  return new Set(campos.map(abaDoCampo));
}
