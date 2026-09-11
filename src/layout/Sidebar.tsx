import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { navItems } from './nav';
import { useAuthStore } from '@/store/authStore';

const groupLabels: Record<string, string> = {
  operacao: 'Operação',
  gestao: 'Gestão',
  admin: 'Administração',
};

export function Sidebar() {
  const nome = useAuthStore((s) => s.nome);
  const perfil = useAuthStore((s) => s.perfil);

  const groups = ['operacao', 'gestao', 'admin'] as const;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          MG
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">MotoGest</p>
          <p className="text-xs text-ink-muted">Gestão de oficinas</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {groupLabels[group]}
            </p>
            <div className="space-y-0.5">
              {navItems
                .filter((item) => item.group === group)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-alt hover:text-ink',
                      )
                    }
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3">
        <p className="truncate text-sm font-medium text-ink">{nome}</p>
        <p className="truncate text-xs text-ink-muted">{perfil}</p>
      </div>
    </aside>
  );
}
