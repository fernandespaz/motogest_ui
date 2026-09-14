import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import { useVisibleNavItems } from './useVisibleNavItems';
import { groupLabels } from './nav';
import { useAuthStore } from '@/store/authStore';
import { useOficinaAtual, useOficinaLogoSrc } from '@/hooks/useOficina';
import { BrandMark } from '@/components/ui/BrandMark';

export function Sidebar() {
  const nome = useAuthStore((s) => s.nome);
  const perfil = useAuthStore((s) => s.perfil);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const visibleItems = useVisibleNavItems();
  const { data: oficina } = useOficinaAtual();
  const logoSrc = useOficinaLogoSrc();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const groups = ['operacao', 'gestao', 'admin'] as const;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line-dark bg-graphite lg:flex">
      <div className="flex items-center gap-2 border-b border-line-dark px-5 py-5">
        <BrandMark logoUrl={logoSrc} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{oficina?.nomeFantasia || 'MotoGest'}</p>
          <p className="text-xs text-slate-400">Gestão de oficinas</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-3">
        {groups.map((group) => {
          const itemsInGroup = visibleItems.filter((item) => item.group === group);
          if (itemsInGroup.length === 0) return null;
          return (
            <div key={group}>
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {groupLabels[group]}
              </p>
              <div className="space-y-0.5">
                {itemsInGroup.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-300 hover:bg-graphite-2 hover:text-white',
                      )
                    }
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-line-dark px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{nome}</p>
          <p className="truncate text-xs text-slate-400">{perfil}</p>
        </div>
        <button
          onClick={handleLogout}
          aria-label="Sair"
          title="Sair"
          className="shrink-0 rounded-lg p-2 text-danger hover:bg-white/10"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
