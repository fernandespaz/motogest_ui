import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronDown, LogOut } from 'lucide-react';
import { useVisibleNavItems } from './useVisibleNavItems';
import { groupLabels, isNavItemActive } from './nav';
import { useAuthStore } from '@/store/authStore';
import { useOficinaAtual, useOficinaLogoSrc } from '@/hooks/useOficina';
import { BrandMark } from '@/components/ui/BrandMark';

const COLLAPSED_STORAGE_KEY = 'motogest:sidebar-collapsed';

function readCollapsed(): string[] {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((g): g is string => typeof g === 'string') : [];
  } catch {
    return [];
  }
}

function initials(nome?: string | null): string {
  const parts = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Sidebar() {
  const nome = useAuthStore((s) => s.nome);
  const perfil = useAuthStore((s) => s.perfil);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const visibleItems = useVisibleNavItems();
  const { data: oficina } = useOficinaAtual();
  const logoSrc = useOficinaLogoSrc();
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function toggleGroup(group: string) {
    setCollapsed((prev) => {
      const next = prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group];
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Sem localStorage o grupo só não lembra o estado entre visitas.
      }
      return next;
    });
  }

  const groups = ['operacao', 'gestao', 'admin'] as const;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line-dark bg-graphite lg:flex">
      {/* h-16 igual ao Topbar: as duas linhas divisórias ficam na mesma altura. */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line-dark bg-gradient-to-r from-brand-600/20 via-brand-600/5 to-transparent px-4">
        <BrandMark logoUrl={logoSrc} size="xl" />
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-tight text-white">{oficina?.nomeFantasia || 'MotoGest'}</p>
          <p className="truncate text-xs leading-tight text-slate-400">Gestão de oficinas</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-4">
        {groups.map((group) => {
          const itemsInGroup = visibleItems.filter((item) => item.group === group);
          if (itemsInGroup.length === 0) return null;
          // O grupo da página atual nunca fica fechado — senão o usuário perderia
          // de vista onde está.
          const hasActive = itemsInGroup.some((item) => isNavItemActive(item, pathname));
          const open = hasActive || !collapsed.includes(group);
          return (
            <div key={group}>
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                aria-expanded={open}
                className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                {groupLabels[group]}
                <ChevronDown size={14} className={clsx('transition-transform', !open && '-rotate-90')} />
              </button>
              {open && (
                <div className="space-y-0.5">
                  {itemsInGroup.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        clsx(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-brand-600/15 text-white'
                            : 'text-slate-300 hover:bg-graphite-2 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-brand-500 shadow-brand-glow" />
                          )}
                          <item.icon
                            size={18}
                            className={clsx('shrink-0 transition-colors', isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200')}
                          />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 border-t border-line-dark px-4 py-3">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white"
        >
          {initials(nome)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{nome}</p>
          <p className="truncate text-xs text-slate-400">{perfil}</p>
        </div>
        <button
          onClick={handleLogout}
          aria-label="Sair"
          title="Sair"
          className="shrink-0 rounded-lg p-2 text-danger transition-colors hover:bg-white/10"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
