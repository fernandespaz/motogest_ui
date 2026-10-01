import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { TrialBanner } from './TrialBanner';
import { TrialExpiredDialog } from './TrialExpiredDialog';
import { PageTransition } from '@/components/ui/PageTransition';
import { useAutoConversaoOrcamentosAprovados } from '@/hooks/useAutoConversaoOrcamentos';

export function AppShell() {
  const location = useLocation();
  // Roda em qualquer tela autenticada — não só na de Orçamentos — pra
  // orçamentos aprovados pelo cliente virarem OS sem depender de alguém
  // lembrar de clicar em "Converter em OS" (ver o hook pra detalhes/limites).
  useAutoConversaoOrcamentosAprovados();

  return (
    <div className="flex h-full min-h-screen bg-surface-alt">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <TrialBanner />
        <TrialExpiredDialog />
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 lg:pb-6">
          {/* Sem AnimatePresence mode="wait": com cliques rápidos no menu a página
              que está saindo podia ficar presa na animação de saída e a nova nunca
              entrava (conteúdo em branco, só o menu respondendo). O key remonta a
              página a cada rota e ela só faz a animação de entrada. */}
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
