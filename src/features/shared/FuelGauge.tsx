import { NIVEIS_COMBUSTIVEL, rotuloCombustivel, type NivelCombustivel } from '@/lib/combustivel';

interface FuelGaugeProps {
  value: number | null | undefined;
  onChange?: (valor: NivelCombustivel) => void;
  disabled?: boolean;
  label?: string;
}

const CX = 100;
const CY = 100;
const R_EXT = 90;
const R_INT = 62;
// Ângulos (graus, 180 = esquerda/E, 0 = direita/F) onde cada setor termina.
// O ponteiro de cada nível aponta pro centro do seu setor nas marcas 180/135/90/45/0.
const LIMITES = [180, 157.5, 112.5, 67.5, 22.5, 0];
const ANGULO_PONTEIRO = [180, 135, 90, 45, 0];

function ponto(raio: number, grau: number) {
  const rad = (grau * Math.PI) / 180;
  return { x: CX + raio * Math.cos(rad), y: CY - raio * Math.sin(rad) };
}

function setor(de: number, ate: number) {
  const a = ponto(R_EXT, de);
  const b = ponto(R_EXT, ate);
  const c = ponto(R_INT, ate);
  const d = ponto(R_INT, de);
  return `M${a.x} ${a.y} A${R_EXT} ${R_EXT} 0 0 1 ${b.x} ${b.y} L${c.x} ${c.y} A${R_INT} ${R_INT} 0 0 0 ${d.x} ${d.y}Z`;
}

/** Marcador de combustível clicável — cada faixa colorida seleciona o nível do tanque. */
export function FuelGauge({ value, onChange, disabled, label = 'Combustível' }: FuelGaugeProps) {
  const indice = NIVEIS_COMBUSTIVEL.findIndex((n) => n.valor === value);
  const selecionado = indice >= 0;
  const ponteiro = ponto(R_EXT - 8, selecionado ? ANGULO_PONTEIRO[indice] : 90);
  const interativo = !!onChange && !disabled;

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <svg viewBox="0 0 200 128" className="w-full max-w-[260px]" role="radiogroup" aria-label={label}>
        {NIVEIS_COMBUSTIVEL.map((nivel, i) => {
          const ativo = i === indice;
          return (
            <path
              key={nivel.valor}
              d={setor(LIMITES[i], LIMITES[i + 1])}
              fill={nivel.cor}
              opacity={selecionado && !ativo ? 0.35 : 1}
              stroke="var(--color-surface, #fff)"
              strokeWidth={2}
              role="radio"
              aria-checked={ativo}
              aria-label={nivel.rotulo}
              aria-disabled={!interativo}
              tabIndex={interativo && (ativo || (!selecionado && i === 0)) ? 0 : -1}
              className={interativo ? 'cursor-pointer outline-none focus-visible:stroke-ink' : undefined}
              onClick={interativo ? () => onChange(nivel.valor) : undefined}
              onKeyDown={
                interativo
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onChange(nivel.valor);
                      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        onChange(NIVEIS_COMBUSTIVEL[Math.min(i + 1, NIVEIS_COMBUSTIVEL.length - 1)].valor);
                      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        onChange(NIVEIS_COMBUSTIVEL[Math.max(i - 1, 0)].valor);
                      }
                    }
                  : undefined
              }
            />
          );
        })}
        {selecionado && (
          <line
            x1={CX}
            y1={CY}
            x2={ponteiro.x}
            y2={ponteiro.y}
            stroke="#e11d1d"
            strokeWidth={3}
            strokeLinecap="round"
            style={{ pointerEvents: 'none' }}
          />
        )}
        <circle cx={CX} cy={CY} r={9} fill="currentColor" className="text-ink" style={{ pointerEvents: 'none' }} />
        <text x={CX - R_EXT + 12} y={CY + 18} textAnchor="middle" className="fill-ink-muted text-[11px] font-semibold">
          E
        </text>
        <text x={CX + R_EXT - 12} y={CY + 18} textAnchor="middle" className="fill-ink-muted text-[11px] font-semibold">
          F
        </text>
      </svg>
      <p className="-mt-1 text-sm font-semibold text-ink" aria-live="polite">
        {rotuloCombustivel(value) ?? 'Não informado'}
      </p>
    </div>
  );
}
