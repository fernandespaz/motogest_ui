import { onlyDigits } from './formatters';

/** CPF com os dois dígitos verificadores corretos (e não uma sequência repetida tipo 111.111.111-11). */
export function isCpfValido(valor: string): boolean {
  const d = onlyDigits(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(d[tamanho])) return false;
  }
  return true;
}

/** PIS/PASEP/NIT: 11 dígitos, último é o verificador (pesos 3,2,9,8,7,6,5,4,3,2). */
export function isPisValido(valor: string): boolean {
  const d = onlyDigits(valor);
  if (d.length !== 11) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = pesos.reduce((acc, p, i) => acc + p * Number(d[i]), 0);
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === Number(d[10]);
}

/** Formata PIS/PASEP no padrão 000.00000.00-0. */
export function formatPis(valor: string): string {
  const d = onlyDigits(valor).slice(0, 11);
  return d.replace(/^(\d{0,3})(\d{0,5})(\d{0,2})(\d{0,1})$/, (_, a, b, c, e) =>
    [a, b && `.${b}`, c && `.${c}`, e && `-${e}`].filter(Boolean).join(''),
  );
}
