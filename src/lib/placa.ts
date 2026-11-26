/** Placa antiga (ABC1234) ou Mercosul (ABC1D23) — mesmo formato validado no backend. */
const FORMATO_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

/** Maiúsculas, sem hífen/espaço: `abc-1d23` e `ABC1D23` são a mesma placa (e a mesma chave de cache no backend). */
export function normalizarPlaca(valor: string | undefined | null): string {
  return (valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function placaValida(valor: string | undefined | null): boolean {
  return FORMATO_PLACA.test(normalizarPlaca(valor));
}
