import { describe, expect, it } from 'vitest';
import {
  agendamentoStatusMeta,
  checklistSituacaoMeta,
  contaStatusMeta,
  licencaStatusMeta,
  metaFor,
  orcamentoStatusMeta,
  ordemServicoStatusMeta,
} from './statusMeta';

describe('metaFor', () => {
  it('returns em-dash/neutral when status is undefined', () => {
    expect(metaFor(agendamentoStatusMeta, undefined)).toEqual({ label: '—', tone: 'neutral' });
  });

  it('falls back to the raw status as label when unmapped, staying neutral', () => {
    expect(metaFor(agendamentoStatusMeta, 'ALGO_DESCONHECIDO')).toEqual({
      label: 'ALGO_DESCONHECIDO',
      tone: 'neutral',
    });
  });

  it('resolves a known status to its label/tone pair', () => {
    expect(metaFor(agendamentoStatusMeta, 'CONCLUIDO')).toEqual({ label: 'Concluído', tone: 'success' });
  });
});

describe('domain status maps', () => {
  it.each([
    ['agendamentoStatusMeta', agendamentoStatusMeta],
    ['orcamentoStatusMeta', orcamentoStatusMeta],
    ['ordemServicoStatusMeta', ordemServicoStatusMeta],
    ['contaStatusMeta', contaStatusMeta],
    ['licencaStatusMeta', licencaStatusMeta],
    ['checklistSituacaoMeta', checklistSituacaoMeta],
  ])('%s only uses the shared semantic tone palette', (_name, map) => {
    const allowedTones = ['neutral', 'brand', 'success', 'warning', 'danger'];
    for (const value of Object.values(map)) {
      expect(allowedTones).toContain(value.tone);
      expect(value.label.length).toBeGreaterThan(0);
    }
  });

  it('treats cancellation-like statuses consistently as danger', () => {
    expect(orcamentoStatusMeta.REJEITADO.tone).toBe('danger');
    expect(ordemServicoStatusMeta.CANCELADA.tone).toBe('danger');
    expect(contaStatusMeta.ATRASADO.tone).toBe('danger');
  });
});
