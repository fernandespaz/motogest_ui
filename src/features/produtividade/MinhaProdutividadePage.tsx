import { Lock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useProdutividadeMecanico } from '@/hooks/useProdutividade';
import { useAuthStore } from '@/store/authStore';
import { formatMesReferencia } from '@/lib/formatters';
import { MesSelector } from './IndicadoresConsultor';
import { AoVivoBadge } from './IndicadoresMecanico';
import { ProdutividadeMecanicoConteudo } from './ProdutividadeMecanicoConteudo';
import { useMesReferencia } from './useMesReferencia';

/**
 * Produtividade mensal do próprio mecânico, em horas técnicas.
 *
 * O backend só expõe o detalhe por id (GET /produtividade/mecanicos/{id}),
 * atrás de PRODUTIVIDADE_READ — não existe um "/mecanicos/me" que devolva só
 * os dados de quem chama. Por isso a tela exige a mesma permissão; sem ela a
 * consulta nem sai (evita o 403 com toast global) e a tela explica o motivo.
 */
export function MinhaProdutividadePage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const usuarioId = useAuthStore((s) => s.usuarioId) ?? undefined;
  const podeVer = hasPermission('PRODUTIVIDADE_READ');
  const [mes, setMes] = useMesReferencia();
  const { data, isLoading, isPlaceholderData, isFetching, isError } = useProdutividadeMecanico(usuarioId, mes, {
    enabled: podeVer,
  });

  const cabecalho = (
    <PageHeader
      title="Minha produtividade"
      subtitle={`Suas horas técnicas em ${formatMesReferencia(mes)}`}
      action={
        podeVer ? (
          <div className="flex flex-wrap items-center gap-2">
            <AoVivoBadge mes={mes} atualizando={isFetching && !isLoading} />
            <MesSelector mes={mes} onChange={setMes} />
          </div>
        ) : undefined
      }
    />
  );

  if (!podeVer) {
    return (
      <div className="flex flex-col gap-5">
        {cabecalho}
        <EmptyState
          icon={Lock}
          title="Relatório não liberado para o seu perfil"
          description="Peça ao administrador da oficina para liberar a visualização de produtividade no seu perfil de acesso."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {cabecalho}
      {/* Sessão antiga sem usuarioId deixaria a consulta desligada e o spinner eterno. */}
      {isError || !usuarioId ? (
        <EmptyState title="Não foi possível carregar sua produtividade" description="Tente novamente em instantes." />
      ) : isLoading || !data ? (
        <PageSpinner label="Calculando suas horas técnicas..." />
      ) : (
        <ProdutividadeMecanicoConteudo data={data} mes={mes} atualizando={isPlaceholderData} linkOsBase="/minhas-os" />
      )}
    </div>
  );
}
