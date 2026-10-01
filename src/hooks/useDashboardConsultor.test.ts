import { describe, expect, it } from 'vitest';
import type { OrcamentoResponse, OrdemServicoResponse } from '@/api/types';
import { resumirCarteiraConsultor } from './useDashboardConsultor';

const orc = (o: Partial<OrcamentoResponse>) => o as OrcamentoResponse;
const os = (o: Partial<OrdemServicoResponse>) => o as OrdemServicoResponse;

describe('resumirCarteiraConsultor', () => {
  const orcamentos = [
    orc({ id: 1, consultorId: 7, status: 'ENVIADO', clienteId: 100, dataEmissao: '2026-09-20T10:00:00' }),
    orc({ id: 2, consultorId: 7, status: 'ENVIADO', clienteId: 101, dataEmissao: '2026-09-10T10:00:00' }),
    orc({ id: 3, consultorId: 7, status: 'APROVADO', clienteId: 100 }),
    orc({ id: 4, consultorId: 7, status: 'RASCUNHO', clienteId: 102 }),
    orc({ id: 5, consultorId: 8, status: 'ENVIADO', clienteId: 200 }),
  ];
  const ordens = [
    os({ id: 10, consultorId: 7, status: 'EM_ANDAMENTO', clienteId: 103 }),
    os({ id: 11, consultorId: 7, status: 'CONCLUIDA', clienteId: 100 }),
    os({ id: 12, consultorId: 7, status: 'ENTREGUE', clienteId: 104, dataConclusao: '2026-09-10T10:00:00' }),
    os({ id: 13, consultorId: 8, status: 'EM_ANDAMENTO', clienteId: 200 }),
    os({ id: 14, consultorId: 7, status: 'FATURADO', clienteId: 105 }),
    os({ id: 15, consultorId: 7, status: 'ENTREGUE', clienteId: 106, dataConclusao: '2026-09-15T10:00:00' }),
  ];

  it('keeps only the consultor’s own records, never a colleague’s', () => {
    const c = resumirCarteiraConsultor(orcamentos, ordens, 7);
    expect(c.aguardandoCliente.map((o) => o.id)).not.toContain(5);
    expect(c.osEmExecucao.map((o) => o.id)).toEqual([10]);
  });

  it('lists the quotes waiting longest first, so follow-up starts with them', () => {
    const c = resumirCarteiraConsultor(orcamentos, ordens, 7);
    expect(c.aguardandoCliente.map((o) => o.id)).toEqual([2, 1]);
  });

  it('splits approved-without-OS from ready-to-invoice', () => {
    const c = resumirCarteiraConsultor(orcamentos, ordens, 7);
    expect(c.aprovadosSemOs.map((o) => o.id)).toEqual([3]);
    expect(c.osProntasParaFaturar.map((o) => o.id)).toEqual([11]);
  });

  // Regra de negócio: o veículo só é liberado depois de pago. Concluída (11)
  // ainda precisa passar pelo caixa — só Faturada (14) está pronta pra
  // entrega física; elas nunca aparecem juntas na mesma lista.
  it('keeps ready-to-invoice (Concluída) and ready-for-delivery (Faturado) as separate buckets', () => {
    const c = resumirCarteiraConsultor(orcamentos, ordens, 7);
    expect(c.osProntasParaFaturar.map((o) => o.id)).toEqual([11]);
    expect(c.osProntasParaEntrega.map((o) => o.id)).toEqual([14]);
  });

  it('counts distinct clients across quotes and OS as the portfolio', () => {
    // 100, 101, 102 (orçamentos) + 103, 104, 105, 106 (OS) — 100 repetido conta uma vez
    expect(resumirCarteiraConsultor(orcamentos, ordens, 7).clientesNaCarteira).toBe(7);
  });

  // Não existe filtro de período no backend (nem campo de data de entrega) —
  // isto é só o recorte recente ordenado, não um fechamento mensal de verdade.
  it('lists delivered OS most recently concluded first', () => {
    const c = resumirCarteiraConsultor(orcamentos, ordens, 7);
    expect(c.osEntregues.map((o) => o.id)).toEqual([15, 12]);
  });
});
