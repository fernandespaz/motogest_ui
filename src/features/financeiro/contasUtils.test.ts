import { describe, expect, it } from 'vitest';
import {
  diasParaVencimento,
  filtrarContas,
  ordenarPorVencimento,
  periodoDeFechamento,
  previaDoLote,
  resumirPorSituacao,
  situacaoDaConta,
  textoVencimento,
} from './contasUtils';

const HOJE = new Date(2026, 9, 18, 15, 0, 0); // 18/10/2026

describe('situacaoDaConta', () => {
  it('classifies pending accounts by how far the due date is from today', () => {
    expect(situacaoDaConta({ status: 'PENDENTE', dataVencimento: '2026-10-17' }, HOJE)).toBe('vencida');
    expect(situacaoDaConta({ status: 'PENDENTE', dataVencimento: '2026-10-18' }, HOJE)).toBe('vence-hoje');
    expect(situacaoDaConta({ status: 'PENDENTE', dataVencimento: '2026-10-19' }, HOJE)).toBe('a-vencer');
  });

  it('treats a past-due PENDENTE as vencida even when the backend has not flipped it to ATRASADO', () => {
    expect(situacaoDaConta({ status: 'PENDENTE', dataVencimento: '2026-09-01' }, HOJE)).toBe('vencida');
    expect(situacaoDaConta({ status: 'ATRASADO', dataVencimento: '2026-12-01' }, HOJE)).toBe('vencida');
  });

  it('never calls a settled or cancelled account vencida, whatever its date', () => {
    expect(situacaoDaConta({ status: 'PAGO', dataVencimento: '2020-01-01' }, HOJE)).toBe('quitada');
    expect(situacaoDaConta({ status: 'RECEBIDO', dataVencimento: '2020-01-01' }, HOJE)).toBe('quitada');
    expect(situacaoDaConta({ status: 'CANCELADO', dataVencimento: '2020-01-01' }, HOJE)).toBe('cancelada');
  });
});

describe('diasParaVencimento / textoVencimento', () => {
  it('counts calendar days, ignoring the time of day', () => {
    expect(diasParaVencimento({ dataVencimento: '2026-10-28' }, HOJE)).toBe(10);
    expect(diasParaVencimento({ dataVencimento: '2026-10-15' }, HOJE)).toBe(-3);
    expect(diasParaVencimento({}, HOJE)).toBeUndefined();
  });

  it('words the distance for humans', () => {
    expect(textoVencimento(0)).toBe('vence hoje');
    expect(textoVencimento(1)).toBe('vence amanhã');
    expect(textoVencimento(10)).toBe('em 10 dias');
    expect(textoVencimento(-1)).toBe('venceu ontem');
    expect(textoVencimento(-3)).toBe('há 3 dias');
    expect(textoVencimento(undefined)).toBe('');
  });
});

describe('resumirPorSituacao', () => {
  it('counts and sums each situation plus the total', () => {
    const resumo = resumirPorSituacao(
      [
        { status: 'PENDENTE', dataVencimento: '2026-10-10', valor: 100 },
        { status: 'PENDENTE', dataVencimento: '2026-10-11', valor: 50 },
        { status: 'PENDENTE', dataVencimento: '2026-10-30', valor: 300 },
        { status: 'PAGO', dataVencimento: '2026-10-01', valor: 70 },
      ],
      HOJE,
    );
    expect(resumo.vencida).toEqual({ quantidade: 2, valor: 150 });
    expect(resumo['a-vencer']).toEqual({ quantidade: 1, valor: 300 });
    expect(resumo.quitada).toEqual({ quantidade: 1, valor: 70 });
    expect(resumo.todas).toEqual({ quantidade: 4, valor: 520 });
  });
});

describe('filtrarContas', () => {
  const contas = [
    { id: 1, descricao: 'Aluguel da oficina', status: 'PENDENTE', dataVencimento: '2026-10-10', valor: 900, fornecedor: 'Imobiliária Sol' },
    { id: 2, descricao: 'Peças — Veloz', status: 'PENDENTE', dataVencimento: '2026-10-28', valor: 350, fornecedor: 'Auto Peças Veloz' },
    { id: 3, descricao: 'Energia', status: 'PAGO', dataVencimento: '2026-10-05', valor: 200, fornecedor: 'Enel' },
  ];
  const fornecedor = (c: (typeof contas)[number]) => c.fornecedor;
  const todas = { situacao: 'todas' as const, termo: '' };

  it('filters by situation', () => {
    expect(filtrarContas(contas, { ...todas, situacao: 'vencida' }, fornecedor, HOJE).map((c) => c.id)).toEqual([1]);
    expect(filtrarContas(contas, { ...todas, situacao: 'quitada' }, fornecedor, HOJE).map((c) => c.id)).toEqual([3]);
  });

  it('searches the description and the counterpart ignoring accents and case', () => {
    expect(filtrarContas(contas, { ...todas, termo: 'PECAS' }, fornecedor, HOJE).map((c) => c.id)).toEqual([2]);
    expect(filtrarContas(contas, { ...todas, termo: 'imobiliaria' }, fornecedor, HOJE).map((c) => c.id)).toEqual([1]);
  });

  it('filters by an inclusive due-date range', () => {
    const r = filtrarContas(contas, { ...todas, inicio: '2026-10-05', fim: '2026-10-10' }, fornecedor, HOJE);
    expect(r.map((c) => c.id)).toEqual([1, 3]);
  });
});

describe('ordenarPorVencimento', () => {
  it('puts the oldest due date first and accounts without a date last, without mutating the input', () => {
    const entrada = [{ dataVencimento: '2026-11-01' }, {}, { dataVencimento: '2026-10-01' }];
    expect(ordenarPorVencimento(entrada)).toEqual([{ dataVencimento: '2026-10-01' }, { dataVencimento: '2026-11-01' }, {}]);
    expect(entrada[0].dataVencimento).toBe('2026-11-01');
  });
});

describe('previaDoLote (espelha LoteContas do backend)', () => {
  it('repeats the same value every month keeping the due day, clamping to the end of short months', () => {
    const previa = previaDoLote(120, '2026-10-31', 'MENSAL', 3);
    expect(previa.map((p) => p.vencimento)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31']);
    expect(previa.map((p) => p.valor)).toEqual([120, 120, 120]);
    expect(previa.map((p) => `${p.numero}/${p.total}`)).toEqual(['1/3', '2/3', '3/3']);
  });

  it('splits the total into exact cents, leaving the rounding difference on the last installment', () => {
    const previa = previaDoLote(100, '2026-11-05', 'PARCELADO', 3);
    expect(previa.map((p) => p.valor)).toEqual([33.33, 33.33, 33.34]);
    expect(previa.reduce((soma, p) => soma + Math.round(p.valor * 100), 0)).toBe(10000);
  });

  it('crosses the year boundary', () => {
    const previa = previaDoLote(1000, '2026-11-10', 'PARCELADO', 4);
    expect(previa.map((p) => p.vencimento)).toEqual(['2026-11-10', '2026-12-10', '2027-01-10', '2027-02-10']);
  });
});

describe('periodoDeFechamento', () => {
  it('puts a date before or on the closing day in the period that closes this month', () => {
    expect(periodoDeFechamento(20, new Date(2026, 9, 18))).toEqual({ inicio: '2026-09-21', fim: '2026-10-20' });
    expect(periodoDeFechamento(20, new Date(2026, 9, 20))).toEqual({ inicio: '2026-09-21', fim: '2026-10-20' });
  });

  it('moves to the next period the day after closing', () => {
    expect(periodoDeFechamento(20, new Date(2026, 9, 21))).toEqual({ inicio: '2026-10-21', fim: '2026-11-20' });
    expect(periodoDeFechamento(20, new Date(2026, 11, 28))).toEqual({ inicio: '2026-12-21', fim: '2027-01-20' });
  });

  it('handles January (previous period starts in December of the previous year)', () => {
    expect(periodoDeFechamento(20, new Date(2027, 0, 10))).toEqual({ inicio: '2026-12-21', fim: '2027-01-20' });
  });

  it('clamps a closing day that does not exist in a short month', () => {
    // fechamento dia 31: janeiro fecha dia 31, fevereiro/2027 fecha dia 28, e o período de março começa em 01/03
    expect(periodoDeFechamento(31, new Date(2027, 1, 10))).toEqual({ inicio: '2027-02-01', fim: '2027-02-28' });
    expect(periodoDeFechamento(31, new Date(2027, 2, 5))).toEqual({ inicio: '2027-03-01', fim: '2027-03-31' });
  });
});
