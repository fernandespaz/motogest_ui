import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function Topbar() {
  const nome = useAuthStore((s) => s.nome);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
          MG
        </div>
        <span className="text-sm font-semibold text-ink">MotoGest</span>
      </div>
      <div className="hidden text-sm text-ink-muted lg:block">Olá, {nome?.split(' ')[0]}</div>
      <button
        onClick={handleLogout}
        className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface-alt hover:text-danger lg:flex"
      >
        <LogOut size={16} /> Sair
      </button>
    </header>
  );
}
