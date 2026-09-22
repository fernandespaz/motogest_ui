import type { LicencaResponse } from '@/api/types';

// Planos pagos em cartão avulso (sem assinatura recorrente — sem
// `proximaCobranca`) não renovam sozinhos, mas também não deixam de ser
// válidos assim que o pagamento é concluído: uma licença ATIVA recém-paga
// (ex.: 30 dias frescos) não precisa de nenhum aviso até chegar perto do fim
// do período. Usado tanto pelo banner de topo (TrialBanner) quanto pela
// tela de Licença e plano — um só lugar para essa regra, para as duas telas
// nunca discordarem sobre quando "precisa renovar" é verdade.
export const PRAZO_AVISO_RENOVACAO_LICENCA_DIAS = 5;

export function precisaRenovarLicencaManualmente(
  licenca: Pick<LicencaResponse, 'status' | 'proximaCobranca' | 'diasRestantes'> | undefined,
): boolean {
  if (!licenca) return false;
  return (
    licenca.status === 'ATIVA' &&
    !licenca.proximaCobranca &&
    (licenca.diasRestantes ?? 0) <= PRAZO_AVISO_RENOVACAO_LICENCA_DIAS
  );
}
