import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { format } from 'date-fns';
import { CalendarClock, ChevronRight, ClipboardList, FilePlus2, PackageX } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DonutChart } from '@/components/ui/DonutChart';
import { buttonStyles } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { agendamentoStatusMeta, metaFor } from '@/lib/statusMeta';
import { formatCurrency } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';
import { isConsultor } from '@/lib/perfil';
import { DashboardConsultor } from './DashboardConsultor';

const MAX_AGENDA = 6;

function dataPorExtenso(): string {
  const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function DashboardGeral() {
  const { data, isLoading } = useDashboard();
  const { funil, agendaHoje, carregandoOs, carregandoAgenda, podeOs, podeAgenda } = useDashboardAdmin();
  const navigate = useNavigate();
  const nome = useAuthStore((s) => s.nome);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  // GET /dashboard devolve os números financeiros junto com os operacionais
  // no mesmo payload, sem filtrar por permissão — quem não tem FINANCEIRO_READ
  // (ex.: Consultor Técnico) não devia ver contas a pagar/receber nem saldo de
  // caixa, então o corte é feito aqui, não no backend.
  const podeVerFinanceiro = hasPermission('FINANCEIRO_READ');

  if (isLoading || !data) return <PageSpinner label="Carregando indicadores..." />;

  // O cartão só vira atalho pra tela correspondente se o usuário tem acesso a
  // ela — senão o clique cairia numa rota que ele não pode abrir.
  const atalho = (permissao: string, to: string) =>
    hasPermission(permissao) ? { onClick: () => navigate(to), navega: true } : {};

  const aReceber = data.contasAReceberPendentes?.valorTotal ?? 0;
  const aPagar = data.contasAPagarPendentes?.valorTotal ?? 0;
  const saldoCaixa = data.saldoCaixaMesAtual;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Olá, ${nome?.split(' ')[0] ?? ''}`}
        subtitle={`Panorama da sua oficina · ${dataPorExtenso()}`}
        action={
          hasPermission('ORCAMENTO_WRITE') ? (
            <Link to="/orcamentos/novo" className={clsx(buttonStyles(), 'gap-2')}>
              <FilePlus2 size={18} /> Novo orçamento
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          icon={ClipboardList}
          label="OS abertas"
          value={String(data.ordensServicoAbertas ?? 0)}
          {...atalho('ORDEM_SERVICO_READ', '/ordens-servico')}
        />
        <StatCard
          index={1}
          icon={ClipboardList}
          label="OS em andamento"
          value={String(data.ordensServicoEmAndamento ?? 0)}
          tone="warning"
          {...atalho('ORDEM_SERVICO_READ', '/ordens-servico')}
        />
        <StatCard
          index={2}
          icon={CalendarClock}
          label="Agendamentos hoje"
          value={String(data.agendamentosHoje ?? 0)}
          {...atalho('AGENDA_READ', '/agenda')}
        />
        <StatCard
          index={3}
          icon={PackageX}
          label="Produtos abaixo do mínimo"
          value={String(data.produtosAbaixoDoEstoqueMinimo ?? 0)}
          tone={data.produtosAbaixoDoEstoqueMinimo ? 'warning' : 'brand'}
          {...atalho('ESTOQUE_READ', '/produtos')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {podeOs && (
          <Card>
            <CardHeader title="Ordens de serviço" subtitle="Onde está cada OS em andamento" />
            <CardBody>
              {carregandoOs ? (
                <PageSpinner label="Carregando ordens..." />
              ) : (
                <DonutChart
                  centerLabel="OS ativas"
                  segments={[
                    { label: 'Abertas / aguardando cliente', value: funil.abertas, tone: 'muted' },
                    { label: 'Em execução', value: funil.emExecucao, tone: 'brand' },
                    { label: 'Prontas para faturar', value: funil.paraFaturar, tone: 'warning' },
                    { label: 'Prontas para entrega', value: funil.paraEntregar, tone: 'success' },
                  ]}
                  emptyLabel="Nenhuma OS ativa"
                />
              )}
            </CardBody>
          </Card>
        )}

        {podeVerFinanceiro && (
          <Card>
            <CardHeader title="Financeiro" subtitle="Contas pendentes e caixa do mês" />
            <CardBody className="flex flex-col gap-4">
              <DonutChart
                centerValue={formatCurrency(aReceber - aPagar)}
                centerLabel="Resultado previsto"
                segments={[
                  {
                    label: 'A receber (pendente)',
                    value: aReceber,
                    tone: 'success',
                    display: `${formatCurrency(aReceber)} · ${data.contasAReceberPendentes?.quantidade ?? 0}`,
                  },
                  {
                    label: 'A pagar (pendente)',
                    value: aPagar,
                    tone: 'danger',
                    display: `${formatCurrency(aPagar)} · ${data.contasAPagarPendentes?.quantidade ?? 0}`,
                  },
                ]}
                emptyLabel="Sem contas pendentes"
              />
              <div className="flex items-center justify-between rounded-xl bg-surface-alt px-4 py-3">
                <span className="text-sm text-ink-muted">Saldo de caixa (mês)</span>
                <span className={clsx('text-base font-bold', saldoCaixa != null && saldoCaixa < 0 ? 'text-danger' : 'text-success')}>
                  {formatCurrency(saldoCaixa)}
                </span>
              </div>
            </CardBody>
          </Card>
        )}

        {podeAgenda && (
          <Card className="flex flex-col">
            <CardHeader
              title="Agenda de hoje"
              subtitle="Chegadas previstas na oficina"
              action={
                agendaHoje.length > MAX_AGENDA ? (
                  <Link to="/agenda" className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
                    Ver todos
                  </Link>
                ) : undefined
              }
            />
            {carregandoAgenda ? (
              <PageSpinner label="Carregando agenda..." />
            ) : agendaHoje.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-muted">Nenhum agendamento para hoje.</p>
            ) : (
              <ul className="divide-y divide-border">
                {agendaHoje.slice(0, MAX_AGENDA).map((a) => {
                  const meta = metaFor(agendamentoStatusMeta, a.status);
                  return (
                    <li key={a.id}>
                      <Link to="/agenda" className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-alt">
                        <span className="w-12 shrink-0 text-sm font-bold text-brand-600 dark:text-brand-300">
                          {a.dataHora ? format(new Date(a.dataHora), 'HH:mm') : '--:--'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{a.clienteNome ?? 'Cliente'}</p>
                          <p className="truncate text-xs text-ink-muted">{a.veiculoPlaca ?? ''}</p>
                        </div>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <ChevronRight size={16} className="shrink-0 text-ink-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * Consultor ganha um painel próprio (a própria carteira, pendências de
 * orçamento e números do mês) em vez do panorama geral da oficina. É corte de
 * UX pelo nome do perfil (ver lib/perfil.ts); cada seção do painel continua
 * gated pela permissão do endpoint que lê.
 */
export function DashboardPage() {
  const perfil = useAuthStore((s) => s.perfil);
  return isConsultor(perfil) ? <DashboardConsultor /> : <DashboardGeral />;
}
