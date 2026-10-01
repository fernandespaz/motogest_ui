import { openPdfInNewTab, saveBlobAsFile } from '@/lib/downloadBlob';
import type { FormatoExportacaoCaixa } from '@/api/types';

/** PDF abre em nova aba (padrão do app); XLSX só faz sentido como download — o navegador não renderiza. */
export async function baixarExportacaoCaixa(
  fetchBlob: () => Promise<Blob>,
  nomeBase: string,
  formato: FormatoExportacaoCaixa,
) {
  const extensao = formato === 'PDF' ? 'pdf' : 'xlsx';
  if (formato === 'PDF') {
    await openPdfInNewTab(fetchBlob, `${nomeBase}.${extensao}`);
  } else {
    saveBlobAsFile(await fetchBlob(), `${nomeBase}.${extensao}`);
  }
}
