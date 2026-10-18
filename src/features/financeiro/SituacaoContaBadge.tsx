import { Badge } from '@/components/ui/Badge';
import type { SituacaoConta } from './contasUtils';

type Tipo = 'pagar' | 'receber';

const tons: Record<SituacaoConta, 'danger' | 'warning' | 'brand' | 'success' | 'neutral'> = {
  vencida: 'danger',
  'vence-hoje': 'warning',
  'a-vencer': 'brand',
  quitada: 'success',
  cancelada: 'neutral',
};

export function rotuloSituacao(situacao: SituacaoConta, tipo: Tipo): string {
  switch (situacao) {
    case 'vencida':
      return 'Vencida';
    case 'vence-hoje':
      return 'Vence hoje';
    case 'a-vencer':
      return 'A vencer';
    case 'quitada':
      return tipo === 'pagar' ? 'Paga' : 'Recebida';
    case 'cancelada':
      return 'Cancelada';
  }
}

export function SituacaoContaBadge({ situacao, tipo }: { situacao: SituacaoConta; tipo: Tipo }) {
  return <Badge tone={tons[situacao]}>{rotuloSituacao(situacao, tipo)}</Badge>;
}
