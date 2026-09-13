import { oficinasApi } from '@/api/endpoints/oficinas';
import type { OficinaResponse } from '@/api/types';
import type { OSDocumentLogo } from './types';

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

    const bitmap = await createImageBitmap(blob);
    // A logo é impressa a ~15mm — embutir o upload original (podem ser
    // vários megapixels) só infla o PDF à toa. 400px no lado maior já é mais
    // resolução do que qualquer impressora aproveita nesse tamanho.
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
