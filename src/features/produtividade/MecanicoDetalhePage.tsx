import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useProdutividadeMecanico } from '@/hooks/useProdutividade';
import { formatMesReferencia, getInitials } from '@/lib/formatters';
import { MesSelector } from './IndicadoresConsultor';
import { AoVivoBadge } from './IndicadoresMecanico';
import { ProdutividadeMecanicoConteudo } from './ProdutividadeMecanicoConteudo';
import { useMesReferencia } from './useMesReferencia';

/** Pressupõe PRODUTIVIDADE_READ — o gate fica na rota (ver router.tsx). */
export function MecanicoDetalhePage() {
  const { usuarioId } = useParams();
  const id = Number(usuarioId) || undefined;
  const navigate = useNavigate();
  const [mes, setMes] = useMesReferencia();
  const { data, isLoading, isPlaceholderData, isFetching, isError } = useProdutividadeMecanico(id, mes);

  const voltar = (
    <Button variant="secondary" onClick={() => navigate(`/produtividade/mecanicos?mes=${mes}`)}>
      <ArrowLeft size={16} /> Voltar
    </Button>
  );

  if (!id || isError) {
    return <EmptyState title="Mecânico não encontrado" description="Verifique o link ou volte para a lista." action={voltar} />;
  }
  if (isLoading || !data) return <PageSpinner label="Carregando indicadores do mecânico..." />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {getInitials(data.usuarioNome ?? '')}
            </span>
            {data.usuarioNome}
          </span>
        }
        subtitle={`Horas técnicas em ${formatMesReferencia(mes)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AoVivoBadge mes={mes} atualizando={isFetching && !isLoading} />
            <MesSelector mes={mes} onChange={setMes} />
            {voltar}
          </div>
        }
      />
      <ProdutividadeMecanicoConteudo data={data} mes={mes} atualizando={isPlaceholderData} />
    </div>
  );
}
