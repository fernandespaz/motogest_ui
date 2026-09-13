import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, FileWarning, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import {
  useAprovarOrdemServicoPublico,
  useOrdemServicoPublico,
  useRejeitarOrdemServicoPublico,
} from '@/hooks/useOrdemServicoPublico';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ordemServicoStatusMeta, metaFor } from '@/lib/statusMeta';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

/**
 * Espelha OrcamentoPublicoPage.tsx (mesmo motivo de não ter a logo real: a
 * rota pública não a expõe — ver comentário lá) — o cliente aprova aqui antes
 * do técnico poder iniciar o cronômetro da OS.
 */
export function OrdemServicoPublicoPage() {
  const { token = '' } = useParams();
  const { data: os, isLoading, isError } = useOrdemServicoPublico(token);
  const aprovar = useAprovarOrdemServicoPublico(token);
  const rejeitar = useRejeitarOrdemServicoPublico(token);

  async function handleAprovar() {
    try {
      await aprovar.mutateAsync();
      toast.success('Ordem de Serviço aprovada!');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível aprovar a Ordem de Serviço.'));
    }
  }

  async function handleRejeitar() {
    try {
      await rejeitar.mutateAsync();
      toast.info('Ordem de Serviço rejeitada.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível rejeitar a Ordem de Serviço.'));
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite">
        <PageSpinner label="Carregando ordem de serviço..." />
      </div>
    );
  }

  if (isError || !os) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
          <FileWarning className="mx-auto mb-3 text-ink-muted" size={40} />
          <h1 className="text-lg font-semibold text-ink">Ordem de Serviço não encontrada</h1>
          <p className="mt-2 text-sm text-ink-muted">Este link pode estar incorreto ou ter expirado.</p>
        </div>
      </div>
    );
  }

  const meta = metaFor(ordemServicoStatusMeta, os.status);
  const podeResponder = os.status === 'AGUARDANDO_APROVACAO';
  const acting = aprovar.isPending || rejeitar.isPending;
  const nomeOficina = os.oficinaNomeFantasia || 'Oficina';
  const inicial = nomeOficina.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-graphite">
      <div className="bg-graphite px-4 pb-16 pt-10 text-center text-white sm:pb-20 sm:pt-14">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mx-auto flex max-w-lg flex-col items-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 font-display text-2xl font-bold shadow-[0_12px_30px_-8px_rgba(255,90,31,0.6)]">
            {inicial}
          </div>
          <p className="mt-4 font-display text-xl font-bold tracking-tight">{nomeOficina}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            <Wrench size={12} /> Ordem de serviço
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        className="mx-auto -mt-10 w-full max-w-lg px-4 pb-10 sm:-mt-12"
      >
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">OS {os.numero ?? `#${os.id}`}</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-ink">{formatCurrency(os.valorTotal)}</p>
            </div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-alt p-4 text-sm">
            <div>
              <p className="text-xs text-ink-muted">Cliente</p>
              <p className="font-medium text-ink">{os.clienteNome ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Veículo</p>
              <p className="font-medium text-ink">{os.veiculoPlaca ?? '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-ink-muted">Aberta em</p>
              <p className="font-medium text-ink">{formatDate(os.dataAbertura)}</p>
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Itens</p>
          <div className="mb-4 divide-y divide-border rounded-lg border border-border">
            {(os.itens ?? []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <p className="text-ink">{item.descricao}</p>
                  <p className="text-xs tabular-nums text-ink-muted">
                    {item.quantidade} × {formatCurrency(item.valorUnitario)}
                  </p>
                </div>
                <p className="font-medium tabular-nums text-ink">
                  {formatCurrency((item.quantidade ?? 0) * (item.valorUnitario ?? 0))}
                </p>
              </div>
            ))}
          </div>

          {os.observacoes && <div className="mb-4 rounded-lg bg-surface-alt p-3 text-sm text-ink-muted">{os.observacoes}</div>}

          <div className="mb-6 flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm font-semibold text-ink">Total</p>
            <p className="text-lg font-bold tabular-nums text-brand-700">{formatCurrency(os.valorTotal)}</p>
          </div>

          {podeResponder ? (
            <div className="flex gap-3">
              <Button variant="danger" fullWidth onClick={handleRejeitar} loading={rejeitar.isPending} disabled={acting}>
                <XCircle size={18} /> Rejeitar
              </Button>
              <Button fullWidth onClick={handleAprovar} loading={aprovar.isPending} disabled={acting}>
                <CheckCircle2 size={18} /> Aprovar
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-ink-muted">
              {os.status === 'APROVADA' && 'Você já aprovou esta ordem de serviço.'}
              {os.status === 'CANCELADA' && 'Esta ordem de serviço foi cancelada.'}
              {os.status === 'ABERTA' && 'Esta ordem de serviço ainda não foi enviada para aprovação.'}
              {!['APROVADA', 'CANCELADA', 'ABERTA'].includes(os.status ?? '') &&
                'Esta ordem de serviço já está em andamento.'}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">Gerado por {nomeOficina} via MotoGest</p>
      </motion.div>
    </div>
  );
}
