import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarClock,
  ClipboardList,
  PackageX,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  FilePlus2,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { buttonStyles } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useDashboard } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';
import { isConsultor } from '@/lib/perfil';
import { DashboardConsultor } from './DashboardConsultor';

interface Atalho {
  to: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}

function DashboardGeral() {
  const { data, isLoading } = useDashboard();
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

  const atalhos: Atalho[] = [
    hasPermission('ORCAMENTO_WRITE') && {
      to: '/orcamentos/novo',
      label: 'Novo orçamento',
      icon: FilePlus2,
      primary: true,
    },
    hasPermission('ORDEM_SERVICO_READ') && { to: '/ordens-servico', label: 'Ordens de serviço', icon: ClipboardList },
    hasPermission('AGENDA_READ') && { to: '/agenda', label: 'Agenda', icon: CalendarClock },
    hasPermission('CLIENTE_READ') && { to: '/clientes', label: 'Clientes', icon: Users },
  ].filter((a): a is Atalho => !!a);

  return (
    <div>
      <PageHeader title={`Olá, ${nome?.split(' ')[0] ?? ''}`} subtitle="Aqui está o panorama da sua oficina hoje" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        {podeVerFinanceiro && (
          <>
            <StatCard
              index={3}
              icon={ArrowUpCircle}
              label="A receber (pendente)"
              value={`${formatCurrency(data.contasAReceberPendentes?.valorTotal)} · ${data.contasAReceberPendentes?.quantidade ?? 0}`}
              tone="success"
              {...atalho('FINANCEIRO_READ', '/financeiro')}
            />
            <StatCard
              index={4}
              icon={ArrowDownCircle}
              label="A pagar (pendente)"
              value={`${formatCurrency(data.contasAPagarPendentes?.valorTotal)} · ${data.contasAPagarPendentes?.quantidade ?? 0}`}
              tone="danger"
              {...atalho('FINANCEIRO_READ', '/financeiro')}
            />
            <StatCard
              index={5}
              icon={Wallet}
              label="Saldo de caixa (mês)"
              value={formatCurrency(data.saldoCaixaMesAtual)}
              tone={data.saldoCaixaMesAtual != null && data.saldoCaixaMesAtual < 0 ? 'danger' : 'success'}
              {...atalho('FINANCEIRO_READ', '/financeiro')}
            />
          </>
        )}
        <StatCard
          index={6}
          icon={PackageX}
          label="Produtos abaixo do mínimo"
          value={String(data.produtosAbaixoDoEstoqueMinimo ?? 0)}
          tone={data.produtosAbaixoDoEstoqueMinimo ? 'warning' : 'brand'}
          {...atalho('ESTOQUE_READ', '/produtos')}
        />
      </div>

      {atalhos.length > 0 && (
        <Card className="mt-5">
          <CardHeader title="Atalhos rápidos" subtitle="Vá direto ao que você mais usa no dia a dia" />
          <CardBody className="flex flex-wrap gap-3">
            {atalhos.map(({ to, label, icon: Icone, primary }) => (
              <Link
                key={to}
                to={to}
                className={clsx(buttonStyles({ variant: primary ? 'primary' : 'secondary' }), 'gap-2')}
              >
                <Icone size={18} /> {label}
              </Link>
            ))}
          </CardBody>
        </Card>
      )}
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
