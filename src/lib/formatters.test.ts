import { describe, expect, it } from 'vitest';
import {
  formatCardExpiry,
  formatCardNumber,
  formatCep,
  formatCnpj,
  formatCpf,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDocumento,
  formatMinutosParaHoras,
  formatPhone,
  getInitials,
  maskHorasInput,
  onlyDigits,
  parseHorasParaMinutos,
  toDateInputValue,
  toDateTimeLocalValue,
  formatPercent,
  formatHorasDecimais,
  formatDuracao,
  mesReferenciaAtual,
  deslocarMesReferencia,
  formatMesReferencia,
} from './formatters';

describe('indicadores de produtividade', () => {
  it('formatPercent shows one decimal in pt-BR and "—" when there is no base', () => {
    expect(formatPercent(42.5)).toBe('42,5%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formatHorasDecimais', () => {
    expect(formatHorasDecimais(12.5)).toBe('12,5 h');
    expect(formatHorasDecimais(undefined)).toBe('—');
  });

  it('formatDuracao reads naturally at every scale', () => {
    expect(formatDuracao(45)).toBe('45min');
    expect(formatDuracao(120)).toBe('2h');
    expect(formatDuracao(135)).toBe('2h 15min');
    expect(formatDuracao(1440)).toBe('1d');
    expect(formatDuracao(1580)).toBe('1d 2h');
    expect(formatDuracao(null)).toBe('—');
  });

  it('month reference helpers roll over years', () => {
    expect(mesReferenciaAtual(new Date(2026, 8, 22))).toBe('2026-09');
    expect(deslocarMesReferencia('2026-01', -1)).toBe('2025-12');
    expect(deslocarMesReferencia('2025-12', 1)).toBe('2026-01');
    expect(formatMesReferencia('2026-09')).toBe('Setembro de 2026');
  });
});

describe('formatCurrency', () => {
  it('formats a positive value as BRL', () => {
    expect(formatCurrency(1234.5)).toBe((1234.5).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  });

  it('falls back to R$ 0,00 for null/undefined', () => {
    expect(formatCurrency(null)).toBe('R$ 0,00');
    expect(formatCurrency(undefined)).toBe('R$ 0,00');
  });
});

describe('formatDate', () => {
  it('formats a date-only string without shifting a day back', () => {
    expect(formatDate('2026-01-05')).toBe('05/01/2026');
  });

  it('formats a full ISO datetime string', () => {
    expect(formatDate('2026-01-05T10:00:00Z')).toMatch(/\d{2}\/\d{2}\/2026/);
  });

  it('returns em-dash for empty/invalid input', () => {
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('returns em-dash for empty/invalid input', () => {
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });

  it('formats a valid datetime', () => {
    expect(formatDateTime('2026-01-05T10:00:00Z')).toContain('2026');
  });
});

describe('onlyDigits', () => {
  it('strips every non-digit character', () => {
    expect(onlyDigits('98.765.432/0001-88')).toBe('98765432000188');
    expect(onlyDigits('(11) 91234-5678')).toBe('11912345678');
  });
});

describe('formatCnpj', () => {
  it('masks a full 14-digit CNPJ', () => {
    expect(formatCnpj('98765432000188')).toBe('98.765.432/0001-88');
  });

  it('ignores extra digits beyond 14', () => {
    expect(formatCnpj('987654320001889999')).toBe('98.765.432/0001-88');
  });
});

describe('formatCpf', () => {
  it('masks a full 11-digit CPF', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01');
  });
});

describe('formatDocumento', () => {
  it('routes to formatCpf for PF', () => {
    expect(formatDocumento('12345678901', 'PF')).toBe(formatCpf('12345678901'));
  });

  it('routes to formatCnpj for PJ', () => {
    expect(formatDocumento('98765432000188', 'PJ')).toBe(formatCnpj('98765432000188'));
  });
});

describe('formatPhone', () => {
  it('masks a landline (10 digits)', () => {
    expect(formatPhone('1130001111')).toBe('(11) 3000-1111');
  });

  it('masks a mobile (11 digits)', () => {
    expect(formatPhone('11912345678')).toBe('(11) 91234-5678');
  });

  it('omits the trailing dash while the last group is still being typed', () => {
    expect(formatPhone('113000')).toBe('(11) 3000');
  });
});

describe('formatCep', () => {
  it('masks a full 8-digit CEP', () => {
    expect(formatCep('01310100')).toBe('01310-100');
  });

  it('ignores extra digits beyond 8', () => {
    expect(formatCep('013101009999')).toBe('01310-100');
  });

  it('leaves a partial CEP unmasked', () => {
    expect(formatCep('0131')).toBe('0131');
  });
});

describe('getInitials', () => {
  it('takes the first letter of the first and last word', () => {
    expect(getInitials('Marcos Vinícius Andrade')).toBe('MA');
  });

  it('uses the first two letters of a single-word name', () => {
    expect(getInitials('Madonna')).toBe('MA');
  });

  it('falls back to "?" for an empty name', () => {
    expect(getInitials('  ')).toBe('?');
  });
});

describe('toDateInputValue', () => {
  it('truncates an ISO datetime to YYYY-MM-DD', () => {
    expect(toDateInputValue('2026-01-05T10:00:00Z')).toBe('2026-01-05');
  });

  it('returns empty string for nullish input', () => {
    expect(toDateInputValue(undefined)).toBe('');
    expect(toDateInputValue(null)).toBe('');
  });
});

describe('toDateTimeLocalValue', () => {
  it('returns empty string for nullish/invalid input', () => {
    expect(toDateTimeLocalValue(undefined)).toBe('');
    expect(toDateTimeLocalValue('not-a-date')).toBe('');
  });

  it('formats a valid datetime as datetime-local value', () => {
    expect(toDateTimeLocalValue('2026-01-05T10:30:00')).toBe('2026-01-05T10:30');
  });
});

describe('formatMinutosParaHoras', () => {
  it('formats minutes as HH:MM', () => {
    expect(formatMinutosParaHoras(90)).toBe('01:30');
    expect(formatMinutosParaHoras(0)).toBe('00:00');
  });

  it('falls back to 00:00 for nullish input', () => {
    expect(formatMinutosParaHoras(undefined)).toBe('00:00');
    expect(formatMinutosParaHoras(null)).toBe('00:00');
  });

  it('prefixes negative totals (tempo estourado) with a minus sign', () => {
    expect(formatMinutosParaHoras(-45)).toBe('-00:45');
  });

  it('rounds a fractional minute count before splitting hours/minutes', () => {
    expect(formatMinutosParaHoras(90.6)).toBe('01:31');
  });
});

describe('parseHorasParaMinutos', () => {
  it('parses "H:MM" and "HH:MM" into total minutes', () => {
    expect(parseHorasParaMinutos('1:30')).toBe(90);
    expect(parseHorasParaMinutos('01:30')).toBe(90);
  });

  it('returns undefined for text with no colon-separated parts', () => {
    expect(parseHorasParaMinutos('130')).toBeUndefined();
    expect(parseHorasParaMinutos('')).toBeUndefined();
  });

  it('returns undefined for an out-of-range minutes component', () => {
    expect(parseHorasParaMinutos('1:60')).toBeUndefined();
    expect(parseHorasParaMinutos('1:-5')).toBeUndefined();
  });

  it('returns undefined for a non-numeric component', () => {
    expect(parseHorasParaMinutos('a:30')).toBeUndefined();
  });
});

describe('maskHorasInput', () => {
  it('leaves up to two digits unmasked', () => {
    expect(maskHorasInput('1')).toBe('1');
    expect(maskHorasInput('13')).toBe('13');
  });

  it('inserts a colon before the last two digits once a third digit is typed', () => {
    expect(maskHorasInput('130')).toBe('1:30');
    expect(maskHorasInput('0130')).toBe('01:30');
  });

  it('strips non-digit characters and caps at 5 digits', () => {
    expect(maskHorasInput('1:30')).toBe('1:30');
    expect(maskHorasInput('123456')).toBe('123:45');
  });
});

describe('formatCardNumber', () => {
  it('groups digits in blocks of 4', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
  });

  it('strips non-digit characters and caps at 19 digits', () => {
    expect(formatCardNumber('4111-1111-1111-1111999')).toBe('4111 1111 1111 1111 999');
  });

  it('does not add a trailing space right after a complete block', () => {
    expect(formatCardNumber('41111111')).toBe('4111 1111');
  });
});

describe('formatCardExpiry', () => {
  it('leaves up to two digits unmasked', () => {
    expect(formatCardExpiry('1')).toBe('1');
    expect(formatCardExpiry('12')).toBe('12');
  });

  it('inserts a slash after the month once a third digit is typed', () => {
    expect(formatCardExpiry('1228')).toBe('12/28');
  });

  it('strips non-digit characters and caps at 4 digits', () => {
    expect(formatCardExpiry('12/2028')).toBe('12/20');
  });
});
