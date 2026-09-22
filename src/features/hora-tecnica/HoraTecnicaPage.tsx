import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useHoraTecnica } from '@/hooks/useHoraTecnica';
import { ComposicaoHoraTecnica, HoraTecnicaNaoConfigurada } from './ComposicaoHoraTecnica';
import { ParametrosHoraTecnicaForm } from './ParametrosHoraTecnicaForm';
import { AuditoriaHoraTecnicaCard } from './AuditoriaHoraTecnicaCard';

type Aba = 'parametros' | 'historico';

/**
 * As despesas fixas (base do custo por hora) foram centralizadas no
 * Financeiro, junto das contas a pagar — aqui fica só o atalho pra lá.
 */
function DespesasFixasNoFinanceiro() {
  // Sem gate aqui: esta página já exige HORA_TECNICA_GERENCIAR, que é a mesma
  // permissão da aba de despesas fixas — o Financeiro mostra essa aba mesmo
  // pra quem não tem FINANCEIRO_READ (ver FinanceiroPage).
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink-muted">
      <Wallet size={18} className="shrink-0 text-brand-600" />
      <span className="flex-1">
        As despesas fixas que compõem o custo da hora agora são cadastradas no Financeiro, junto às contas a pagar.
      </span>
      <Link
        to="/financeiro?aba=despesas-fixas"
        className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
      >
        Gerenciar despesas fixas
      </Link>
    </div>
  );
}

/**
 * Fallback da rota pra quem não tem HORA_TECNICA_GERENCIAR (ex.: Consultor
 * que digitou a URL) — explica onde o valor da hora já aparece pra ele.
 */
export function HoraTecnicaSemAcesso() {
  return (
    <EmptyState
      icon={Lock}
      title="Acesso restrito"
      description="A composição da hora técnica é visível apenas para administradores. O valor da hora aparece para você direto nos orçamentos e ordens de serviço."
    />
  );
}

/** Pressupõe HORA_TECNICA_GERENCIAR — o gate fica na rota (ver router.tsx). */
export function HoraTecnicaPage() {
  const { data, isLoading, isError, refetch } = useHoraTecnica();
  const [aba, setAba] = useState<Aba>('parametros');

  if (isLoading) return <PageSpinner label="Carregando hora técnica..." />;
  // Sem os parâmetros atuais o form cairia nos valores sugeridos e um clique
  // em Salvar sobrescreveria a precificação real da oficina — então nada de
  // form até a consulta dar certo.
  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Não foi possível carregar a hora técnica"
        description="Os parâmetros atuais não foram carregados, então a edição fica bloqueada para não sobrescrevê-los."
        action={<Button onClick={() => refetch()}>Tentar novamente</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Hora técnica"
        subtitle="Como o preço da hora é formado — os consultores veem apenas o valor final"
      />

      {data.configurado ? <ComposicaoHoraTecnica horaTecnica={data} /> : <HoraTecnicaNaoConfigurada />}

      <DespesasFixasNoFinanceiro />

      <div>
        <Tabs
          tabs={[
            { key: 'parametros', label: 'Parâmetros' },
            { key: 'historico', label: 'Histórico' },
          ]}
          active={aba}
          onChange={(k) => setAba(k as Aba)}
        />
        <TabPanel hidden={aba !== 'parametros'}>
          <ParametrosHoraTecnicaForm horaTecnica={data} />
        </TabPanel>
        <TabPanel hidden={aba !== 'historico'}>
          <AuditoriaHoraTecnicaCard />
        </TabPanel>
      </div>
    </div>
  );
}
