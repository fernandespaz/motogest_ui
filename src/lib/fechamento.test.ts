import { describe, expect, it } from 'vitest';
import { erroDePeriodoFechado, minimoAposMuro } from './fechamento';

describe('fechamento helpers', () => {
  it('the first free date is the day after the wall, even across month ends', () => {
    expect(minimoAposMuro('2026-09-30')).toBe('2026-10-01');
    expect(minimoAposMuro(undefined)).toBeUndefined();
  });

  it('flags dates up to and including the wall, and only those', () => {
    expect(erroDePeriodoFechado('2026-09-20', '2026-09-20')).toContain('20/09/2026');
    expect(erroDePeriodoFechado('2026-09-21', '2026-09-20')).toBeUndefined();
    expect(erroDePeriodoFechado('2020-01-01', undefined)).toBeUndefined();
  });
});
