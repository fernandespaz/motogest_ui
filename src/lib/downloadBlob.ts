/**
 * Opens a blank tab synchronously (preserving the click's user-activation) then
 * navigates it to the blob once fetched — window.open() after an await is
 * silently blocked by popup blockers in most browsers.
 */
export async function openPdfInNewTab(fetchBlob: () => Promise<Blob>, filename: string) {
  const win = window.open('', '_blank');
  try {
    const blob = await fetchBlob();
    const url = URL.createObjectURL(blob);
    if (win) {
      win.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    win?.close();
    throw error;
  }
}

/** Baixa um blob direto (ex.: planilha Excel) — sem tentar abrir em nova aba, que não faz sentido pra um formato que o navegador não renderiza. */
export function saveBlobAsFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
