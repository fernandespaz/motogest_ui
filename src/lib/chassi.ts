/**
 * Máscara do chassi para exibição: mantém os 3 primeiros caracteres (WMI, que
 * identifica o fabricante) e os 4 últimos, escondendo o miolo. Chassis curtos
 * demais para mascarar (≤ 7) são devolvidos como estão.
 */
export function mascararChassi(chassi: string | undefined | null): string {
  const valor = (chassi ?? '').trim();
  if (valor.length <= 7) return valor;
  return `${valor.slice(0, 3)}${'•'.repeat(valor.length - 7)}${valor.slice(-4)}`;
}
