import { describe, expect, it } from 'vitest';
import type { ComissaoResponse } from '@/api/types';
import { agruparPorFuncionario, totaisDoPeriodo } from './comissoesAgrupadas';

const c = (over: Partial<ComissaoResponse>): ComissaoResponse => ({
  id: 1,
  ordemServicoId: 1,
  ordemServicoNumero: 'OS-1',
  usuarioId: 1,
  usuarioNome: 'Ana',
  papel: 'MECANICO',
  baseCalculo: 100,
  percentual: 10,
  valor: 10,
  status: 'PENDENTE',
  dataGeracao: '2026-10-01T10:00:00',
  dataPagamento: null,
  contaPagarId: null,
  ...over,
});

describe('agruparPorFuncionario', () => {
  it('soma a pagar e pago por funcionário, conta OS distintas e ordena por maior a pagar', () => {
    const grupos = agruparPorFuncionario([
      c({ id: 1, usuarioId: 1, usuarioNome: 'Ana', valor: 10.1 }),
      c({ id: 2, usuarioId: 1, usuarioNome: 'Ana', valor: 20.2, ordemServicoId: 2, status: 'PAGA' }),
      c({ id: 3, usuarioId: 1, usuarioNome: 'Ana', valor: 5, papel: 'CONSULTOR' }), // mesma OS, outro papel
      c({ id: 4, usuarioId: 2, usuarioNome: 'Bia', valor: 90, ordemServicoId: 3 }),
    ]);

    expect(grupos.map((g) => g.usuarioNome)).toEqual(['Bia', 'Ana']);
    expect(grupos[1]).toMatchObject({ totalAPagar: 15.1, totalPago: 20.2, quantidadeOs: 2 });
  });

  it('as OS de cada funcionário vêm da mais recente para a mais antiga', () => {
    const [g] = agruparPorFuncionario([
      c({ id: 1, dataGeracao: '2026-10-01T10:00:00' }),
      c({ id: 2, dataGeracao: '2026-10-09T10:00:00' }),
    ]);
    expect(g.comissoes.map((x) => x.id)).toEqual([2, 1]);
  });
});

describe('totaisDoPeriodo', () => {
  it('soma sem erro de ponto flutuante', () => {
    const grupos = agruparPorFuncionario([c({ valor: 0.1 }), c({ id: 2, valor: 0.2, usuarioId: 2, usuarioNome: 'Bia' })]);
    expect(totaisDoPeriodo(grupos)).toEqual({ aPagar: 0.3, pago: 0, total: 0.3 });
  });
});
