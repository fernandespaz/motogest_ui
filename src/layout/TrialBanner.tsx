import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { useLicencaAtual } from '@/hooks/useOficina';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/formatters';
import { precisaRenovarLicencaManualmente } from '@/lib/licenca';

// Dias restantes a partir dos quais o aviso deixa de ser discreto e vira o
// laranja sólido da marca — antes disso ele só informa, sem competir com a tela.
const DIAS_URGENTE = 2;

function Faixa({ urgente, children }: { urgente: boolean; children: ReactNode }) {
  const Icone = urgente ? AlertTriangle : Clock3;
  return (
    <div
      role="status"
      className={clsx(
        'flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-1.5 text-center text-xs font-medium sm:text-sm',
        urgente
          ? 'bg-brand-600 text-white'
          : 'border-b border-brand-600/30 bg-brand-600/10 text-ink',
      )}
    >
      <Icone size={15} className={urgente ? undefined : 'text-brand-600'} />
      {children}
    </div>
  );
}

function linkClasses(urgente: boolean) {
  return urgente
    ? 'font-semibold underline underline-offset-2'
    : 'rounded-md bg-brand-600 px-2.5 py-0.5 font-semibold text-white transition-colors hover:bg-brand-700';
}

export function TrialBanner() {
  const { data: licenca } = useLicencaAtual();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (!licenca) return null;

  // Carência: acesso segue normal, mas o pagamento está pendente. Só quem
  // tem OFICINA_WRITE consegue pagar, então os demais veem só o aviso.
  if (licenca.emCarencia) {
    return (
      <Faixa urgente>
        Pagamento pendente, regularize até {formatDate(licenca.dataExpiracao)}
        {hasPermission('OFICINA_WRITE') && (
          <Link to="/oficina/licenca" className={linkClasses(true)}>
            Regularizar agora
          </Link>
        )}
      </Faixa>
    );
  }

  const dias = licenca.diasRestantes ?? 0;
  const isTrial = licenca.status === 'TRIAL';
  const precisaRenovarManualmente = precisaRenovarLicencaManualmente(licenca);

  if (!isTrial && !precisaRenovarManualmente) return null;

  // Um plano pago em ATIVA nunca "venceu" enquanto o status continuar ATIVA
  // — dizer isso contradiz o próprio badge "Ativa" mostrado na tela de
  // Licença e plano, e aconteceu de aparecer literalmente no dia em que o
  // plano tinha acabado de ser ativado (diasRestantes chegando a 0 no
  // último dia do período, sem que o plano tenha de fato expirado).
  const mensagem = isTrial
    ? dias > 0
      ? `Seu período de teste termina em ${dias} dia${dias === 1 ? '' : 's'}.`
      : 'Seu período de teste terminou.'
    : dias > 0
      ? `Seu plano vence em ${dias} dia${dias === 1 ? '' : 's'} e não renova automaticamente.`
      : 'Seu plano vence hoje e não renova automaticamente.';

  const urgente = dias <= DIAS_URGENTE;

  return (
    <Faixa urgente={urgente}>
      {mensagem}
      <Link to="/oficina/licenca" className={linkClasses(urgente)}>
        {isTrial ? 'Ver planos' : 'Renovar agora'}
      </Link>
    </Faixa>
  );
}
