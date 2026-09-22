import { describe, expect, it } from 'vitest';
import { PLANOS } from './pagamentoPlanos';

describe('PLANOS', () => {
  it('has a positive price for every plan and billing type, confirmed by the business team', () => {
    for (const plano of Object.values(PLANOS)) {
      expect(plano.valorMensal).toBeGreaterThan(0);
      expect(plano.valorAvulso).toBeGreaterThan(0);
    }
  });

  it('prices the one-off pedido above the equivalent subscription, so it never undercuts recurring revenue', () => {
    for (const plano of Object.values(PLANOS)) {
      expect(plano.valorAvulso).toBeGreaterThan(plano.valorMensal);
    }
  });

  it('prices each tier strictly above the previous one', () => {
    expect(PLANOS.PRO.valorMensal).toBeGreaterThan(PLANOS.BASICO.valorMensal);
    expect(PLANOS.PREMIUM.valorMensal).toBeGreaterThan(PLANOS.PRO.valorMensal);
  });

  it('marks exactly one plan as recomendado, for the comparison UI to highlight', () => {
    const recomendados = Object.values(PLANOS).filter((plano) => plano.recomendado);
    expect(recomendados).toHaveLength(1);
  });

  it('never lists a feature as both available today and "em breve"', () => {
    for (const plano of Object.values(PLANOS)) {
      const emBreve = new Set(plano.emBreve ?? []);
      for (const recurso of plano.recursos) {
        expect(emBreve.has(recurso)).toBe(false);
      }
    }
  });
});
