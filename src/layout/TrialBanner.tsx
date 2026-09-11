import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useLicencaAtual } from '@/hooks/useOficina';

export function TrialBanner() {
  const { data: licenca } = useLicencaAtual();

  if (!licenca || licenca.status !== 'TRIAL') return null;

  const dias = licenca.diasRestantes ?? 0;
  const urgente = dias <= 2;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium sm:text-sm ${
        urgente ? 'bg-red-50 text-danger' : 'bg-amber-50 text-warning'
      }`}
    >
      <AlertTriangle size={15} />
      {dias > 0
        ? `Seu período de teste termina em ${dias} dia${dias === 1 ? '' : 's'}.`
        : 'Seu período de teste terminou.'}
      <Link to="/oficina/licenca" className="underline underline-offset-2">
        Ver planos
      </Link>
    </div>
  );
}
