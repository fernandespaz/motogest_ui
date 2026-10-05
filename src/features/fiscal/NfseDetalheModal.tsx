import { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { ReadOnlyField } from '@/components/ui/Field';
import { useNotaFiscal } from '@/hooks/useFiscal';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { AmbienteBadge, NfseStatusBadge } from './NfseBadges';
import { NfseAcoesBotoes } from './NfseAcoesBotoes';
import { useErroComoAlerta } from './useErroComoAlerta';
import type { Alerta } from './useAlerta';

const NOMES_EVENTO: Record<string, string> = {
  SOLICITADA: 'Emissão solicitada',
  RESULTADO_EMISSAO: 'Resultado da emissão',
  FALHA_COMUNICACAO: 'Falha de comunicação',
  CONSULTA: 'Consulta ao governo',
  CANCELAMENTO_SOLICITADO: 'Cancelamento solicitado',
  CANCELAMENTO_RESULTADO: 'Resultado do cancelamento',
};

interface Props {
  notaId: number | null;
  onClose: () => void;
  mostrar: (alerta: Alerta) => void;
}

export function NfseDetalheModal({ notaId, onClose, mostrar }: Props) {
  const { data: nota, isLoading, isError, error } = useNotaFiscal(notaId ?? undefined);
  useErroComoAlerta(isError, error, 'Não foi possível carregar a nota', mostrar);
  // Sem a nota não há o que mostrar: fecha em vez de deixar o spinner eterno atrás do alerta.
  useEffect(() => {
    if (isError) onClose();
  }, [isError, onClose]);

  return (
    <Modal
      open={notaId !== null}
      onClose={onClose}
      size="lg"
      centered
      title={nota ? `NFS-e ${nota.numero ? `nº ${nota.numero}` : '(sem número)'}` : 'NFS-e'}
    >
      {isLoading || !nota ? (
        <PageSpinner label="Carregando nota..." />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <NfseStatusBadge status={nota.status} />
            <AmbienteBadge ambiente={nota.ambiente} />
          </div>

          {nota.mensagem && <p className="rounded-lg bg-surface-alt px-3 py-2 text-sm text-ink">{nota.mensagem}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Ordem de Serviço" value={nota.ordemServicoNumero ?? `#${nota.ordemServicoId}`} />
            <ReadOnlyField label="Valor dos serviços" value={formatCurrency(nota.valorServicos)} />
            <ReadOnlyField label="Solicitada em" value={formatDateTime(nota.dataSolicitacao)} />
            {nota.dataAutorizacao && (
              <ReadOnlyField label="Autorizada em" value={formatDateTime(nota.dataAutorizacao)} />
            )}
            {nota.chaveAcesso && <ReadOnlyField label="Chave de acesso" value={nota.chaveAcesso} />}
            {nota.codigoVerificacao && <ReadOnlyField label="Código de verificação" value={nota.codigoVerificacao} />}
            {nota.protocolo && <ReadOnlyField label="Protocolo" value={nota.protocolo} />}
            {nota.dataCancelamento && (
              <ReadOnlyField label="Cancelada em" value={formatDateTime(nota.dataCancelamento)} />
            )}
            {nota.justificativaCancelamento && (
              <ReadOnlyField label="Justificativa do cancelamento" value={nota.justificativaCancelamento} />
            )}
          </div>

          <NfseAcoesBotoes nota={nota} mostrar={mostrar} />

          {nota.eventos && nota.eventos.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Histórico</h3>
              <ol className="space-y-2 border-l-2 border-border pl-4">
                {nota.eventos.map((e, i) => (
                  <li key={`${e.ocorridoEm}-${i}`} className="text-sm">
                    <p className="font-medium text-ink">
                      {NOMES_EVENTO[e.tipo ?? ''] ?? e.tipo}
                      <span className="ml-2 text-xs font-normal text-ink-muted">{formatDateTime(e.ocorridoEm)}</span>
                    </p>
                    {e.mensagem && <p className="text-ink-muted">{e.mensagem}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
