import { oficinasApi } from '@/api/endpoints/oficinas';
import { getLogoFixadaParaLogin, getNomeFixadoParaLogin } from '@/hooks/useOficina';
import type { OficinaResponse } from '@/api/types';
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
  logo: OSDocumentLogo | null;
}

/**
 * GET /oficinas/atual e /oficinas/atual/logo exigem OFICINA_READ — perfis
 * operacionais (Consultor, Mecânico) não têm essa permissão, mas geram PDF de
 * Orçamento/OS o tempo todo (é parte do trabalho deles com o cliente). Sem
 * esse fallback, a chamada direta a oficinasApi.atual() rejeitava com 403 e
 * quebrava a geração do PDF inteira pra esses perfis, não só a logo.
 *
 * Pra esses perfis, caímos pra: nome fixado neste navegador (mesma cache da
 * tela de login) + logo fixada (ver logoFixadaDoNavegadorParaPdf) — sem CNPJ
 * nem razão social, que são dado de configuração da loja mesmo, e esse perfil
 * não tem acesso a eles por design (não é o caso da logo, que é só branding
 * pro cabeçalho impresso). Resolver de verdade exige o backend liberar
 * nomeFantasia/logo — não CNPJ/razaoSocial — pra qualquer usuário autenticado
 * do tenant, não só quem tem OFICINA_READ (mesmo ponto já registrado em
 * useOficina.ts#useOficinaLogoSrc).
 */
export async function resolverOficinaParaPdf(): Promise<OficinaParaPdf> {
  try {
    const oficina = await oficinasApi.atual();
    return {
      nomeFantasia: oficina.nomeFantasia || oficina.razaoSocial || 'MotoGest',
      razaoSocial: oficina.razaoSocial ?? '',
      cnpj: oficina.cnpj ?? '',
      logo: await carregarLogoParaPdf(oficina),
    };
  } catch {
    return {
      nomeFantasia: getNomeFixadoParaLogin() ?? 'MotoGest',
      razaoSocial: '',
      cnpj: '',
      logo: await logoFixadaDoNavegadorParaPdf(),
    };
  }
}
