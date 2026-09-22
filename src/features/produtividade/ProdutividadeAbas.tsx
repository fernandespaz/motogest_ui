import type { ReactNode } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs } from '@/components/ui/Tabs';
import { useAuthStore } from '@/store/authStore';
import { isConsultor, isMecanico } from '@/lib/perfil';

/**
 * Abas por rota (não por estado) — cada relatório tem URL própria, o "voltar"
 * do detalhe cai na aba certa e o `?mes=` é levado junto na troca.
 */
export function ProdutividadeAbas({ ativa, mes }: { ativa: 'consultores' | 'mecanicos'; mes: string }) {
  const navigate = useNavigate();
  return (
    <Tabs
      tabs={[
        { key: 'consultores', label: 'Consultores' },
        { key: 'mecanicos', label: 'Mecânicos' },
      ]}
      active={ativa}
      onChange={(k) => navigate(`${k === 'mecanicos' ? '/produtividade/mecanicos' : '/produtividade'}?mes=${mes}`)}
    />
  );
}

/**
 * Consultor só enxerga os próprios números: devolve o id dele pra tela
 * redirecionar pro próprio detalhe; `undefined` pra quem tem a visão
 * gerencial. É corte de UX pelo nome do perfil (ver lib/perfil.ts) — o
 * backend ainda entrega o relatório geral a quem tem PRODUTIVIDADE_READ,
 * então isso não substitui um endpoint "/consultores/me" do lado de lá.
 */
export function useConsultorRestritoAoProprio(): number | undefined {
  const perfil = useAuthStore((s) => s.perfil);
  const usuarioId = useAuthStore((s) => s.usuarioId);
  return isConsultor(perfil) && usuarioId ? usuarioId : undefined;
}

/**
 * Guarda das rotas de /produtividade (visão gerencial). Corta pelo nome do
 * perfil, como o resto da tela — UX, não segurança (ver lib/perfil.ts):
 * - Mecânico nunca vê os relatórios da oficina (ranking de consultores,
 *   horas dos colegas), mesmo que o perfil tenha PRODUTIVIDADE_READ pra ver
 *   a própria tela — vai pra /minha-produtividade.
 * - Consultor só entra no próprio detalhe; as rotas de mecânico
 *   (`permitirConsultor` falso) o mandam pra lá antes de montar a página.
 */
export function GuardaProdutividade({
  permitirConsultor = false,
  children,
}: {
  permitirConsultor?: boolean;
  children: ReactNode;
}) {
  const perfil = useAuthStore((s) => s.perfil);
  const proprioId = useConsultorRestritoAoProprio();
  const [params] = useSearchParams();
  const mes = params.get('mes');
  const sufixo = mes ? `?mes=${mes}` : '';
  if (isMecanico(perfil)) return <Navigate to={`/minha-produtividade${sufixo}`} replace />;
  if (proprioId && !permitirConsultor) {
    return <Navigate to={`/produtividade/consultores/${proprioId}${sufixo}`} replace />;
  }
  return <>{children}</>;
}
