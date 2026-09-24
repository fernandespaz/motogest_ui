import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useProdutividadeMecanicoMe } from '@/hooks/useProdutividade';
import { formatMesReferencia } from '@/lib/formatters';
import { MesSelector } from './IndicadoresConsultor';
import { AoVivoBadge } from './IndicadoresMecanico';
import { ProdutividadeMecanicoConteudo } from './ProdutividadeMecanicoConteudo';
import { useMesReferencia } from './useMesReferencia';

/**
 * Produtividade mensal do próprio mecânico, em horas técnicas.
 *
 * Usa GET /produtividade/mecanicos/me, autoescopado pelo token — exige só
 * estar autenticado, não PRODUTIVIDADE_READ. Essa tela usava antes o mesmo
 * endpoint geral por id que a visão gerencial usa (useProdutividadeMecanico),
 * o que exigia dar PRODUTIVIDADE_READ ao Mecânico — permissão que também
 * libera ver QUALQUER outro mecânico/consultor da oficina, não só os
 * próprios números. O endpoint "/me" fecha esse vazamento.
 */
export function MinhaProdutividadePage() {
  const [mes, setMes] = useMesReferencia();
  const { data, isLoading, isPlaceholderData, isFetching, isError } = useProdutividadeMecanicoMe(mes);

  const cabecalho = (
    <PageHeader
      title="Minha produtividade"
      subtitle={`Suas horas técnicas em ${formatMesReferencia(mes)}`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <AoVivoBadge mes={mes} atualizando={isFetching && !isLoading} />
          <MesSelector mes={mes} onChange={setMes} />
        </div>
      }
    />
  );

  return (
    <div className="flex flex-col gap-5">
      {cabecalho}
      {isError ? (
        <EmptyState title="Não foi possível carregar sua produtividade" description="Tente novamente em instantes." />
      ) : isLoading || !data ? (
        <PageSpinner label="Calculando suas horas técnicas..." />
      ) : (
        <ProdutividadeMecanicoConteudo data={data} mes={mes} atualizando={isPlaceholderData} linkOsBase="/minhas-os" />
      )}
    </div>
  );
}
