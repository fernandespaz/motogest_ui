import { useAtualizarNfse, useBaixarXmlNfse } from '@/hooks/useFiscal';
import { saveBlobAsFile } from '@/lib/downloadBlob';
import { alertaDeErro, alertaDeStatusNfse } from './fiscalAlertas';
import type { Alerta } from './useAlerta';

/** Ações de uma nota já existente (atualizar status, baixar XML) compartilhadas entre o cartão da OS e a lista de notas. */
export function useNfseAcoes(mostrar: (alerta: Alerta) => void) {
  const atualizarMutation = useAtualizarNfse();
  const baixarMutation = useBaixarXmlNfse();

  async function atualizar(id: number) {
    try {
      mostrar(alertaDeStatusNfse(await atualizarMutation.mutateAsync(id)));
    } catch (error) {
      mostrar(alertaDeErro(error, 'Não foi possível atualizar o status', 'Tente novamente em instantes.'));
    }
  }

  async function baixarXml(id: number) {
    try {
      const { blob, filename } = await baixarMutation.mutateAsync(id);
      saveBlobAsFile(blob, filename);
    } catch (error) {
      mostrar(alertaDeErro(error, 'Não foi possível baixar o XML', 'Tente novamente em instantes.'));
    }
  }

  return {
    atualizar,
    baixarXml,
    atualizando: atualizarMutation.isPending,
    baixando: baixarMutation.isPending,
  };
}
