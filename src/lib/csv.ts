import { saveBlobAsFile } from './downloadBlob';

export type CelulaCsv = string | number | null | undefined;

function escapar(celula: CelulaCsv): string {
  if (celula == null) return '';
  const texto = typeof celula === 'number' ? String(celula).replace('.', ',') : celula;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV no formato que o Excel brasileiro abre direto: separador `;`, decimal com vírgula e BOM para os acentos. */
export function gerarCsv(linhas: CelulaCsv[][]): string {
  return `\uFEFF${linhas.map((linha) => linha.map(escapar).join(';')).join('\r\n')}`;
}

export function baixarCsv(nomeArquivo: string, linhas: CelulaCsv[][]) {
  saveBlobAsFile(new Blob([gerarCsv(linhas)], { type: 'text/csv;charset=utf-8' }), `${nomeArquivo}.csv`);
}
