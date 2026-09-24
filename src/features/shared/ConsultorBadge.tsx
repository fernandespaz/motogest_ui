import { UserRound } from 'lucide-react';

/** Chip destacado com o consultor responsável pelo Orçamento/OS — usado no
 *  subtítulo dos dois formulários. Texto simples ali passava despercebido
 *  (era só cinza-claro, igual a qualquer outro subtítulo). */
export function ConsultorBadge({ nome }: { nome: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
      <UserRound size={12} />
      Consultor: {nome}
    </span>
  );
}
