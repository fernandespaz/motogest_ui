/** Quadro de recorte 2:1 — o backend recorta toda foto de produto em 2:1 (480x240 no máximo). */
export const RECORTE_LARGURA = 480;
export const RECORTE_ALTURA = RECORTE_LARGURA / 2;
// A saída sai com o dobro da resolução do quadro; o backend reduz para 480x240.
const FATOR_EXPORTACAO = 2;

/** Enquadramento: `zoom` 1 = imagem inteira visível (contain); `dx`/`dy` = deslocamento do centro, em px do quadro. */
export interface Enquadramento {
  zoom: number;
  dx: number;
  dy: number;
}

export const ZOOM_MAXIMO = 4;

/** Decodifica o arquivo; `null` se o navegador não conseguir (aí o chamador usa o arquivo como está). */
export async function carregarImagem(arquivo: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(arquivo);
  } catch {
    return null;
  }
}

function escalaBase(imagem: { width: number; height: number }): number {
  return Math.min(RECORTE_LARGURA / imagem.width, RECORTE_ALTURA / imagem.height);
}

/** Mantém o centro da imagem dentro do quadro, pra não "perder" a foto arrastando longe demais. */
export function limitarEnquadramento(enq: Enquadramento): Enquadramento {
  const limiteX = RECORTE_LARGURA / 2;
  const limiteY = RECORTE_ALTURA / 2;
  return {
    zoom: enq.zoom,
    dx: Math.max(-limiteX, Math.min(limiteX, enq.dx)),
    dy: Math.max(-limiteY, Math.min(limiteY, enq.dy)),
  };
}

/** Desenha o enquadramento (fundo branco + imagem) num contexto de `RECORTE_LARGURA * fator` de largura. */
export function desenharEnquadramento(
  ctx: CanvasRenderingContext2D,
  imagem: ImageBitmap,
  enq: Enquadramento,
  fator = 1,
) {
  const escala = escalaBase(imagem) * enq.zoom * fator;
  const largura = imagem.width * escala;
  const altura = imagem.height * escala;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, RECORTE_LARGURA * fator, RECORTE_ALTURA * fator);
  ctx.drawImage(
    imagem,
    (RECORTE_LARGURA * fator - largura) / 2 + enq.dx * fator,
    (RECORTE_ALTURA * fator - altura) / 2 + enq.dy * fator,
    largura,
    altura,
  );
}

/** Renderiza o recorte final em JPEG 2:1. `null` se o navegador não conseguir gerar. */
export async function exportarRecorte(
  imagem: ImageBitmap,
  enq: Enquadramento,
  nomeOriginal: string,
): Promise<File | null> {
  const canvas = document.createElement('canvas');
  canvas.width = RECORTE_LARGURA * FATOR_EXPORTACAO;
  canvas.height = RECORTE_ALTURA * FATOR_EXPORTACAO;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  desenharEnquadramento(ctx, imagem, enq, FATOR_EXPORTACAO);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) return null;
  const nome = nomeOriginal.replace(/\.[^.]+$/, '') || 'foto';
  return new File([blob], `${nome}.jpg`, { type: 'image/jpeg' });
}
