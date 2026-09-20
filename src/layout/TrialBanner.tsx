import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useLicencaAtual } from '@/hooks/useOficina';

// Planos pagos em cartão avulso (sem assinatura recorrente — sem
// `proximaCobranca`) não renovam sozinhos: sem este aviso, o acesso cai sem
// nenhum sinal prévio quando o período pago acaba. Reaproveita o mesmo banner
// do trial em vez de um componente novo, já que a mensagem/ação é idêntica.
const PRAZO_AVISO_RENOVACAO_DIAS = 5;

export function TrialBanner() {
  const { data: licenca } = useLicencaAtual();

  if (!licenca) return null;

  const dias = licenca.diasRestantes ?? 0;
  const isTrial = licenca.status === 'TRIAL';
  const precisaRenovarManualmente =
    licenca.status === 'ATIVA' && !licenca.proximaCobranca && dias <= PRAZO_AVISO_RENOVACAO_DIAS;

  if (!isTrial && !precisaRenovarManualmente) return null;

  const urgente = dias <= 2;
  const mensagem = isTrial
    ? dias > 0
      ? `Seu período de teste termina em ${dias} dia${dias === 1 ? '' : 's'}.`
      : 'Seu período de teste terminou.'
    : dias > 0
      ? `Seu plano vence em ${dias} dia${dias === 1 ? '' : 's'} e não renova automaticamente.`
      : 'Seu plano venceu e não renova automaticamente.';

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium sm:text-sm ${
        urgente ? 'bg-red-50 text-danger' : 'bg-brand-600 text-white'
      }`}
    >
      <AlertTriangle size={15} />
      {mensagem}
      <Link to="/oficina/licenca" className="font-semibold underline underline-offset-2">
        {isTrial ? 'Ver planos' : 'Renovar agora'}
      </Link>
    </div>
  );
}
