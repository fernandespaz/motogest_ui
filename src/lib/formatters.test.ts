import { describe, expect, it } from 'vitest';
import {
  formatCep,
  formatCnpj,
  formatCpf,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDocumento,
  formatPhone,
  getInitials,
  onlyDigits,
  toDateInputValue,
  toDateTimeLocalValue,
} from './formatters';

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
