import { Sun, Moon, Monitor } from 'lucide-react';
import clsx from 'clsx';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';

const OPCOES: { valor: ThemeMode; icon: typeof Sun; label: string }[] = [
  { valor: 'light', icon: Sun, label: 'Tema claro' },
  { valor: 'dark', icon: Moon, label: 'Tema escuro' },
  { valor: 'system', icon: Monitor, label: 'Tema do sistema' },
];

/** Alterna entre claro/escuro/sistema — persistido em localStorage (ver
 *  useThemeStore) e aplicado antes do primeiro paint (ver <script> em
 *  index.html), sem flash de tema errado ao recarregar a página.
 *
 *  `variant="dark"` é pro caso de ficar sobre uma barra graphite fixa (ex.:
 *  cabeçalho das telas do técnico) — essa barra é sempre escura independente
 *  do tema, então o toggle "claro" (pensado pro fundo bg-surface do Topbar)
 *  ficaria com contraste errado ali. */
export function ThemeToggle({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div
      className={clsx(
        'flex items-center gap-0.5 rounded-lg border p-0.5',
        variant === 'dark' ? 'border-white/10 bg-white/5' : 'border-border bg-surface-alt',
      )}
    >
      {OPCOES.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => setMode(opcao.valor)}
          aria-label={opcao.label}
          aria-pressed={mode === opcao.valor}
          title={opcao.label}
          className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            variant === 'dark'
              ? mode === opcao.valor
                ? 'bg-white/15 text-white'
                : 'text-slate-400 hover:text-white'
              : mode === opcao.valor
                ? 'bg-surface text-brand-600 shadow-sm'
                : 'text-ink-muted hover:text-ink',
          )}
        >
          <opcao.icon size={15} />
        </button>
      ))}
    </div>
  );
}
