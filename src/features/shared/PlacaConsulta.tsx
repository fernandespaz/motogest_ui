import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCentavos } from '@/lib/formatters';
import { PlacaConsultaMensagens } from './PlacaConsultaMensagens';
import { usePlacaConsulta, type DadosPlaca } from './usePlacaConsulta';

export type { DadosPlaca };

/**
 * Botão compacto de consulta de placa, para os formulários onde o veículo é um
 * item entre vários (veículos dentro do cadastro de cliente). O cadastro de
 * veículo em si usa o hero (PlacaHero). Sempre sob demanda; se a feature
 * estiver desligada ou sem saldo, o bloco some ou degrada e o cadastro manual
 * segue exatamente como antes.
 */
export function PlacaConsulta({
  placa,
  chassiPreenchido,
  onDados,
}: {
  placa: string | undefined;
  /** Esconde "Buscar chassi" quando o campo já tem valor. */
  chassiPreenchido?: boolean;
  /** Recebe os dados encontrados; quem chama decide o que preencher (nunca sobrescrever o digitado). */
  onDados: (dados: DadosPlaca) => void;
}) {
  const c = usePlacaConsulta(placa, onDados);
  if (!c.disponivel || !c.carteira) return null;
  const { carteira, resultado } = c;

  return (
    <div className="mt-1 flex flex-col gap-1 text-xs" data-testid="placa-consulta">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!c.valida || c.ocupado || c.esgotado}
        onClick={c.buscar}
        title={c.valida ? undefined : 'Digite uma placa válida (ABC1234 ou ABC1D23)'}
      >
        {c.buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        Buscar dados da placa
        <span className="text-ink-muted">({formatCentavos(carteira.precoConsultaCentavos)})</span>
      </Button>

      <PlacaConsultaMensagens consulta={c} />

      {resultado?.encontrada && !resultado.placaJaCadastrada && !chassiPreenchido && (
        <Button type="button" size="sm" variant="ghost" disabled={c.ocupado} onClick={c.buscarChassi}>
          {c.buscandoChassi && <Loader2 size={14} className="animate-spin" />}
          Buscar chassi ({formatCentavos(carteira.precoChassiCentavos)})
        </Button>
      )}
    </div>
  );
}
