import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useLicencaAtual } from '@/hooks/useOficina';

/**
 * Replaces the generic "sem permissão" toast a trial account used to see the
 * first time it hit a 403 after expiring — this shows proactively, from the
 * licença status itself, as soon as the trial is over and before the user
 * stumbles into a blocked action.
 */
export function TrialExpiredDialog() {
  const { data: licenca } = useLicencaAtual();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  const expirou =
    !!licenca && (licenca.status === 'EXPIRADA' || (licenca.status === 'TRIAL' && (licenca.diasRestantes ?? 0) <= 0));

  function irParaPlanos() {
    setDismissed(true);
    navigate('/oficina/licenca');
  }

  return (
    <Modal open={expirou && !dismissed} onClose={() => setDismissed(true)} size="sm">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-base font-semibold text-ink">Seu período de teste terminou</h2>
        <p className="text-sm text-ink-muted">
          Escolha um plano para continuar usando o MotoGest sem interrupções.
        </p>
        <Button className="mt-1 w-full" onClick={irParaPlanos}>
          Escolher plano
        </Button>
      </div>
    </Modal>
  );
}
