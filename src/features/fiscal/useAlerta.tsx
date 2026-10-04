import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertDialog, type AlertTone } from '@/components/ui/AlertDialog';

export interface Alerta {
  tone: AlertTone;
  title: string;
  message?: string;
  /** Linhas extras (ex.: erros por campo, pendências) exibidas em lista abaixo da mensagem. */
  detalhes?: string[];
}

/**
 * Todo aviso do módulo fiscal (sucesso, erro, atenção) sai por um diálogo
 * central — nunca toast. O hook devolve `mostrar` e o `dialogo` a renderizar.
 */
export function useAlerta(): { mostrar: (alerta: Alerta) => void; dialogo: ReactNode } {
  const [alerta, setAlerta] = useState<Alerta | null>(null);
  // Mantém o último conteúdo durante a animação de saída do diálogo.
  const ultimo = useRef<Alerta | null>(null);
  if (alerta) ultimo.current = alerta;

  const mostrar = useCallback((a: Alerta) => setAlerta(a), []);
  const exibido = alerta ?? ultimo.current;

  const dialogo = (
    <AlertDialog
      open={alerta !== null}
      tone={exibido?.tone}
      title={exibido?.title ?? ''}
      message={exibido?.message}
      onClose={() => setAlerta(null)}
    >
      {exibido?.detalhes && exibido.detalhes.length > 0 && (
        <ul className="list-disc space-y-1 rounded-lg bg-surface-alt px-6 py-3 text-sm">
          {exibido.detalhes.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </AlertDialog>
  );

  return { mostrar, dialogo };
}
