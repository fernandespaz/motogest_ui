import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import clsx from 'clsx';
import { mobilePrimaryNav, navItems } from './nav';
import { useAuthStore } from '@/store/authStore';

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const secondaryItems = navItems.filter((item) => !mobilePrimaryNav.includes(item));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur lg:hidden">
        {mobilePrimaryNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                isActive ? 'text-brand-700' : 'text-ink-muted',
              )
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink-muted"
        >
          <Menu size={20} />
          Mais
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface p-4 pb-8 lg:hidden"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
              <div className="grid grid-cols-3 gap-3">
                {secondaryItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-xs font-medium text-ink"
                  >
                    <item.icon size={20} className="text-brand-600" />
                    <span className="text-center">{item.label}</span>
                  </NavLink>
                ))}
              </div>
              <button
                onClick={logout}
                className="mt-4 w-full rounded-lg border border-danger/30 py-2.5 text-sm font-medium text-danger"
              >
                Sair da conta
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
