import { useLocation } from 'react-router-dom';
import { useOficinaAtual, useOficinaLogoSrc } from '@/hooks/useOficina';
import { BrandMark } from '@/components/ui/BrandMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getCurrentSection } from './nav';

// "Sair" mora no Sidebar agora, ao lado do nome/perfil no canto inferior
// esquerdo — no mobile, onde o Sidebar não aparece, a opção equivalente já
// existe na gaveta "Mais" (ver MobileNav.tsx).
export function Topbar() {
  const { pathname } = useLocation();
  const { data: oficina } = useOficinaAtual();
  const logoSrc = useOficinaLogoSrc();
  const section = getCurrentSection(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <BrandMark logoUrl={logoSrc} size="sm" />
        <span className="truncate text-sm font-semibold text-ink">{oficina?.nomeFantasia || 'MotoGest'}</span>
      </div>
      {/* A saudação ("Olá, ...") já é o título do Dashboard; aqui fica o "onde estou". */}
      <nav aria-label="Seção atual" className="hidden items-center gap-2 text-sm lg:flex">
        {section ? (
          <>
            <span className="text-ink-muted">{section.group}</span>
            <span className="text-ink-muted" aria-hidden="true">/</span>
            <span className="font-semibold text-ink">{section.title}</span>
          </>
        ) : (
          <span className="font-semibold text-ink">{oficina?.nomeFantasia || 'MotoGest'}</span>
        )}
      </nav>
      <ThemeToggle />
    </header>
  );
}
