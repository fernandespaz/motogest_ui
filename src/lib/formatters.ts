export function formatCurrency(value: number | undefined | null): string {
  if (value == null) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value: string | undefined | null): string {
  if (!value) return '—';
  // Date-only strings ("YYYY-MM-DD") must not go through Date parsing — that
  // reads them as UTC midnight and can shift a day back in western timezones.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

export function formatDateTime(value: string | undefined | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function formatDocumento(value: string, tipoPessoa: 'PF' | 'PJ'): string {
  return tipoPessoa === 'PJ' ? formatCnpj(value) : formatCpf(value);
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{0,4})$/, (_, a, b, c) => (c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`));
  }
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})$/, (_, a, b, c) => (c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`));
}

/** First letter of the first and last word — the standard "avatar" shorthand for a name. */
export function getInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function formatCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function toDateInputValue(value: string | undefined | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function toDateTimeLocalValue(value: string | undefined | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Minutos totais → "HH:MM" (ex.: 90 → "01:30"). Negativo vira "-HH:MM". */
export function formatMinutosParaHoras(minutos: number | undefined | null): string {
  const total = minutos ?? 0;
  const sinal = total < 0 ? '-' : '';
  const abs = Math.abs(Math.round(total));
  const horas = Math.floor(abs / 60);
  const mins = abs % 60;
  return `${sinal}${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** "H:MM" ou "HH:MM" → minutos totais (ex.: "1:30" → 90). `undefined` se o texto não for um horário válido. */
export function parseHorasParaMinutos(texto: string): number | undefined {
  const partes = texto.trim().split(':');
  if (partes.length !== 2) return undefined;
  const horas = Number(partes[0]);
  const mins = Number(partes[1]);
  if (!Number.isFinite(horas) || !Number.isFinite(mins) || horas < 0 || mins < 0 || mins > 59) return undefined;
  return horas * 60 + mins;
}

/** Mascara dígitos digitados livremente como "H:MM" (ex.: "130" → "1:30"). */
export function maskHorasInput(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '').slice(0, 5);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, -2)}:${digitos.slice(-2)}`;
}

/** Agrupa os dígitos do número do cartão em blocos de 4 (ex.: "4111111111111111" → "4111 1111 1111 1111"). */
export function formatCardNumber(value: string): string {
  const digits = onlyDigits(value).slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/** Mascara a validade do cartão como "MM/AA" (ex.: "1228" → "12/28"). */
export function formatCardExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
