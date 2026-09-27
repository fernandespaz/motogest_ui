import { useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuditoriaHoraTecnica, useCategoriasHoraTecnica } from '@/hooks/useHoraTecnica';
import { CategoriaHoraTecnicaForm } from './CategoriaHoraTecnicaForm';
import { AuditoriaFinanceiraCard } from '@/features/shared/AuditoriaFinanceiraCard';

type Aba = 'categorias' | 'historico';

/**
 * Fallback da rota pra quem não tem HORA_TECNICA_GERENCIAR (ex.: Consultor
 * que digitou a URL) — explica onde o valor da hora já aparece pra ele.
 */
export function HoraTecnicaSemAcesso() {
  return (
    <EmptyState
      icon={Lock}
      title="Acesso restrito"
      description="O valor da hora técnica por categoria é visível apenas para administradores. O preço final aparece para você direto nos orçamentos e ordens de serviço."
    />
  );
}

/** Pressupõe HORA_TECNICA_GERENCIAR — o gate fica na rota (ver router.tsx). */
export function HoraTecnicaPage() {
  const { data, isLoading, isError, refetch } = useCategoriasHoraTecnica();
  const [aba, setAba] = useState<Aba>('categorias');
  const [pagina, setPagina] = useState(0);
  const auditoria = useAuditoriaHoraTecnica({ page: pagina, size: 10 });

  if (isLoading) return <PageSpinner label="Carregando hora técnica..." />;
  // Sem os valores atuais o form cairia nos valores de partida e um clique em
  // Salvar sobrescreveria a precificação real da oficina — então nada de form
  // até a consulta dar certo. Um array vazio (`data`) é estado válido (oficina
  // ainda não configurou nada), diferente de `isError`.
  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Não foi possível carregar a hora técnica"
        description="Os valores atuais não foram carregados, então a edição fica bloqueada para não sobrescrevê-los."
        action={<Button onClick={() => refetch()}>Tentar novamente</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Hora técnica"
        subtitle="Valor da hora por categoria (A/B/C) — os consultores veem apenas o preço final do serviço"
      />

      <div>
        <Tabs
          tabs={[
            { key: 'categorias', label: 'Categorias' },
            { key: 'historico', label: 'Histórico' },
          ]}
          active={aba}
          onChange={(k) => setAba(k as Aba)}
        />
        <TabPanel hidden={aba !== 'categorias'}>
          <CategoriaHoraTecnicaForm categorias={data} />
        </TabPanel>
        <TabPanel hidden={aba !== 'historico'}>
          <AuditoriaFinanceiraCard data={auditoria.data} isLoading={auditoria.isLoading} page={pagina} onPageChange={setPagina} />
        </TabPanel>
      </div>
    </div>
  );
}
