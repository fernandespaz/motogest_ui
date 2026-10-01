import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useLicencaAtual } from '@/hooks/useOficina';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/formatters';
import { precisaRenovarLicencaManualmente } from '@/lib/licenca';

export function TrialBanner() {
  const { data: licenca } = useLicencaAtual();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (!licenca) return null;

  // Carência: acesso segue normal, mas o pagamento está pendente. Só quem
  // tem OFICINA_WRITE consegue pagar, então os demais veem só o aviso.
  if (licenca.emCarencia) {
    return (
      <div className="flex items-center justify-center gap-2 bg-brand-600 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
        <AlertTriangle size={15} />
        Pagamento pendente, regularize até {formatDate(licenca.dataExpiracao)}
        {hasPermission('OFICINA_WRITE') && (
          <Link to="/oficina/licenca" className="font-semibold underline underline-offset-2">
            Regularizar agora
          </Link>
        )}
      </div>
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

  return (
    // Laranja sólido igual ao dos botões do projeto (Button.tsx: bg-brand-600) —
    // cor saturada única, sem precisar de variante dark: separada, fica igual
    // nos dois temas.
    <div className="flex items-center justify-center gap-2 bg-brand-600 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <AlertTriangle size={15} />
      {mensagem}
      <Link to="/oficina/licenca" className="font-semibold underline underline-offset-2">
        {isTrial ? 'Ver planos' : 'Renovar agora'}
      </Link>
    </div>
  );
}
