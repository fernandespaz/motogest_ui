import { describe, expect, it } from 'vitest';
import { camposDoModo, orcamentoSemCadastro, termoBuscaDuplicata } from './orcamentoModo';

const values = {
  clienteId: 5,
  veiculoId: 9,
  interessadoNome: ' Ana ',
  interessadoTelefone: '(11) 99999-1111',
  interessadoEmail: '',
  veiculoCategoria: 'B' as const,
  veiculoPlaca: '',
  veiculoDescricao: 'Honda CG 160',
  observacoes: 'x',
};

describe('camposDoModo', () => {
  it('CADASTRADO manda só cliente/veículo e nenhum campo de interessado (o backend responde 422 se vierem juntos)', () => {
    const p = camposDoModo('CADASTRADO', values);
    expect(p).toMatchObject({ clienteId: 5, veiculoId: 9, observacoes: 'x' });
    expect(p).not.toHaveProperty('interessadoNome');
    expect(p).not.toHaveProperty('veiculoCategoria');
  });

  it('INTERESSADO zera cliente/veículo e manda os dados avulsos, vazios como undefined', () => {
    const p = camposDoModo('INTERESSADO', values);
    expect(p.clienteId).toBeUndefined();
    expect(p.veiculoId).toBeUndefined();
    expect(p).toMatchObject({
      interessadoNome: 'Ana',
      interessadoTelefone: '(11) 99999-1111',
      veiculoCategoria: 'B',
      veiculoDescricao: 'Honda CG 160',
    });
    expect(p.interessadoEmail).toBeUndefined();
    expect(p.veiculoPlaca).toBeUndefined();
  });

  it('CADASTRADO com ids 0 (combobox vazio) não manda id', () => {
    const p = camposDoModo('CADASTRADO', { ...values, clienteId: 0, veiculoId: 0 });
    expect(p.clienteId).toBeUndefined();
    expect(p.veiculoId).toBeUndefined();
  });
});

describe('orcamentoSemCadastro', () => {
  it('é verdadeiro quando a resposta não traz clienteId ou veiculoId', () => {
    expect(orcamentoSemCadastro({})).toBe(true);
    expect(orcamentoSemCadastro({ clienteId: 1 })).toBe(true);
    expect(orcamentoSemCadastro({ clienteId: 1, veiculoId: 2 })).toBe(false);
    expect(orcamentoSemCadastro(undefined)).toBe(false);
  });
});

describe('termoBuscaDuplicata', () => {
  it('prefere o telefone só com dígitos (o backend casa com ou sem máscara)', () => {
    expect(termoBuscaDuplicata({ interessadoTelefone: '(11) 99999-1111', interessadoEmail: 'a@b.com' })).toBe('11999991111');
  });
  it('cai pro e-mail quando o telefone é curto demais, e ignora texto sem @', () => {
    expect(termoBuscaDuplicata({ interessadoTelefone: '123', interessadoEmail: 'a@b.com' })).toBe('a@b.com');
    expect(termoBuscaDuplicata({ interessadoTelefone: '', interessadoEmail: 'abc' })).toBeUndefined();
  });
});
