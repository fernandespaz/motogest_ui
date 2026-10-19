import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { AgendaCardBody, cardShell } from './AgendaCard';
import { COLUNAS, type AgendaItem, type CardKanban, type ColunaId } from './agendaUtils';

/**
 * Quadro somente leitura: mostra o que acontece na oficina. Ninguém move card aqui — iniciar,
 * pausar, pedir peça e concluir é o técnico, na OS, e as colunas seguem o status dela.
 */
export function AgendaKanban({ cards, onAbrir }: { cards: CardKanban[]; onAbrir: (item: AgendaItem) => void }) {
  const porColuna = useMemo(() => {
    const mapa = new Map<ColunaId, CardKanban[]>(COLUNAS.map((c) => [c.id, []]));
    for (const c of cards) mapa.get(c.coluna)!.push(c);
    return mapa;
  }, [cards]);

  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3 lg:grid lg:grid-cols-5 lg:overflow-visible">
      {COLUNAS.map((col) => {
        const lista = porColuna.get(col.id) ?? [];
        return (
          <section
            key={col.id}
            aria-label={col.titulo}
            className="flex min-h-[16rem] w-[17rem] shrink-0 snap-start flex-col gap-2 rounded-xl border border-border bg-surface-alt p-2.5 lg:w-auto"
          >
            <header className="px-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">{col.titulo}</h3>
                <span className="rounded-full bg-surface px-2 text-xs font-semibold text-ink-muted">{lista.length}</span>
              </div>
              <p className="text-[11px] text-ink-muted">{col.dica}</p>
            </header>
            {lista.length === 0 && <p className="py-6 text-center text-xs text-ink-muted">Nenhum veículo</p>}
            {lista.map((c) => (
              <article key={c.key} className={cardShell(c.coluna)}>
                {c.item ? (
                  <button type="button" onClick={() => onAbrir(c.item!)} className="w-full">
                    <AgendaCardBody ag={c.item.ag} os={c.os} status={c.item.status} etapa={c.item.etapa} mostrarStatus={false} />
                  </button>
                ) : (
                  <Link to={`/ordens-servico/${c.os?.id}`} className="block">
                    <AgendaCardBody os={c.os} mostrarStatus={false} />
                  </Link>
                )}
                <p className="mt-1.5 flex items-center justify-between text-[11px] text-ink-muted">
                  <span>
                    {c.item ? formatDate(c.item.ag.dataHora) : 'Sem agendamento'}
                    {c.os?.numero && c.item && <> · {c.os.numero}</>}
                  </span>
                  {!c.item && (
                    <span className="inline-flex items-center gap-1">
                      <Eye size={11} aria-hidden /> abrir OS
                    </span>
                  )}
                </p>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
