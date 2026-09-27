import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Lock, ReceiptText, RefreshCw, Unlock, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { useCaixaPeriodo, useCaixaSessaoAberta } from '@/hooks/useFinanceiro';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { caixaSessaoStatusMeta, metaFor } from '@/lib/statusMeta';
import { FORMAS_PAGAMENTO, FORMA_PAGAMENTO_LABEL } from '@/lib/formaPagamento';
import { CaixaTipoLabel, CaixaValorCell } from '@/features/shared/CaixaMovimentoCells';
import type { CaixaMovimentoResponse, CaixaTipo } from '@/api/types';
import { AbrirCaixaModal } from './AbrirCaixaModal';
import { RegistrarMovimentoModal } from './RegistrarMovimentoModal';
import { FecharCaixaModal } from './FecharCaixaModal';
import { FaturarOSModal } from './FaturarOSModal';

export function MeuCaixaPage() {
  const [abrirAberto, setAbrirAberto] = useState(false);
  const [fecharAberto, setFecharAberto] = useState(false);
  const [movimentoTipo, setMovimentoTipo] = useState<CaixaTipo | null>(null);
  const [faturarAberto, setFaturarAberto] = useState(false);
  // Janela da sessão atual, fixada no momento em que a tela monta — o botão
  // "Atualizar" reabre a janela pra agora, em vez de recalcular a cada render
  // (isso mudaria a queryKey a cada digitação/render e disparava um refetch
  // infinito em useCaixaPeriodo).
  const [agora, setAgora] = useState(() => new Date().toISOString());

  const { data: sessao, isLoading, isFetching, refetch } = useCaixaSessaoAberta({ enabled: true });
  const { data: movimentosPeriodo, isLoading: carregandoMovimentos } = useCaixaPeriodo(sessao?.abertoEm ?? '', agora);
  const movimentosDaSessao = (movimentosPeriodo ?? [])
    .filter((m) => m.caixaSessaoId === sessao?.id)
    .sort((a, b) => (b.dataMovimento ?? '').localeCompare(a.dataMovimento ?? ''));

  function atualizar() {
    setAgora(new Date().toISOString());
    refetch();
  }

  if (isLoading) return <PageSpinner label="Verificando caixa..." />;

  return (
    <div>
      <PageHeader
        title="Meu Caixa"
        subtitle={
          sessao ? (
            <span className="flex items-center gap-2">
              Turno: {sessao.turno} · Aberto às {formatDateTime(sessao.abertoEm)}
              <Badge tone={metaFor(caixaSessaoStatusMeta, sessao.status).tone}>
                {metaFor(caixaSessaoStatusMeta, sessao.status).label}
              </Badge>
            </span>
          ) : (
            'Nenhum turno em andamento'
          )
        }
        action={
          sessao ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={atualizar} disabled={isFetching}>
                <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} /> Atualizar
              </Button>
              <Button variant="danger" size="sm" onClick={() => setFecharAberto(true)}>
                <Lock size={16} /> Fechar caixa
              </Button>
            </div>
          ) : undefined
        }
      />

      {!sessao ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Wallet}
              title="Nenhum caixa aberto"
              description="Abra um turno informando o saldo inicial por forma de pagamento para começar a registrar entradas e saídas."
              action={
                <Button onClick={() => setAbrirAberto(true)}>
                  <Unlock size={16} /> Abrir caixa
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Wallet} label="Saldo inicial" value={formatCurrency(sessao.saldoInicial?.total)} index={0} />
            <StatCard
              icon={ArrowUpCircle}
              label="Entradas do turno"
              value={formatCurrency(sessao.totalEntradas?.total)}
              tone="success"
              index={1}
            />
            <StatCard
              icon={ArrowDownCircle}
              label="Saídas do turno"
              value={formatCurrency(sessao.totalSaidas?.total)}
              tone="danger"
              index={2}
            />
            <StatCard
              icon={Wallet}
              label="Saldo atual"
              value={formatCurrency(sessao.saldoAtual?.total)}
              tone={(sessao.saldoAtual?.total ?? 0) < 0 ? 'danger' : 'brand'}
              index={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button size="lg" variant="success" onClick={() => setMovimentoTipo('ENTRADA')}>
              <ArrowUpCircle size={20} /> Nova entrada
            </Button>
            <Button size="lg" variant="danger" onClick={() => setMovimentoTipo('SAIDA')}>
              <ArrowDownCircle size={20} /> Nova saída
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setFaturarAberto(true)}>
              <ReceiptText size={20} /> Faturar OS
            </Button>
          </div>

          <Card>
            <CardHeader title="Saldo atual por forma de pagamento" />
            <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {FORMAS_PAGAMENTO.map(({ chave, label }) => (
                <div key={chave}>
                  <p className="text-xs text-ink-muted">{label}</p>
                  <p className="font-semibold text-ink">{formatCurrency(sessao.saldoAtual?.[chave])}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Lançamentos do turno" />
            <DataTable<CaixaMovimentoResponse>
              loading={carregandoMovimentos}
              rows={movimentosDaSessao}
              rowKey={(row) => row.id!}
              emptyTitle="Nenhum lançamento neste turno ainda"
              columns={[
                { header: 'Tipo', render: (row) => <CaixaTipoLabel tipo={row.tipo} comIcone /> },
                { header: 'Descrição', render: (row) => row.descricao || '—' },
                {
                  header: 'Forma',
                  render: (row) => (row.formaPagamento ? FORMA_PAGAMENTO_LABEL[row.formaPagamento] : '—'),
                  hideBelow: 'sm',
                },
                { header: 'Hora', render: (row) => formatDateTime(row.dataMovimento), hideBelow: 'md' },
                { header: 'Valor', render: (row) => <CaixaValorCell tipo={row.tipo} valor={row.valor} /> },
              ]}
            />
          </Card>
        </div>
      )}

      <AbrirCaixaModal open={abrirAberto} onClose={() => setAbrirAberto(false)} />
      {movimentoTipo && (
        <RegistrarMovimentoModal open={!!movimentoTipo} tipo={movimentoTipo} onClose={() => setMovimentoTipo(null)} />
      )}
      <FecharCaixaModal open={fecharAberto} sessao={sessao} onClose={() => setFecharAberto(false)} />
      <FaturarOSModal open={faturarAberto} onClose={() => setFaturarAberto(false)} />
    </div>
  );
}
