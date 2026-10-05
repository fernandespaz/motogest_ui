import { z } from 'zod';
import type {
  AmbienteFiscal,
  ConfiguracaoFiscalRequest,
  ConfiguracaoFiscalResponse,
  RegimeTributario,
} from '@/api/types';

const REGIMES_SIMPLES: RegimeTributario[] = ['MEI', 'SIMPLES_NACIONAL'];

/** MEI / Simples Nacional informam o percentual aproximado de tributos (o ISS vai no DAS). */
export function usaAliquotaSimples(regime: string | undefined): boolean {
  return !!regime && REGIMES_SIMPLES.includes(regime as RegimeTributario);
}

/** Lucro Presumido / Real informam a alíquota de ISS. */
export function usaAliquotaIss(regime: string | undefined): boolean {
  return regime === 'LUCRO_PRESUMIDO' || regime === 'LUCRO_REAL';
}

/** Aceita "6", "6,5" e "6.5"; vazio ou inválido vira undefined. */
export function parseAliquota(texto: string): number | undefined {
  const normalizado = texto.trim().replace(',', '.');
  if (normalizado === '') return undefined;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : undefined;
}

function formatAliquota(valor: number | undefined): string {
  return valor == null ? '' : String(valor).replace('.', ',');
}

const digitos = (quantidade: number, mensagem: string) =>
  z.string().refine((v) => v === '' || new RegExp(`^\\d{${quantidade}}$`).test(v), mensagem);

const aliquota = (maximo: number) =>
  z.string().refine((v) => {
    if (v.trim() === '') return true;
    const n = parseAliquota(v);
    return n !== undefined && n >= 0 && n <= maximo;
  }, `Informe um percentual entre 0 e ${String(maximo).replace('.', ',')}`);

// Salvar incompleto é permitido (o backend devolve o que falta em `pendencias`),
// então aqui só se valida o formato do que foi preenchido.
export const configuracaoFiscalSchema = z.object({
  regimeTributario: z.string(),
  inscricaoMunicipal: z.string().max(20, 'No máximo 20 caracteres'),
  codigoMunicipioIbge: digitos(7, 'O código IBGE tem 7 dígitos'),
  codigoServico: digitos(6, 'O código de tributação tem 6 dígitos'),
  codigoServicoMunicipal: z.string().max(20, 'No máximo 20 caracteres'),
  cnae: digitos(7, 'O CNAE tem 7 dígitos'),
  aliquotaIss: aliquota(5),
  aliquotaSimplesNacional: aliquota(99.99),
  issRetido: z.boolean(),
});

export type ConfiguracaoFiscalForm = z.infer<typeof configuracaoFiscalSchema>;

export function toFormValues(config?: ConfiguracaoFiscalResponse): ConfiguracaoFiscalForm {
  return {
    regimeTributario: config?.regimeTributario ?? '',
    inscricaoMunicipal: config?.inscricaoMunicipal ?? '',
    codigoMunicipioIbge: config?.codigoMunicipioIbge ?? '',
    codigoServico: config?.codigoServico ?? '',
    codigoServicoMunicipal: config?.codigoServicoMunicipal ?? '',
    cnae: config?.cnae ?? '',
    aliquotaIss: formatAliquota(config?.aliquotaIss),
    aliquotaSimplesNacional: formatAliquota(config?.aliquotaSimplesNacional),
    issRetido: config?.issRetido ?? false,
  };
}

const textoOuUndefined = (v: string) => (v.trim() === '' ? undefined : v.trim());

/**
 * Monta o PUT completo. O backend substitui a configuração inteira, então
 * salvar só a habilitação (ou só os dados) exige reenviar o outro lado — daí
 * `emissaoHabilitada`/`ambiente` virem à parte. A alíquota que não se aplica ao
 * regime escolhido não é enviada.
 */
export function toRequest(
  values: ConfiguracaoFiscalForm,
  habilitacao: { emissaoHabilitada: boolean; ambiente: AmbienteFiscal; provedorEmpresaRef?: string },
): ConfiguracaoFiscalRequest {
  const regime = values.regimeTributario || undefined;
  return {
    emissaoHabilitada: habilitacao.emissaoHabilitada,
    ambiente: habilitacao.ambiente,
    regimeTributario: regime as RegimeTributario | undefined,
    inscricaoMunicipal: textoOuUndefined(values.inscricaoMunicipal),
    codigoMunicipioIbge: textoOuUndefined(values.codigoMunicipioIbge),
    codigoServico: textoOuUndefined(values.codigoServico),
    codigoServicoMunicipal: textoOuUndefined(values.codigoServicoMunicipal),
    cnae: textoOuUndefined(values.cnae),
    aliquotaIss: usaAliquotaIss(regime) ? parseAliquota(values.aliquotaIss) : undefined,
    aliquotaSimplesNacional: usaAliquotaSimples(regime) ? parseAliquota(values.aliquotaSimplesNacional) : undefined,
    issRetido: values.issRetido,
    // Reservado ao backend: a tela não o edita, mas o PUT substitui tudo — reenvia o que veio.
    provedorEmpresaRef: habilitacao.provedorEmpresaRef,
  };
}

/** Pendências que se resolvem no cadastro da oficina (e não na configuração fiscal em si). */
export function pendenciaDaOficina(texto: string): boolean {
  return /oficina/i.test(texto) && !/certificado/i.test(texto);
}

export function pendenciaDoCertificado(texto: string): boolean {
  return /certificado/i.test(texto);
}
