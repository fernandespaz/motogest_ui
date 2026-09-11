import { motion } from 'framer-motion';
import { CalendarClock, ClipboardList, PackageX, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { useDashboard } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';

function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'brand',
  index,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  index: number;
}) {
  const toneClasses = {
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-green-50 text-success',
    warning: 'bg-amber-50 text-warning',
    danger: 'bg-red-50 text-danger',
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card>
        <CardBody className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-ink-muted">{label}</p>
            <p className="text-lg font-semibold text-ink">{value}</p>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const nome = useAuthStore((s) => s.nome);

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
