import { useState } from 'react';
import { extractErrorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import type { FormatoExportacaoCaixa } from '@/api/types';
import { baixarExportacaoCaixa } from './caixaExport';

/**
 * Exportação de relatório/comprovante do caixa com estado de "baixando" e toast de erro — o mesmo ciclo
 * (loading, try/catch, mensagem) que os relatórios, o detalhe da sessão e o fechamento repetiam.
 */
export function useExportacaoCaixa(mensagemErro: string) {
  const [exportando, setExportando] = useState(false);

  async function exportar(fetchBlob: () => Promise<Blob>, nomeBase: string, formato: FormatoExportacaoCaixa) {
    setExportando(true);
    try {
      await baixarExportacaoCaixa(fetchBlob, nomeBase, formato);
    } catch (error) {
      toast.error(extractErrorMessage(error, mensagemErro));
    } finally {
      setExportando(false);
    }
  }

  return { exportando, exportar };
}
