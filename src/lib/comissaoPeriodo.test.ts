import { describe, expect, it } from 'vitest';
import { periodoAtual, periodoDoMes, quintoDiaUtil, ultimosPeriodos } from './comissaoPeriodo';

const dia = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};

describe('quintoDiaUtil', () => {
  it('conta só de segunda a sexta', () => {
    // nov/2026 começa no domingo: 2,3,4,5,6 → sexta 6
    expect(quintoDiaUtil(dia('2026-11-15'))).toEqual(dia('2026-11-06'));
    // out/2026 começa na quinta: 1,2,5,6,7 → quarta 7
    expect(quintoDiaUtil(dia('2026-10-10'))).toEqual(dia('2026-10-07'));
  });
});

describe('periodoDoMes', () => {
  it('vai do dia seguinte ao fechamento anterior até o fechamento do mês', () => {
    expect(periodoDoMes(dia('2026-10-01'), 20)).toEqual({
      inicio: '2026-09-21',
      fim: '2026-10-20',
      pagamentoPrevisto: '2026-11-06',
    });
  });

  it('limita o dia de fechamento ao último dia do mês curto', () => {
    const p = periodoDoMes(dia('2027-02-10'), 31);
    expect(p.fim).toBe('2027-02-28');
    expect(p.inicio).toBe('2027-02-01');
  });

  it('atravessa a virada do ano', () => {
    const p = periodoDoMes(dia('2027-01-05'), 20);
    expect(p.inicio).toBe('2026-12-21');
    expect(p.fim).toBe('2027-01-20');
  });
});

describe('periodoAtual', () => {
  it('antes ou no dia de fechamento ainda é o período do mês', () => {
    expect(periodoAtual(dia('2026-10-20'), 20).fim).toBe('2026-10-20');
  });

  it('no próprio dia de fechamento, com hora, ainda é o período que fecha hoje', () => {
    expect(periodoAtual(new Date(2026, 9, 20, 15, 30), 20).fim).toBe('2026-10-20');
  });

  it('depois do fechamento já é o período que fecha no mês seguinte', () => {
    const p = periodoAtual(dia('2026-10-21'), 20);
    expect(p.inicio).toBe('2026-10-21');
    expect(p.fim).toBe('2026-11-20');
    expect(p.pagamentoPrevisto).toBe('2026-12-07');
  });
});

describe('ultimosPeriodos', () => {
  it('lista o atual primeiro e períodos contíguos', () => {
    const lista = ultimosPeriodos(dia('2026-10-29'), 20, 3);
    expect(lista.map((p) => p.fim)).toEqual(['2026-11-20', '2026-10-20', '2026-09-20']);
    expect(lista[1].inicio).toBe('2026-09-21');
  });
});
