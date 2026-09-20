import { describe, expect, it } from 'vitest';
import { precisaRenovarLicencaManualmente, PRAZO_AVISO_RENOVACAO_LICENCA_DIAS } from './licenca';

describe('precisaRenovarLicencaManualmente', () => {
  it('is false for undefined licença', () => {
    expect(precisaRenovarLicencaManualmente(undefined)).toBe(false);
  });

  it('is false for a non-ATIVA status (TRIAL/EXPIRADA/CANCELADA have their own always-show rule elsewhere)', () => {
    expect(precisaRenovarLicencaManualmente({ status: 'TRIAL', diasRestantes: 0 })).toBe(false);
    expect(precisaRenovarLicencaManualmente({ status: 'EXPIRADA', diasRestantes: 0 })).toBe(false);
  });

  it('is false for an ATIVA subscription (proximaCobranca set), regardless of dias restantes', () => {
    expect(
      precisaRenovarLicencaManualmente({ status: 'ATIVA', proximaCobranca: '2026-10-01', diasRestantes: 0 }),
    ).toBe(false);
  });

  // Regressão principal: dias de sobra logo após um pagamento avulso bem
  // sucedido não deve disparar o aviso de renovação.
  it('is false for an ATIVA one-off plan with plenty of days left', () => {
    expect(precisaRenovarLicencaManualmente({ status: 'ATIVA', diasRestantes: 7 })).toBe(false);
  });

  it('is true for an ATIVA one-off plan at or below the threshold', () => {
    expect(
      precisaRenovarLicencaManualmente({ status: 'ATIVA', diasRestantes: PRAZO_AVISO_RENOVACAO_LICENCA_DIAS }),
    ).toBe(true);
    expect(precisaRenovarLicencaManualmente({ status: 'ATIVA', diasRestantes: 0 })).toBe(true);
  });

  it('treats a missing diasRestantes as 0 (needs renewal)', () => {
    expect(precisaRenovarLicencaManualmente({ status: 'ATIVA' })).toBe(true);
  });
});
