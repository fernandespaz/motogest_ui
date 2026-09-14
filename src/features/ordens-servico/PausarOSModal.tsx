import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Field';

interface PausarOSModalProps {
  open: boolean;
  numero?: string;
  motivo: string;
  onMotivoChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

/** Compartilhado entre MinhasOrdensServicoPage (lista) e MinhaOrdemServicoDetalhePage
 *  (detalhe) — mesmo fluxo de pausa em ambas as telas do técnico. */
export function PausarOSModal({ open, numero, motivo, onMotivoChange, onClose, onConfirm, loading }: PausarOSModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pausar OS ${numero ?? ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} loading={loading} disabled={!motivo.trim()}>
            Confirmar pausa
          </Button>
        </>
      }
    >
      <Textarea
        label="Motivo da pausa"
        required
        placeholder="Ex.: aguardando peça, aguardando cliente..."
        value={motivo}
        onChange={(e) => onMotivoChange(e.target.value)}
      />
    </Modal>
  );
}
