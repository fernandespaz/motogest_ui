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
import { precisaRenovarLicencaManualmente } from '@/lib/licenca';
import { PagamentoCartaoModal } from './PagamentoCartaoModal';

export function LicencaTab() {
  const { data: licenca, isLoading } = useLicencaAtual();
  const [showPagamento, setShowPagamento] = useState(false);

  if (isLoading || !licenca) return <PageSpinner />;

  const meta = metaFor(licencaStatusMeta, licenca.status);
  const diasRestantes = licenca.diasRestantes ?? 0;
  // Uma licença ATIVA recém-paga (pedido avulso, sem assinatura) não precisa
  // de nenhum aviso até chegar perto do fim do período — mostrar "Renove seu
  // plano" logo depois de um pagamento bem-sucedido é a mensagem errada no
  // momento errado. Só TRIAL/EXPIRADA/CANCELADA precisam de ação sempre;
  // ATIVA só quando estiver mesmo perto de vencer (mesmo critério do
  // TrialBanner, para as duas telas nunca discordarem).
  const precisaAgirAgora = licenca.status !== 'ATIVA' || precisaRenovarLicencaManualmente(licenca);

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
              <p className={`text-sm font-medium ${diasRestantes <= 2 ? 'text-danger' : 'text-ink'}`}>{diasRestantes}</p>
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

      {/* Mostra a ação de pagamento quando a licença realmente precisa dela
          agora: sempre para TRIAL/EXPIRADA/CANCELADA, e para ATIVA só perto
          do fim do período pago avulso (ver precisaAgirAgora acima) — nunca
          logo depois de um pagamento bem-sucedido, com dias de sobra. */}
      {precisaAgirAgora && (
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
