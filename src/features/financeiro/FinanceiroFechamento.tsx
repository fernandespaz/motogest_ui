import { useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Lock, LockOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Checkbox, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { useFecharPeriodo, useFechamentos, useReabrirFechamento, useSituacaoFechamento } from '@/hooks/useFinanceiro';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import type { FechamentoFinanceiroResponse } from '@/api/types';

const MOTIVO_MINIMO = 5;

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

function quando(dias: number) {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

/**
 * Fechamento do período financeiro ("data muro"): mostra o que falta resolver antes de fechar, fecha o período e
 * guarda o histórico — reabrir só vale para o último fechamento e pede um motivo. Depois de fechado, o backend
 * trava as contas com vencimento até a data muro; aqui a tela só explica e leva o usuário ao ajuste.
 */
export function FinanceiroFechamento() {
  const podeFechar = useAuthStore((s) => s.hasPermission('FINANCEIRO_FECHAR'));
  const situacao = useSituacaoFechamento();
  const historico = useFechamentos();
  const [fechando, setFechando] = useState(false);
  const [reabrindo, setReabrindo] = useState<FechamentoFinanceiroResponse | null>(null);

  if (situacao.isLoading || historico.isLoading) return <PageSpinner label="Carregando fechamento..." />;
  const dados = situacao.data;
  const proximo = dados?.proximo;
  if (!dados || !proximo) {
    return <p className="text-sm text-ink-muted">Não foi possível carregar a situação do fechamento.</p>;
  }

  if (historico.isError) return <p className="text-sm text-ink-muted">Não foi possível carregar o histórico de fechamentos.</p>;
  // a API devolve do mais recente para o mais antigo
  const fechamentos = historico.data ?? [];
  const ultimoVigente = fechamentos.find((f) => f.status === 'FECHADO');
  const pendentes = proximo.contasPendentes ?? 0;
  const semCategoria = proximo.contasSemCategoria ?? 0;
  const resultado = proximo.resultado ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <Card className={clsx(dados.dataMuro && 'border-brand-300')}>
        <CardBody className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {dados.dataMuro ? <Lock size={22} aria-hidden="true" /> : <LockOpen size={22} aria-hidden="true" />}
          </div>
          <div>
            {dados.dataMuro ? (
              <>
                <p className="text-lg font-semibold text-ink">Financeiro fechado até {formatDate(dados.dataMuro)}</p>
                <p className="text-sm text-ink-muted">
                  Contas com vencimento até essa data não podem ser criadas, editadas nem canceladas, e nenhuma baixa pode ter data dentro dela.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-ink">Nenhum período fechado ainda</p>
                <p className="text-sm text-ink-muted">Ao fechar um período, as contas dele ficam protegidas contra alterações.</p>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Próximo fechamento"
          subtitle={`Período de ${formatDate(proximo.inicio)} a ${formatDate(proximo.fim)} · dia de fechamento ${dados.diaFechamento}`}
          action={
            proximo.podeFechar ? (
              <Badge tone="success">Pronto para fechar</Badge>
            ) : (
              <Badge tone="neutral">Fecha {quando(proximo.diasParaFechar ?? 0)}</Badge>
            )
          }
        />
        <CardBody className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            <ItemChecklist
              ok={pendentes === 0}
              textoOk="Nenhuma conta em aberto no período"
              textoAlerta={`${plural(pendentes, 'conta em aberto', 'contas em aberto')} (${formatCurrency(proximo.valorPendente)}) — depois de fechar, só poderão ser pagas ou recebidas`}
            />
            <ItemChecklist
              ok={semCategoria === 0}
              textoOk="Todas as contas do período têm categoria"
              textoAlerta={`${plural(semCategoria, 'conta sem categoria', 'contas sem categoria')} — classifique para o relatório de gastos ficar completo`}
            />
          </ul>

          <dl className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <Total rotulo="Receitas" valor={proximo.totalReceitas} />
            <Total rotulo="Despesas" valor={proximo.totalDespesas} />
            <Total rotulo="Resultado" valor={resultado} tom={resultado < 0 ? 'danger' : 'success'} />
          </dl>

          {podeFechar && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {!proximo.podeFechar && (
                <span className="text-sm text-ink-muted">Só dá para fechar a partir de {formatDate(proximo.fim)}.</span>
              )}
              <Button disabled={!proximo.podeFechar} onClick={() => setFechando(true)}>
                Fechar período
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Histórico de fechamentos" subtitle="O último fechamento pode ser reaberto, com um motivo" />
        {fechamentos.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-ink-muted">Nenhum fechamento registrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {fechamentos.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {formatDate(f.periodoInicio)} a {formatDate(f.periodoFim)}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Fechado por {f.fechadoPorNome ?? '—'} em {formatDateTime(f.fechadoEm)}
                    {f.contasPendentes ? ` · ${plural(f.contasPendentes, 'conta em aberto', 'contas em aberto')}` : ''}
                  </p>
                  {f.status === 'REABERTO' && (
                    <p className="text-xs text-ink-muted">
                      Reaberto por {f.reabertoPorNome ?? '—'} em {formatDateTime(f.reabertoEm)}: “{f.motivoReabertura}”
                    </p>
                  )}
                </div>
                <span className={clsx('text-sm font-semibold', (f.resultado ?? 0) < 0 ? 'text-danger' : 'text-success')}>
                  {formatCurrency(f.resultado)}
                </span>
                <Badge tone={f.status === 'FECHADO' ? 'brand' : 'neutral'}>{f.status === 'FECHADO' ? 'Fechado' : 'Reaberto'}</Badge>
                {podeFechar && f.id === ultimoVigente?.id && (
                  <Button size="sm" variant="secondary" onClick={() => setReabrindo(f)}>
                    Reabrir
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <FecharModal open={fechando} pendentes={pendentes} periodo={proximo} onClose={() => setFechando(false)} />
      <ReabrirModal fechamento={reabrindo} onClose={() => setReabrindo(null)} />
    </div>
  );
}

function ItemChecklist({ ok, textoOk, textoAlerta }: { ok: boolean; textoOk: string; textoAlerta: string }) {
  const Icon: LucideIcon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon size={18} className={clsx('mt-0.5 shrink-0', ok ? 'text-success' : 'text-warning')} aria-hidden="true" />
      <span className="text-ink">{ok ? textoOk : textoAlerta}</span>
    </li>
  );
}

function Total({ rotulo, valor, tom }: { rotulo: string; valor?: number; tom?: 'danger' | 'success' }) {
  return (
    <div>
      <dt className="text-sm text-ink-muted">{rotulo}</dt>
      <dd className={clsx('text-xl font-bold', tom === 'danger' ? 'text-danger' : tom === 'success' ? 'text-success' : 'text-ink')}>
        {formatCurrency(valor)}
      </dd>
    </div>
  );
}

function FecharModal({
  open,
  pendentes,
  periodo,
  onClose,
}: {
  open: boolean;
  pendentes: number;
  periodo: { inicio?: string; fim?: string };
  onClose: () => void;
}) {
  const fechar = useFecharPeriodo();
  const [observacao, setObservacao] = useState('');
  const [ciente, setCiente] = useState(false);

  function fecharModal() {
    setObservacao('');
    setCiente(false);
    onClose();
  }

  async function confirmar() {
    try {
      await fechar.mutateAsync({ confirmarPendencias: pendentes > 0 && ciente, observacao: observacao.trim() || undefined });
      toast.success('Período fechado.');
      fecharModal();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível fechar o período.'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={fecharModal}
      title="Fechar período"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={fecharModal} disabled={fechar.isPending}>
            Cancelar
          </Button>
          <Button onClick={confirmar} loading={fechar.isPending} disabled={pendentes > 0 && !ciente}>
            Fechar período
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink">
          Você vai fechar de <strong>{formatDate(periodo.inicio)}</strong> a <strong>{formatDate(periodo.fim)}</strong>. Depois disso, contas com
          vencimento nesse período não poderão ser criadas, editadas nem canceladas.
        </p>
        {pendentes > 0 && (
          <Checkbox
            checked={ciente}
            onChange={(e) => setCiente(e.target.checked)}
            label={`Estou ciente: ${plural(pendentes, 'conta continua em aberto', 'contas continuam em aberto')} neste período`}
          />
        )}
        <Textarea label="Observação (opcional)" maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>
    </Modal>
  );
}

function ReabrirModal({ fechamento, onClose }: { fechamento: FechamentoFinanceiroResponse | null; onClose: () => void }) {
  const reabrir = useReabrirFechamento();
  const [motivo, setMotivo] = useState('');
  const valido = motivo.trim().length >= MOTIVO_MINIMO;

  function fecharModal() {
    setMotivo('');
    onClose();
  }

  async function confirmar() {
    if (fechamento?.id == null || !valido) return;
    try {
      await reabrir.mutateAsync({ id: fechamento.id, payload: { motivo: motivo.trim() } });
      toast.success('Fechamento reaberto.');
      fecharModal();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível reabrir o fechamento.'));
    }
  }

  return (
    <Modal
      open={!!fechamento}
      onClose={fecharModal}
      title="Reabrir fechamento"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={fecharModal} disabled={reabrir.isPending}>
            Cancelar
          </Button>
          <Button onClick={confirmar} loading={reabrir.isPending} disabled={!valido}>
            Reabrir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink">
          O período de <strong>{formatDate(fechamento?.periodoInicio)}</strong> a <strong>{formatDate(fechamento?.periodoFim)}</strong> volta a
          aceitar alterações. O motivo fica registrado no histórico.
        </p>
        <Textarea label="Motivo" required maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </div>
    </Modal>
  );
}
