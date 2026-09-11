import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldAlert } from 'lucide-react';

/**
 * Gates UI by permission code. Enforcement is always redone server-side —
 * this only avoids showing controls the user's own session can't use.
 */
export function RequirePermission({
  codigo,
  fallback,
  children,
}: {
  codigo: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const codigos = Array.isArray(codigo) ? codigo : [codigo];
  const allowed = codigos.some((c) => hasPermission(c));

  if (!allowed) {
    return (
      fallback ?? (
        <EmptyState
          icon={ShieldAlert}
          title="Sem permissão"
          description="Você não tem acesso a esta funcionalidade. Fale com o administrador da oficina."
        />
      )
    );
  }

  return <>{children}</>;
}
