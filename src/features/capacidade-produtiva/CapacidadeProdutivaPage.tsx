import { useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuditoriaCapacidadeProdutiva, useCapacidadeProdutiva } from '@/hooks/useCapacidadeProdutiva';
import { CapacidadeProdutivaForm } from './CapacidadeProdutivaForm';
import { AuditoriaFinanceiraCard } from '@/features/shared/AuditoriaFinanceiraCard';

type Aba = 'capacidade' | 'historico';

/**
 * Fallback da rota pra quem não tem CAPACIDADE_PRODUTIVA_GERENCIAR — tela
 * separada da Hora Técnica, com sua própria permissão (ver doc de
 * Precificação por Categoria de Serviço).
 */
export function CapacidadeProdutivaSemAcesso() {
  return (
    <EmptyState
      icon={Lock}
      title="Acesso restrito"
      description="A capacidade produtiva da oficina é visível apenas para administradores."
    />
  );
}

/** Pressupõe CAPACIDADE_PRODUTIVA_GERENCIAR — o gate fica na rota (ver router.tsx). */
export function CapacidadeProdutivaPage() {
  const { data, isLoading, isError, refetch } = useCapacidadeProdutiva();
  const [aba, setAba] = useState<Aba>('capacidade');
  const [pagina, setPagina] = useState(0);
  const auditoria = useAuditoriaCapacidadeProdutiva({ page: pagina, size: 10 });

  if (isLoading) return <PageSpinner label="Carregando capacidade produtiva..." />;
  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Não foi possível carregar a capacidade produtiva"
        description="Os valores atuais não foram carregados, então a edição fica bloqueada para não sobrescrevê-los."
        action={<Button onClick={() => refetch()}>Tentar novamente</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Capacidade produtiva" subtitle="Quantas horas a oficina realmente consegue vender por mês" />

      <div>
        <Tabs
          tabs={[
            { key: 'capacidade', label: 'Capacidade' },
            { key: 'historico', label: 'Histórico' },
          ]}
          active={aba}
          onChange={(k) => setAba(k as Aba)}
        />
        <TabPanel hidden={aba !== 'capacidade'}>
          <CapacidadeProdutivaForm capacidade={data} />
        </TabPanel>
        <TabPanel hidden={aba !== 'historico'}>
          <AuditoriaFinanceiraCard data={auditoria.data} isLoading={auditoria.isLoading} page={pagina} onPageChange={setPagina} />
        </TabPanel>
      </div>
    </div>
  );
}
