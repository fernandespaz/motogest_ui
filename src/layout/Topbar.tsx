import { useAuthStore } from '@/store/authStore';
import { useOficinaAtual, useOficinaLogoSrc } from '@/hooks/useOficina';
import { BrandMark } from '@/components/ui/BrandMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// "Sair" mora no Sidebar agora, ao lado do nome/perfil no canto inferior
// esquerdo — no mobile, onde o Sidebar não aparece, a opção equivalente já
// existe na gaveta "Mais" (ver MobileNav.tsx).
export function Topbar() {
  const nome = useAuthStore((s) => s.nome);
  const { data: oficina } = useOficinaAtual();
  const logoSrc = useOficinaLogoSrc();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <BrandMark logoUrl={logoSrc} size="sm" />
        <span className="truncate text-sm font-semibold text-ink">{oficina?.nomeFantasia || 'MotoGest'}</span>
      </div>
      <div className="hidden text-sm text-ink-muted lg:block">Olá, {nome?.split(' ')[0]}</div>
      <ThemeToggle />
    </header>
  );
}
