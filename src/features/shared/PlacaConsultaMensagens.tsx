import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { formatCentavos } from '@/lib/formatters';
import type { usePlacaConsulta } from './usePlacaConsulta';

type Consulta = ReturnType<typeof usePlacaConsulta>;

function LinkRecarregar() {
  return (
    <Link to="/oficina/placas" className="font-semibold underline underline-offset-2">
      Recarregar
    </Link>
  );
}

/** Avisos de saldo e de resultado da consulta, iguais no botão compacto e no hero. */
export function PlacaConsultaMensagens({ consulta: c }: { consulta: Consulta }) {
  const { carteira, resultado } = c;
  if (!carteira) return null;
  return (
    <>
      {c.esgotado && (
        <p className="text-danger">Sem saldo para consultas. {c.podeRecarregar && <LinkRecarregar />}</p>
      )}
      {!c.esgotado && carteira.estado === 'CRITICO' && (
        <p className="text-amber-600 dark:text-amber-400">
          Saldo baixo ({formatCentavos(carteira.saldoCentavos)}). {c.podeRecarregar && <LinkRecarregar />}
        </p>
      )}
      {resultado && !resultado.encontrada && (
        <p className="text-ink-muted">Placa não encontrada — preencha manualmente (sem cobrança).</p>
      )}
      {resultado?.encontrada && resultado.placaJaCadastrada && (
        <p className="text-amber-600 dark:text-amber-400">
          Esta placa já está cadastrada na oficina — os dados foram preenchidos sem cobrança.
        </p>
      )}
      {resultado?.encontrada && !resultado.placaJaCadastrada && (
        <p className="flex items-center gap-1 text-green-700 dark:text-green-400">
          <Sparkles size={12} /> Dados automáticos — confira antes de salvar
          {c.totalCobradoCentavos > 0 && ` · cobrado ${formatCentavos(c.totalCobradoCentavos)}`}
        </p>
      )}
    </>
  );
}
