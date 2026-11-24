import { describe, expect, it } from 'vitest';
import { mascararChassi } from './chassi';

describe('mascararChassi', () => {
  it('mantém os 3 primeiros e os 4 últimos caracteres', () => {
    expect(mascararChassi('9BWZZZ377VT004251')).toBe('9BW••••••••••4251');
  });

  it('não mascara valores curtos nem vazios', () => {
    expect(mascararChassi('ABC1234')).toBe('ABC1234');
    expect(mascararChassi(undefined)).toBe('');
  });
});
