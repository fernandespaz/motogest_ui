import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Checkbox, Select } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { usePagarComissoes } from '@/hooks/useComissoes';
import { extractErrorMessage } from '@/api/client';
import type { ComissoesDoFuncionario } from '@/lib/comissoesAgrupadas';
import { FORMAS_PAGAMENTO } from '@/lib/formaPagamento';
import { formatCurrency, formatDate, formatPercent, getInitials } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import type { ComissaoResponse, FormaPagamento } from '@/api/types';

type Situacao = 'TODAS' | 'A_PAGAR' | 'PAGAS';

const SITUACOES = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'A_PAGAR', label: 'A pagar' },
  { value: 'PAGAS', label: 'Pagas' },
] as const;

const PAPEL_LABEL = { MECANICO: 'Mecânico', CONSULTOR: 'Consultor' } as const;
// O gatilho de cada papel explica a data mostrada: o mecânico ganha ao concluir a OS, o consultor ao faturá-la.
const GATILHO_LABEL = { MECANICO: 'Concluída', CONSULTOR: 'Faturada' } as const;

function filtrar(comissoes: ComissaoResponse[], situacao: Situacao) {
  if (situacao === 'A_PAGAR') return comissoes.filter((c) => c.status === 'PENDENTE');
  if (situacao === 'PAGAS') return comissoes.filter((c) => c.status === 'PAGA');
  return comissoes;
}

/**
 * Um funcionário no período: o cabeçalho resume o que ele tem a receber e, ao abrir, a lista mostra cada OS que
 * gerou comissão (com o cálculo) — é daí que o financeiro seleciona o que vai pagar.
 */
export function ComissoesFuncionario({
  grupo,
  podePagar,
  podeAbrirOs,
}: {
  grupo: ComissoesDoFuncionario;
  podePagar: boolean;
  podeAbrirOs: boolean;
}) {
  const pagar = usePagarComissoes();
  const [aberto, setAberto] = useState(false);
  const [situacao, setSituacao] = useState<Situacao>('TODAS');
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [confirmando, setConfirmando] = useState(false);

  const painelId = `comissoes-${grupo.usuarioId}`;
  const aPagar = grupo.comissoes.filter((c) => c.status === 'PENDENTE');
  const escolhidas = aPagar.filter((c) => selecionadas.includes(c.id));
  const totalEscolhido = escolhidas.reduce((soma, c) => soma + c.valor, 0);
  const todasEscolhidas = aPagar.length > 0 && escolhidas.length === aPagar.length;
  const alternar = (id: number) => setSelecionadas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  async function confirmar() {
    try {
      const r = await pagar.mutateAsync({ comissaoIds: escolhidas.map((c) => c.id), formaPagamento: forma });
      toast.success(`${formatCurrency(r.valorTotal)} pagos a ${r.usuarioNome}.`);
      setSelecionadas([]);
      setConfirmando(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível pagar as comissões.'));
    }
  }

  const colunas: Column<ComissaoResponse>[] = [
    ...(podePagar
      ? [
          {
            header: '',
            className: 'w-8',
            render: (c: ComissaoResponse) =>
              c.status === 'PENDENTE' ? (
                <Checkbox checked={selecionadas.includes(c.id)} onChange={() => alternar(c.id)} aria-label={`Selecionar OS ${c.ordemServicoNumero}`} />
              ) : null,
          },
        ]
      : []),
    {
      header: 'OS',
      render: (c) =>
        podeAbrirOs ? (
          <Link to={`/ordens-servico/${c.ordemServicoId}`} className="whitespace-nowrap font-semibold text-brand-700 hover:underline dark:text-brand-300">
            {c.ordemServicoNumero}
          </Link>
        ) : (
          <span className="whitespace-nowrap font-semibold text-ink">{c.ordemServicoNumero}</span>
        ),
    },
    {
      header: 'Como ganhou',
      render: (c) => (
        <div>
          <p className="text-ink">{PAPEL_LABEL[c.papel]}</p>
          <p className="text-xs text-ink-muted">
            {GATILHO_LABEL[c.papel]} em {formatDate(c.dataGeracao)}
          </p>
        </div>
      ),
    },
    {
      header: 'Cálculo',
      render: (c) => (
        <span className="whitespace-nowrap text-ink-muted">
          {formatCurrency(c.baseCalculo)} × {formatPercent(c.percentual)}
        </span>
      ),
      hideBelow: 'md',
    },
    { header: 'Comissão', className: 'text-right', render: (c) => <span className="font-semibold text-ink">{formatCurrency(c.valor)}</span> },
    {
      header: 'Situação',
      render: (c) =>
        c.status === 'PAGA' ? <Badge tone="success">Paga em {formatDate(c.dataPagamento)}</Badge> : <Badge tone="warning">A pagar</Badge>,
      hideBelow: 'sm',
    },
  ];

  return (
    <Card>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" aria-hidden="true">
          {getInitials(grupo.usuarioNome)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{grupo.usuarioNome}</span>
          <span className="block text-xs text-ink-muted">
            {grupo.quantidadeOs} OS no período · {aberto ? 'clique para recolher' : 'clique para ver as OS'}
          </span>
        </span>
        <span className="text-right">
          {grupo.totalAPagar > 0 ? (
            <>
              <span className="block text-xs text-ink-muted">A pagar</span>
              <span className="block text-lg font-bold text-ink">{formatCurrency(grupo.totalAPagar)}</span>
            </>
          ) : (
            <Badge tone="success">Tudo pago · {formatCurrency(grupo.totalPago)}</Badge>
          )}
          {grupo.totalAPagar > 0 && grupo.totalPago > 0 && <span className="block text-xs text-ink-muted">Já pago {formatCurrency(grupo.totalPago)}</span>}
        </span>
        <ChevronDown size={18} className={clsx('shrink-0 text-ink-muted transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
      </button>

      {aberto && (
        <div id={painelId} className="flex flex-col gap-3 border-t border-border px-4 py-4">
          <SegmentedControl label="Mostrar" value={situacao} onChange={setSituacao} options={[...SITUACOES]} />
          <DataTable
            columns={colunas}
            rows={filtrar(grupo.comissoes, situacao)}
            rowKey={(c) => c.id}
            emptyTitle={situacao === 'A_PAGAR' ? 'Nada a pagar neste período' : 'Nenhuma comissão nesta visão'}
          />
          {podePagar && aPagar.length > 0 && (
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
              <Checkbox
                checked={todasEscolhidas}
                onChange={() => setSelecionadas(todasEscolhidas ? [] : aPagar.map((c) => c.id))}
                label={`Selecionar tudo que está a pagar (${aPagar.length})`}
              />
              <div className="flex flex-wrap items-end gap-3">
                <Select label="Forma de pagamento" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
                <Button onClick={() => setConfirmando(true)} disabled={escolhidas.length === 0}>
                  Pagar selecionadas ({formatCurrency(totalEscolhido)})
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmando}
        title={`Pagar ${formatCurrency(totalEscolhido)} a ${grupo.usuarioNome}?`}
        description={`${escolhidas.length} comissão(ões) serão marcadas como pagas e uma conta a pagar já baixada será criada na categoria Comissões.`}
        confirmLabel="Confirmar pagamento"
        loading={pagar.isPending}
        onConfirm={confirmar}
        onCancel={() => setConfirmando(false)}
      />
    </Card>
  );
}
