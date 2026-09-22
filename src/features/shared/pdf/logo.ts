import { oficinasApi } from '@/api/endpoints/oficinas';
import { getLogoFixadaParaLogin, getNomeFixadoParaLogin } from '@/hooks/useOficina';
import type { OficinaResponse } from '@/api/types';
import { formatCep, formatPhone } from '@/lib/formatters';
import type { OSDocumentLogo } from './types';

/** A logo é impressa a ~15mm — embutir o upload original (podem ser vários
 * megapixels) só infla o PDF à toa. 400px no lado maior já é mais resolução
 * do que qualquer impressora aproveita nesse tamanho. */
async function blobParaLogoPdf(blob: Blob): Promise<OSDocumentLogo | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const MAX_LADO = 400;
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, largura, altura);

    return { dataUrl: canvas.toDataURL('image/png'), largura, altura };
  } catch {
    return null;
  }
}

/**
 * Resolve a logo da oficina pra um PNG base64 pronto pro jsPDF (addImage não
 * aceita blob:/https: diretamente). Cosmético — qualquer falha (sem logo,
 * CORS numa URL externa, etc.) retorna null em vez de quebrar a geração do PDF.
 */
export async function carregarLogoParaPdf(oficina: OficinaResponse): Promise<OSDocumentLogo | null> {
  try {
    let blob: Blob | null = null;
    if (oficina.logoImagemDisponivel) {
      blob = await oficinasApi.buscarLogoBlob();
    } else if (oficina.logoUrl) {
      const resposta = await fetch(oficina.logoUrl);
      if (resposta.ok) blob = await resposta.blob();
    }
    if (!blob) return null;
    return await blobParaLogoPdf(blob);
  } catch {
    return null;
  }
}

/**
 * Fallback pra quando a logo "ao vivo" não pode ser buscada (ver
 * resolverOficinaParaPdf) — reaproveita a mesma logo fixada neste navegador
 * que a Sidebar/Topbar/tela de login já usam (useOficinaLogoSrc em
 * useOficina.ts), convertendo o data URL guardado de volta pro formato
 * OSDocumentLogo (que carrega largura/altura pro jsPDF montar a proporção
 * certa). Só funciona se alguém com OFICINA_READ já tiver aberto o app nesse
 * navegador antes — sem isso, retorna null e o PDF sai sem logo mesmo.
 */
async function logoFixadaDoNavegadorParaPdf(): Promise<OSDocumentLogo | null> {
  const dataUrl = getLogoFixadaParaLogin();
  if (!dataUrl) return null;
  try {
    const blob = await fetch(dataUrl).then((r) => r.blob());
    return await blobParaLogoPdf(blob);
  } catch {
    return null;
  }
}

export interface OficinaParaPdf {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  /** "Rua X, 100 · Centro · São Paulo/SP · CEP 01000-000" — vazio quando o perfil recebe a versão resumida. */
  endereco: string;
  /** "(11) 99999-0000 · contato@oficina.com" — idem. */
  contato: string;
  logo: OSDocumentLogo | null;
}

function montarEndereco(oficina: OficinaResponse): string {
  const rua = [oficina.logradouro, oficina.numero].filter(Boolean).join(', ');
  const cidadeUf = [oficina.cidade, oficina.uf].filter(Boolean).join('/');
  return [rua, oficina.bairro, cidadeUf, oficina.cep ? `CEP ${formatCep(oficina.cep)}` : '']
    .filter(Boolean)
    .join(' · ');
}

function montarContato(oficina: OficinaResponse): string {
  return [oficina.telefone ? formatPhone(oficina.telefone) : '', oficina.email].filter(Boolean).join(' · ');
}

/**
 * GET /oficinas/atual aceita OFICINA_READ, ORCAMENTO_READ ou
 * ORDEM_SERVICO_READ — pra quem não tem OFICINA_READ (Consultor) o backend
 * devolve a versão resumida (nome + logo, sem razão social/CNPJ/endereço/
 * contato), e o cabeçalho do PDF simplesmente omite essas linhas.
 *
 * Se nem isso vier (perfil sem nenhuma das três, ou falha de rede), cai pra:
 * logo via GET /oficinas/atual/logo — que não exige permissão nenhuma além
 * de estar autenticado — e, se ela também falhar, a logo/nome fixados neste
 * navegador (ver logoFixadaDoNavegadorParaPdf). Nada disso pode impedir o
 * PDF de sair (prohibited-actions #10).
 */
export async function resolverOficinaParaPdf(): Promise<OficinaParaPdf> {
  try {
    const oficina = await oficinasApi.atual();
    return {
      nomeFantasia: oficina.nomeFantasia || oficina.razaoSocial || 'MotoGest',
      razaoSocial: oficina.razaoSocial ?? '',
      cnpj: oficina.cnpj ?? '',
      endereco: montarEndereco(oficina),
      contato: montarContato(oficina),
      logo: await carregarLogoParaPdf(oficina),
    };
  } catch {
    return {
      nomeFantasia: getNomeFixadoParaLogin() ?? 'MotoGest',
      razaoSocial: '',
      cnpj: '',
      endereco: '',
      contato: '',
      logo: (await logoDoEndpointParaPdf()) ?? (await logoFixadaDoNavegadorParaPdf()),
    };
  }
}

/** GET /oficinas/atual/logo direto — 404 (sem logo) ou qualquer erro vira null. */
async function logoDoEndpointParaPdf(): Promise<OSDocumentLogo | null> {
  try {
    return await blobParaLogoPdf(await oficinasApi.buscarLogoBlob());
  } catch {
    return null;
  }
}
