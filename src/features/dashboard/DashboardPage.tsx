import { CalendarClock, ClipboardList, PackageX, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { PageSpinner } from '@/components/ui/Spinner';
import { useDashboard } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';
import { isConsultor } from '@/lib/perfil';
import { DashboardConsultor } from './DashboardConsultor';

function DashboardGeral() {
  const { data, isLoading } = useDashboard();
  const nome = useAuthStore((s) => s.nome);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  // GET /dashboard devolve os números financeiros junto com os operacionais
  // no mesmo payload, sem filtrar por permissão — quem não tem FINANCEIRO_READ
  // (ex.: Consultor Técnico) não devia ver contas a pagar/receber nem saldo de
  // caixa, então o corte é feito aqui, não no backend.
  const podeVerFinanceiro = hasPermission('FINANCEIRO_READ');

  if (isLoading || !data) return <PageSpinner label="Carregando indicadores..." />;

  return (
    <div>
      <PageHeader title={`Olá, ${nome?.split(' ')[0] ?? ''}`} subtitle="Aqui está o panorama da sua oficina hoje" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard index={0} icon={ClipboardList} label="OS abertas" value={String(data.ordensServicoAbertas ?? 0)} />
        <StatCard
          index={1}
          icon={ClipboardList}
          label="OS em andamento"
          value={String(data.ordensServicoEmAndamento ?? 0)}
          tone="warning"
        />
        <StatCard
          index={2}
          icon={CalendarClock}
          label="Agendamentos hoje"
          value={String(data.agendamentosHoje ?? 0)}
        />
        {podeVerFinanceiro && (
          <>
            <StatCard
              index={3}
              icon={ArrowUpCircle}
              label="A receber (pendente)"
              value={`${formatCurrency(data.contasAReceberPendentes?.valorTotal)} · ${data.contasAReceberPendentes?.quantidade ?? 0}`}
              tone="success"
            />
            <StatCard
              index={4}
              icon={ArrowDownCircle}
              label="A pagar (pendente)"
              value={`${formatCurrency(data.contasAPagarPendentes?.valorTotal)} · ${data.contasAPagarPendentes?.quantidade ?? 0}`}
              tone="danger"
            />
            <StatCard
              index={5}
              icon={Wallet}
              label="Saldo de caixa (mês)"
              value={formatCurrency(data.saldoCaixaMesAtual)}
              tone={data.saldoCaixaMesAtual != null && data.saldoCaixaMesAtual < 0 ? 'danger' : 'success'}
            />
          </>
        )}
        <StatCard
          index={6}
          icon={PackageX}
          label="Produtos abaixo do mínimo"
          value={String(data.produtosAbaixoDoEstoqueMinimo ?? 0)}
          tone={data.produtosAbaixoDoEstoqueMinimo ? 'warning' : 'brand'}
        />
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
