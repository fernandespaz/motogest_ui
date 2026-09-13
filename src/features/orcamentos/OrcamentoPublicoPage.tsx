import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, FileWarning, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useAprovarOrcamentoPublico, useOrcamentoPublico, useRejeitarOrcamentoPublico } from '@/hooks/useOrcamentoPublico';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { orcamentoStatusMeta, metaFor } from '@/lib/statusMeta';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';

export function OrcamentoPublicoPage() {
  const { token = '' } = useParams();
  const { data: orcamento, isLoading, isError } = useOrcamentoPublico(token);
  const aprovar = useAprovarOrcamentoPublico(token);
  const rejeitar = useRejeitarOrcamentoPublico(token);

  async function handleAprovar() {
    try {
      await aprovar.mutateAsync();
      toast.success('Orçamento aprovado!');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível aprovar o orçamento.'));
    }
  }

  async function handleRejeitar() {
    try {
      await rejeitar.mutateAsync();
      toast.info('Orçamento rejeitado.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível rejeitar o orçamento.'));
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite">
        <PageSpinner label="Carregando orçamento..." />
      </div>
    );
  }

  if (isError || !orcamento) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
          <FileWarning className="mx-auto mb-3 text-ink-muted" size={40} />
          <h1 className="text-lg font-semibold text-ink">Orçamento não encontrado</h1>
          <p className="mt-2 text-sm text-ink-muted">Este link pode estar incorreto ou ter expirado.</p>
        </div>
      </div>
    );
  }

  const meta = metaFor(orcamentoStatusMeta, orcamento.status);
  const podeResponder = orcamento.status === 'ENVIADO';
  const acting = aprovar.isPending || rejeitar.isPending;
  const nomeOficina = orcamento.oficinaNomeFantasia || 'Oficina';
  const inicial = nomeOficina.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-graphite">
      {/*
        Sem a logo real da oficina aqui — a rota pública (sem login) não tem
        como buscá-la hoje: nem o schema OrcamentoPublicoResponse nem alguma
        rota pública expõem a imagem, e /oficinas/atual/logo exige token de
        staff (ver useOficina.ts). Até isso mudar no backend, um monograma com
        a inicial do nome fantasia já dá alguma identidade visual da oficina.
      */}
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
            <Wrench size={12} /> Orçamento de serviço
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
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Orçamento #{orcamento.id}</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-ink">{formatCurrency(orcamento.valorTotal)}</p>
            </div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-alt p-4 text-sm">
            <div>
              <p className="text-xs text-ink-muted">Cliente</p>
              <p className="font-medium text-ink">{orcamento.clienteNome ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Veículo</p>
              <p className="font-medium text-ink">{orcamento.veiculoPlaca ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Emitido em</p>
              <p className="font-medium text-ink">{formatDate(orcamento.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Validade</p>
              <p className="font-medium text-ink">{orcamento.validadeDias ? `${orcamento.validadeDias} dias` : '—'}</p>
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Itens</p>
          <div className="mb-4 divide-y divide-border rounded-lg border border-border">
            {(orcamento.itens ?? []).map((item, idx) => (
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

          {orcamento.observacoes && (
            <div className="mb-4 rounded-lg bg-surface-alt p-3 text-sm text-ink-muted">{orcamento.observacoes}</div>
          )}

          <div className="mb-6 flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm font-semibold text-ink">Total</p>
            <p className="text-lg font-bold tabular-nums text-brand-700">{formatCurrency(orcamento.valorTotal)}</p>
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
              {orcamento.status === 'APROVADO' && 'Você já aprovou este orçamento.'}
              {orcamento.status === 'REJEITADO' && 'Você já rejeitou este orçamento.'}
              {orcamento.status === 'EXPIRADO' && 'Este orçamento expirou.'}
              {orcamento.status === 'CONVERTIDO' && 'Este orçamento já virou uma Ordem de Serviço.'}
              {orcamento.status === 'RASCUNHO' && 'Este orçamento ainda não foi enviado para aprovação.'}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">Gerado por {nomeOficina} via MotoGest</p>
      </motion.div>
    </div>
  );
}
