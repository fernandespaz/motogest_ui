import { useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useHoraTecnica } from '@/hooks/useHoraTecnica';
import { ComposicaoHoraTecnica, HoraTecnicaNaoConfigurada } from './ComposicaoHoraTecnica';
import { ParametrosHoraTecnicaForm } from './ParametrosHoraTecnicaForm';
import { CustosFixosCard } from './CustosFixosCard';
import { AuditoriaHoraTecnicaCard } from './AuditoriaHoraTecnicaCard';

type Aba = 'parametros' | 'custos' | 'historico';

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

      <div>
        <Tabs
          tabs={[
            { key: 'parametros', label: 'Parâmetros' },
            { key: 'custos', label: 'Custos fixos' },
            { key: 'historico', label: 'Histórico' },
          ]}
          active={aba}
          onChange={(k) => setAba(k as Aba)}
        />
        <TabPanel hidden={aba !== 'parametros'}>
          <ParametrosHoraTecnicaForm horaTecnica={data} />
        </TabPanel>
        <TabPanel hidden={aba !== 'custos'}>
          <CustosFixosCard />
        </TabPanel>
        <TabPanel hidden={aba !== 'historico'}>
          <AuditoriaHoraTecnicaCard />
        </TabPanel>
      </div>
    </div>
  );
}
