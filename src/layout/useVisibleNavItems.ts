import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { filterNavByPermission, MOBILE_PRIMARY_PATHS, type NavItem } from './nav';

/** The nav items the current session actually has permission to see. */
export function useVisibleNavItems(): NavItem[] {
  const permissoes = useAuthStore((s) => s.permissoes);
  const perfil = useAuthStore((s) => s.perfil);
  return useMemo(
    () => filterNavByPermission((codigo) => permissoes?.includes(codigo) ?? false, perfil),
    [permissoes, perfil],
  );
}

/** Same as above, pre-split into the mobile bottom bar's primary slots and the "Mais" drawer. */
export function useVisibleMobileNav(): { primary: NavItem[]; secondary: NavItem[] } {
  const visible = useVisibleNavItems();
  return useMemo(
    () => ({
      primary: visible.filter((item) => MOBILE_PRIMARY_PATHS.includes(item.to)),
      secondary: visible.filter((item) => !MOBILE_PRIMARY_PATHS.includes(item.to)),
    }),
    [visible],
  );
}
