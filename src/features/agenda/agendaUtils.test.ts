import { describe, expect, it } from 'vitest';
import type { AgendamentoResponse, OrcamentoResponse, OrdemServicoResponse } from '@/api/types';
import {
  FILTROS_VAZIOS,
  agruparPorDia,
  contaCarga,
  intervaloDaVisao,
  montarCards,
  montarItens,
  nivelCarga,
  proximoPasso,
  statusEfetivo,
} from './agendaUtils';

const hoje = new Date();
hoje.setHours(10, 0, 0, 0);
const HOJE = hoje.toISOString();
const amanha = new Date(hoje.getTime() + 24 * 3600 * 1000).toISOString();

const ag = (o: Partial<AgendamentoResponse>): AgendamentoResponse => ({
  id: 1,
  clienteNome: 'Ana',
  veiculoId: 10,
  veiculoPlaca: 'ABC1D23',
  dataHora: HOJE,
  status: 'AGENDADO',
  ...o,
});
const orc = (o: Partial<OrcamentoResponse>): OrcamentoResponse => ({ id: 50, agendamentoId: 1, status: 'RASCUNHO', ...o });
const os = (o: Partial<OrdemServicoResponse>): OrdemServicoResponse => ({
  id: 100,
  numero: 'OS-1',
  veiculoId: 10,
  status: 'EM_ANDAMENTO',
  usuarioResponsavelId: 7,
  usuarioResponsavelNome: 'Zé',
  dataAbertura: HOJE,
  ...o,
});

describe('nivelCarga', () => {
  it('classifica pela fração da capacidade', () => {
    expect(nivelCarga(0)).toBe('vazio');
    expect(nivelCarga(1)).toBe('baixa');
    expect(nivelCarga(4)).toBe('media');
    expect(nivelCarga(8)).toBe('alta');
  });
});

describe('intervaloDaVisao', () => {
  it('mês cobre as semanas inteiras da grade', () => {
    const { inicio, fim } = intervaloDaVisao('mes', new Date(2026, 9, 17));
    expect(inicio.getDay()).toBe(0);
    expect(fim.getDay()).toBe(6);
    expect(inicio <= new Date(2026, 9, 1)).toBe(true);
    expect(fim >= new Date(2026, 9, 31)).toBe(true);
  });
});

describe('statusEfetivo — o técnico (OS) manda', () => {
  it('sem OS usa o status do agendamento', () => {
    expect(statusEfetivo(ag({ status: 'CONFIRMADO' }), undefined)).toBe('CONFIRMADO');
    expect(statusEfetivo(ag({ status: 'EM_ANDAMENTO' }), undefined)).toBe('EM_ANDAMENTO');
  });
  it('OS em andamento/pausada → em andamento, mesmo com agendamento ainda AGENDADO', () => {
    expect(statusEfetivo(ag({}), os({ status: 'EM_ANDAMENTO' }))).toBe('EM_ANDAMENTO');
    expect(statusEfetivo(ag({}), os({ status: 'PAUSADA' }))).toBe('EM_ANDAMENTO');
  });
  it('OS aguardando peça → aguardando peças; OS concluída → concluído', () => {
    expect(statusEfetivo(ag({ status: 'EM_ANDAMENTO' }), os({ status: 'AGUARDANDO_PECA' }))).toBe('AGUARDANDO_PECAS');
    expect(statusEfetivo(ag({ status: 'EM_ANDAMENTO' }), os({ status: 'CONCLUIDA' }))).toBe('CONCLUIDO');
  });
  it('OS criada e ainda não iniciada → Na fila (hoje); agendamento futuro continua Agendado', () => {
    expect(statusEfetivo(ag({ status: 'EM_ANDAMENTO' }), os({ status: 'APROVADA' }))).toBe('NA_FILA');
    expect(statusEfetivo(ag({ status: 'CONFIRMADO' }), os({ status: 'ABERTA' }))).toBe('NA_FILA');
    expect(statusEfetivo(ag({ dataHora: amanha }), os({ status: 'APROVADA' }))).toBe('AGENDADO');
  });
  it('agendamento cancelado ou concluído não é alterado pela OS', () => {
    expect(statusEfetivo(ag({ status: 'CANCELADO' }), os({ status: 'EM_ANDAMENTO' }))).toBe('CANCELADO');
    expect(statusEfetivo(ag({ status: 'CONCLUIDO' }), os({ status: 'EM_ANDAMENTO' }))).toBe('CONCLUIDO');
  });
});

describe('montarItens — vínculo com a OS', () => {
  it('agendamento futuro não herda a OS que o veículo tem hoje', () => {
    const [item] = montarItens([ag({ dataHora: amanha })], [os({})], []);
    expect(item.os).toBeUndefined();
    expect(item.status).toBe('AGENDADO');
  });
  it('OS encerrada antes do dia do agendamento é ignorada', () => {
    const antiga = os({ status: 'CONCLUIDA', dataConclusao: '2020-01-01T10:00:00', dataAbertura: '2020-01-01T08:00:00' });
    expect(montarItens([ag({})], [antiga], [])[0].os).toBeUndefined();
  });
  it('prefere a OS em aberto mais relevante do veículo', () => {
    const [item] = montarItens([ag({})], [os({ id: 1, status: 'ABERTA' }), os({ id: 2, status: 'AGUARDANDO_PECA' })], []);
    expect(item.os?.id).toBe(2);
  });
});

describe('agruparPorDia / contaCarga', () => {
  it('agrupa por dia ordenando por horário e ignora cancelados na carga', () => {
    const itens = montarItens(
      [
        ag({ id: 2, dataHora: '2026-10-17T14:00:00' }),
        ag({ id: 1, dataHora: '2026-10-17T09:00:00' }),
        ag({ id: 3, dataHora: '2026-10-17T11:00:00', status: 'CANCELADO' }),
      ],
      [],
      [],
    );
    const lista = agruparPorDia(itens).get('2026-10-17')!;
    expect(lista.map((i) => i.ag.id)).toEqual([1, 3, 2]);
    expect(contaCarga(lista)).toBe(2);
  });
});

describe('montarCards (quadro somente leitura)', () => {
  it('distribui nas colunas pelo status efetivo; cancelado não aparece', () => {
    const cards = montarCards(
      [
        ag({ id: 1, veiculoId: 1, status: 'CONFIRMADO' }),
        ag({ id: 2, veiculoId: 2, status: 'AGENDADO' }), // OS em andamento → Em andamento
        ag({ id: 3, veiculoId: 3, status: 'EM_ANDAMENTO' }), // OS aguardando peça
        ag({ id: 4, veiculoId: 4, status: 'CONCLUIDO' }),
        ag({ id: 5, veiculoId: 5, status: 'CANCELADO' }),
      ],
      [
        os({ id: 12, veiculoId: 2, status: 'EM_ANDAMENTO' }),
        os({ id: 13, veiculoId: 3, status: 'AGUARDANDO_PECA' }),
      ],
      [],
      FILTROS_VAZIOS,
    );
    const coluna = (key: string) => cards.find((c) => c.key === key)?.coluna;
    expect(coluna('ag-1')).toBe('AGENDADO');
    expect(coluna('ag-2')).toBe('EM_ANDAMENTO');
    expect(coluna('ag-3')).toBe('AGUARDANDO_PECAS');
    expect(coluna('ag-4')).toBe('CONCLUIDO');
    expect(coluna('ag-5')).toBeUndefined();
  });

  it('mostra OS sem agendamento (em andamento/pausada/aguardando peça) sem duplicar veículo já agendado', () => {
    const cards = montarCards(
      [ag({ id: 1, veiculoId: 10, status: 'AGENDADO', dataHora: amanha })],
      [
        os({ id: 1, veiculoId: 10, status: 'EM_ANDAMENTO' }), // veículo já tem agendamento ativo
        os({ id: 2, veiculoId: 20, status: 'EM_ANDAMENTO' }),
        os({ id: 3, veiculoId: 21, status: 'PAUSADA' }),
        os({ id: 4, veiculoId: 22, status: 'AGUARDANDO_PECA' }),
        os({ id: 5, veiculoId: 23, status: 'ABERTA' }),
      ],
      [],
      FILTROS_VAZIOS,
    );
    expect(Object.fromEntries(cards.map((c) => [c.key, c.coluna]))).toEqual({
      'ag-1': 'AGENDADO',
      'os-2': 'EM_ANDAMENTO',
      'os-3': 'EM_ANDAMENTO',
      'os-4': 'AGUARDANDO_PECAS',
      'os-5': 'NA_FILA', // cliente chegou sem agendar: OS criada, esperando o técnico
    });
  });

  it('filtra por mecânico (via OS), por status efetivo e por busca', () => {
    const lista = [ag({ id: 1, veiculoId: 10 }), ag({ id: 2, veiculoId: 11, veiculoPlaca: 'XYZ9K88' })];
    const ordens = [os({ veiculoId: 10, usuarioResponsavelId: 7 })];
    expect(montarCards(lista, ordens, [], { ...FILTROS_VAZIOS, mecanicoId: '7' }).map((c) => c.key)).toEqual(['ag-1']);
    expect(montarCards(lista, ordens, [], { ...FILTROS_VAZIOS, busca: 'xyz9' }).map((c) => c.key)).toEqual(['ag-2']);
    expect(montarCards(lista, ordens, [], { ...FILTROS_VAZIOS, status: 'EM_ANDAMENTO' }).map((c) => c.key)).toEqual(['ag-1']);
  });
});

describe('vínculo exato agendamento → orçamento → OS', () => {
  it('usa Orcamento.agendamentoId e OrdemServico.orcamentoId, sem olhar o veículo', () => {
    const [item] = montarItens(
      [ag({ id: 1, veiculoId: 10 })],
      [os({ id: 77, veiculoId: 999, orcamentoId: 50, status: 'EM_ANDAMENTO' }), os({ id: 78, veiculoId: 10, status: 'AGUARDANDO_PECA' })],
      [orc({ id: 50, agendamentoId: 1, status: 'CONVERTIDO' })],
    );
    expect(item.os?.id).toBe(77);
    expect(item.vinculo).toBe('exato');
    expect(item.status).toBe('EM_ANDAMENTO');
    expect(item.etapa).toBe('COM_OS');
  });

  it('agendamento com orçamento ainda sem OS não herda OS do mesmo veículo', () => {
    const [item] = montarItens([ag({ id: 1 })], [os({ veiculoId: 10, status: 'EM_ANDAMENTO' })], [orc({ status: 'ENVIADO' })]);
    expect(item.os).toBeUndefined();
    expect(item.etapa).toBe('ORCAMENTO_ENVIADO');
    expect(item.status).toBe('AGENDADO');
  });

  it('etapa e próximo passo acompanham o orçamento', () => {
    const passo = (orcamentos: OrcamentoResponse[]) => proximoPasso(montarItens([ag({ id: 1 })], [], orcamentos)[0]);
    expect(passo([])).toBe('CRIAR_ORCAMENTO');
    expect(passo([orc({ status: 'RASCUNHO' })])).toBe('ABRIR_ORCAMENTO');
    expect(passo([orc({ status: 'ENVIADO' })])).toBe('ABRIR_ORCAMENTO');
    expect(passo([orc({ status: 'APROVADO' })])).toBe('GERAR_OS');
    expect(passo([orc({ status: 'REJEITADO' })])).toBe('CRIAR_ORCAMENTO');
  });

  it('com OS o próximo passo é abrir a OS; cancelado/concluído sem OS não têm passo', () => {
    expect(proximoPasso(montarItens([ag({})], [os({ status: 'APROVADA' })], [])[0])).toBe('ABRIR_OS');
    expect(proximoPasso(montarItens([ag({ status: 'CANCELADO' })], [], [])[0])).toBeNull();
    expect(proximoPasso(montarItens([ag({ status: 'CONCLUIDO' })], [], [])[0])).toBeNull();
  });

  it('prefere o orçamento mais avançado quando há mais de um para o mesmo agendamento', () => {
    const [item] = montarItens([ag({ id: 1 })], [], [orc({ id: 1, status: 'REJEITADO' }), orc({ id: 2, status: 'APROVADO' })]);
    expect(item.orcamento?.id).toBe(2);
  });
});
