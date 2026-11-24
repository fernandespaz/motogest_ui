import type { UseFormRegister } from 'react-hook-form';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCentavos } from '@/lib/formatters';
import { PlacaConsultaMensagens } from '@/features/shared/PlacaConsultaMensagens';
import type { usePlacaConsulta } from '@/features/shared/usePlacaConsulta';

/**
 * Primeiro elemento do cadastro de veículo: o campo de placa em destaque com a
 * lupa de consulta ao lado. A consulta só roda no clique da lupa (nunca ao
 * digitar, nem com Enter) — cada consulta pode cobrar da carteira da oficina e
 * o usuário precisa sentir que está no controle. Se a consulta não estiver
 * disponível, o hero continua sendo o campo de placa, sem a lupa.
 */
export function PlacaHero({
  register,
  error,
  consulta: c,
}: {
  register: UseFormRegister<any>;
  error?: string;
  /** Estado da consulta (compartilhado com a seção de validação, que também pode buscar o chassi). */
  consulta: ReturnType<typeof usePlacaConsulta>;
}) {
  const preco = c.carteira ? formatCentavos(c.carteira.precoConsultaCentavos) : null;

  return (
    <section
      className="rounded-2xl border border-brand-300/70 bg-gradient-to-br from-brand-50 to-transparent p-5 dark:border-brand-700/60 dark:from-brand-900/30"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
        {c.disponivel ? 'Passo 1 · Consulta de placa' : 'Passo 1 · Placa do veículo'}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-ink">
        {c.disponivel ? 'Comece pela placa do veículo' : 'Informe a placa do veículo'}
      </h3>
      <p className="text-sm text-ink-muted">
        {c.disponivel
          ? 'Digite a placa e clique na lupa para preencher os dados automaticamente.'
          : 'A consulta automática não está disponível — preencha os dados do veículo manualmente.'}
      </p>

      <div className="mt-3 flex items-stretch gap-2">
        <div className="flex-1">
          <label htmlFor="veiculo-placa" className="sr-only">
            Placa
          </label>
          <input
            id="veiculo-placa"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={8}
            placeholder="ABC1D23"
            aria-invalid={error ? true : undefined}
            // Enter dentro do campo não envia o formulário nem dispara a consulta: só o clique na lupa consulta.
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
            className="h-14 w-full rounded-xl border border-border bg-white px-4 text-center text-2xl font-semibold uppercase tracking-[0.3em] text-ink placeholder:font-normal placeholder:tracking-[0.3em] placeholder:text-ink-muted/50 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-graphite-2"
            {...register('placa', {
              onChange: (e) => {
                e.target.value = e.target.value.toUpperCase();
              },
            })}
          />
        </div>
        {c.disponivel && (
          <Button
            type="button"
            size="lg"
            className="h-14 px-5"
            disabled={!c.valida || c.ocupado || c.esgotado}
            onClick={c.buscar}
            title={c.valida ? `Consultar placa${preco ? ` (${preco})` : ''}` : 'Digite uma placa válida (ABC1234 ou ABC1D23)'}
          >
            {c.buscando ? <Loader2 size={22} className="animate-spin" /> : <Search size={22} />}
            <span className="sr-only">Consultar placa</span>
          </Button>
        )}
      </div>

      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}

      <div className="mt-2 flex flex-col gap-1 text-xs">
        {c.disponivel && preco && <p className="text-ink-muted">Cada consulta custa {preco}.</p>}
        <PlacaConsultaMensagens consulta={c} />
      </div>
    </section>
  );
}
