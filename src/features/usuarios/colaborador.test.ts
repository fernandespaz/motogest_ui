import { describe, expect, it } from 'vitest';
import { abaDoCampo, colaboradorParaForm, formParaColaborador, primeiraAbaComErro, abasComErro } from './colaborador';

describe('colaboradorParaForm', () => {
  it('transforma ausente/null em vazio e número em string', () => {
    const form = colaboradorParaForm({ cpf: null, salario: 2800, dataAdmissao: '2024-02-01' });
    expect(form.cpf).toBe('');
    expect(form.rg).toBe('');
    expect(form.salario).toBe('2800');
    expect(form.dataAdmissao).toBe('2024-02-01');
  });

  it('aceita resposta sem nenhum dado de RH (backend ainda sem os campos)', () => {
    expect(Object.values(colaboradorParaForm(undefined)).every((v) => v === '')).toBe(true);
  });
});

describe('formParaColaborador', () => {
  it('tira máscara, põe UF em maiúsculas, converte números e descarta vazios', () => {
    const payload = formParaColaborador({
      cpf: '529.982.247-25',
      cep: '13015-000',
      cbo: '914405',
      uf: 'sp',
      salario: '2800.5',
      jornadaSemanalHoras: '44',
      rg: '   ',
      cargo: ' Mecânico ',
    });
    expect(payload).toEqual({
      cpf: '52998224725',
      cep: '13015000',
      cbo: '914405',
      uf: 'SP',
      salario: 2800.5,
      jornadaSemanalHoras: 44,
      cargo: 'Mecânico',
    });
  });
});

describe('abaDoCampo', () => {
  it('mapeia campos para a aba onde são exibidos', () => {
    expect(abaDoCampo('email')).toBe('acesso');
    expect(abaDoCampo('cpf')).toBe('pessoais');
    expect(abaDoCampo('cep')).toBe('contato');
    expect(abaDoCampo('salario')).toBe('contratacao');
  });
});

describe('limparVazios (edição)', () => {
  it('envia null pros campos em branco pra o PUT conseguir limpar um dado gravado', () => {
    expect(formParaColaborador({ cpf: '', cargo: 'Mecânico' }, { limparVazios: true })).toMatchObject({
      cpf: null,
      rg: null,
      cargo: 'Mecânico',
    });
  });
});

describe('primeiraAbaComErro', () => {
  it('prioriza a aba mais à esquerda, não a ordem em que os erros foram registrados', () => {
    expect(primeiraAbaComErro(['salario', 'cpf', 'email'])).toBe('acesso');
    expect(primeiraAbaComErro(['salario', 'cep'])).toBe('contato');
    expect(primeiraAbaComErro([])).toBeUndefined();
  });
});

describe('abasComErro', () => {
  it('lista todas as abas com algum campo inválido', () => {
    expect([...abasComErro(['cpf', 'salario', 'cep', 'cpf'])].sort()).toEqual(['contato', 'contratacao', 'pessoais']);
  });
});
