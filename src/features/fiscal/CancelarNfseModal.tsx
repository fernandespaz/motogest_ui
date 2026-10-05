import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { useCancelarNfse } from '@/hooks/useFiscal';
import type { NfseResponse } from '@/api/types';
import { alertaDeErro } from './fiscalAlertas';
import type { Alerta } from './useAlerta';

const MIN = 15;
const MAX = 255;

interface Props {
  nota: NfseResponse | null;
  onClose: () => void;
  mostrar: (alerta: Alerta) => void;
}

export function CancelarNfseModal({ nota, onClose, mostrar }: Props) {
  const [justificativa, setJustificativa] = useState('');
  const cancelar = useCancelarNfse();
  const tamanho = justificativa.trim().length;
  const valida = tamanho >= MIN && tamanho <= MAX;

  function fechar() {
    if (cancelar.isPending) return;
    setJustificativa('');
    onClose();
  }

  async function confirmar() {
    if (!nota?.id || !valida) return;
    try {
      await cancelar.mutateAsync({ id: nota.id, payload: { justificativa: justificativa.trim() } });
      setJustificativa('');
      onClose();
      mostrar({
        tone: 'success',
        title: 'NFS-e cancelada',
        message: `A nota ${nota.numero ? `nº ${nota.numero} ` : ''}foi cancelada. O XML continua disponível para consulta.`,
      });
    } catch (error) {
      // Se o governo recusou (ex.: prazo vencido) a nota segue autorizada; se a
      // conexão falhou, a mensagem do backend já orienta a usar "Atualizar status".
      onClose();
      mostrar(alertaDeErro(error, 'Não foi possível cancelar a NFS-e', 'Tente novamente em instantes.'));
    }
  }

  return (
    <Modal
      open={nota !== null}
      onClose={fechar}
      title="Cancelar NFS-e"
      size="md"
      centered
      footer={
        <>
          <Button variant="secondary" onClick={fechar} disabled={cancelar.isPending}>
            Voltar
          </Button>
          <Button variant="danger" onClick={confirmar} loading={cancelar.isPending} disabled={!valida}>
            Cancelar nota
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-ink-muted">
        O cancelamento é enviado ao governo e não pode ser desfeito. Informe o motivo (de {MIN} a {MAX} caracteres).
      </p>
      <Textarea
        label="Justificativa"
        required
        value={justificativa}
        maxLength={MAX}
        onChange={(e) => setJustificativa(e.target.value)}
        hint={`${tamanho}/${MAX} caracteres${tamanho > 0 && tamanho < MIN ? ` — faltam ${MIN - tamanho}` : ''}`}
      />
    </Modal>
  );
}
