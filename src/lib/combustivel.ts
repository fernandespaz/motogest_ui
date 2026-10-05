/** Nível do tanque em % — cinco marcas, como no marcador do painel (E · 1/4 · 1/2 · 3/4 · F). */
export const NIVEIS_COMBUSTIVEL = [
  { valor: 0, curto: 'E', rotulo: 'Reserva', cor: '#e11d1d' },
  { valor: 25, curto: '1/4', rotulo: '1/4', cor: '#f97316' },
  { valor: 50, curto: '1/2', rotulo: '1/2', cor: '#f5a800' },
  { valor: 75, curto: '3/4', rotulo: '3/4', cor: '#9acd32' },
  { valor: 100, curto: 'F', rotulo: 'Cheio', cor: '#2f9e2f' },
] as const;

export type NivelCombustivel = (typeof NIVEIS_COMBUSTIVEL)[number]['valor'];

export function ehNivelCombustivel(valor: unknown): valor is NivelCombustivel {
  return NIVEIS_COMBUSTIVEL.some((n) => n.valor === valor);
}

/** Texto impresso/exibido ("1/2"); undefined quando não informado ou valor fora das marcas. */
export function rotuloCombustivel(valor: number | null | undefined): string | undefined {
  return NIVEIS_COMBUSTIVEL.find((n) => n.valor === valor)?.rotulo;
}
