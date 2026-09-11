import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { TrialBanner } from './TrialBanner';
import { PageTransition } from '@/components/ui/PageTransition';

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex h-full min-h-screen bg-surface-alt">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <TrialBanner />
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 lg:pb-6">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
