import { describe, it, expect } from 'vitest';
import { isSenhaForte } from './senha';

describe('isSenhaForte', () => {
  it('accepts 8+ chars with an uppercase letter and a special character', () => {
    expect(isSenhaForte('Abcdef@1')).toBe(true);
  });

  it.each([
    ['too short', 'Ab@1'],
    ['no uppercase', 'abcdef@123'],
    ['no special character', 'Abcdef1234'],
    ['whitespace is not special', 'Abc def 12'],
  ])('rejects a password that is %s', (_, senha) => {
    expect(isSenhaForte(senha)).toBe(false);
  });
});
