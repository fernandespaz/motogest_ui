import { useEffect } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfiguracaoFiscal, useEmitirNfse } from '@/hooks/useFiscal';
import { alertaDeErro, alertaDeStatusNfse } from './fiscalAlertas';
import { useAlerta } from './useAlerta';

interface Props {
  ordemServico: { id: number; numero?: string };
  onClose: () => void;
}

/**
 * Convite para emitir a NFS-e logo depois de faturar uma OS fora da tela dela
 * (ex.: Meu Caixa). A emissão continua manual — só acontece se o usuário
 * confirmar aqui. Quem monta isto já checou FISCAL_EMITIR; se a oficina não
 * está pronta para emitir, o convite some em silêncio (nada a oferecer).
 */
export function OfertaEmissaoNfse({ ordemServico, onClose }: Props) {
  const { data: config, isError } = useConfiguracaoFiscal();
  const emitir = useEmitirNfse();
  const { mostrar, dialogo } = useAlerta();

  const pronta = config?.prontaParaEmitir === true;
  const desistir = isError || (config !== undefined && !pronta);

  // Nada a oferecer (não configurada / falha ao consultar): fecha sem alarde.
  useEffect(() => {
    if (desistir) onClose();
  }, [desistir, onClose]);

  // Resultado já exibido em diálogo próprio: o convite em si fecha.
  async function emitirAgora() {
    try {
      mostrar(alertaDeStatusNfse(await emitir.mutateAsync(ordemServico.id)));
    } catch (error) {
      mostrar(alertaDeErro(error, 'Não foi possível emitir a NFS-e', 'Tente novamente pela tela da OS.'));
    }
  }

  // Fica aberto (com loading) durante a chamada; some quando há resultado, que sai no diálogo abaixo.
  const jaResolvido = emitir.isSuccess || emitir.isError;

  return (
    <>
      <ConfirmDialog
        open={pronta && !jaResolvido}
        title="OS faturada. Emitir NFS-e agora?"
        description={
          `A nota da OS ${ordemServico.numero ?? `#${ordemServico.id}`} será enviada ao governo com os itens de serviço.` +
          (config?.ambiente === 'HOMOLOGACAO' ? ' Ambiente de teste: sem validade fiscal.' : '')
        }
        confirmLabel="Emitir agora"
        cancelLabel="Depois"
        loading={emitir.isPending}
        onConfirm={emitirAgora}
        onCancel={onClose}
      />
      {dialogo}
    </>
  );
}
