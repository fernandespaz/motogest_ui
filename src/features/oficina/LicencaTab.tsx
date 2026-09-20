import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useLicencaAtual } from '@/hooks/useOficina';
import { licencaStatusMeta, metaFor } from '@/lib/statusMeta';
import { formatDate } from '@/lib/formatters';
import { PagamentoCartaoModal } from './PagamentoCartaoModal';

export function LicencaTab() {
  const { data: licenca, isLoading } = useLicencaAtual();
  const [showPagamento, setShowPagamento] = useState(false);

  if (isLoading || !licenca) return <PageSpinner />;

  const meta = metaFor(licencaStatusMeta, licenca.status);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink">Status da licença</p>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              <p className="text-sm text-ink-muted">Plano atual: {licenca.plano ?? 'Trial gratuito'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink-muted">Ativação</p>
              <p className="text-sm font-medium text-ink">{formatDate(licenca.dataAtivacao)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">{licenca.proximaCobranca ? 'Válida até' : 'Expiração'}</p>
              <p className="text-sm font-medium text-ink">{formatDate(licenca.dataExpiracao)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Dias restantes</p>
              <p className={`text-sm font-medium ${(licenca.diasRestantes ?? 0) <= 2 ? 'text-danger' : 'text-ink'}`}>
                {licenca.diasRestantes ?? 0}
              </p>
            </div>
          </div>

          {licenca.proximaCobranca && (
            <p className="text-xs text-ink-muted">
              Assinatura com renovação automática — próxima cobrança em{' '}
              <span className="font-medium text-ink">{formatDate(licenca.proximaCobranca)}</span>.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Mostra a ação de pagamento sempre que não há assinatura com renovação
          automática em andamento — não só quando a licença está inativa. Uma
          licença ATIVA paga via pedido avulso (sem proximaCobranca) também
          precisa desta ação disponível para renovar antes de vencer; é para
          esse caso que o TrialBanner manda o usuário para cá. */}
      {!licenca.proximaCobranca && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-brand-600" />
                <p className="font-semibold text-ink">
                  {licenca.status === 'ATIVA'
                    ? 'Renove seu plano para não perder o acesso'
                    : 'Faça upgrade para continuar usando sem limites'}
                </p>
              </div>

              <Button className="self-start" onClick={() => setShowPagamento(true)}>
                {licenca.status === 'ATIVA' ? 'Renovar plano' : 'Fazer upgrade'}
              </Button>
            </CardBody>
          </Card>
        </motion.div>
      )}

      <PagamentoCartaoModal open={showPagamento} onClose={() => setShowPagamento(false)} />
    </div>
  );
}
