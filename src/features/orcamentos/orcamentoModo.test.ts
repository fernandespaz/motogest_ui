import { describe, expect, it } from 'vitest';
import { camposDoModo, conclusaoInicial, montarConclusao, orcamentoSemCadastro, termoBuscaDuplicata, type ConclusaoValues } from './orcamentoModo';

const values = {
  clienteId: 5,
  veiculoId: 9,
  interessadoNome: ' Ana ',
  interessadoTelefone: '(11) 99999-1111',
  interessadoEmail: '',
  veiculoCategoria: 'B' as const,
  veiculoPlaca: '',
  veiculoMarca: 'Honda',
  veiculoModelo: 'CG 160',
  veiculoAnoFabricacao: 2019,
  veiculoCor: ' Preta ',
  veiculoChassi: '',
  observacoes: 'x',
};

describe('camposDoModo', () => {
  it('CADASTRADO manda só cliente/veículo e nenhum campo de interessado (o backend responde 422 se vierem juntos)', () => {
    const p = camposDoModo('CADASTRADO', values);
    expect(p).toMatchObject({ clienteId: 5, veiculoId: 9, observacoes: 'x' });
    expect(p).not.toHaveProperty('interessadoNome');
    expect(p).not.toHaveProperty('veiculoCategoria');
    expect(p).not.toHaveProperty('veiculoMarca');
    expect(p).not.toHaveProperty('veiculoChassi');
  });

  it('INTERESSADO zera cliente/veículo e manda os dados avulsos, vazios como undefined', () => {
    const p = camposDoModo('INTERESSADO', values);
    expect(p.clienteId).toBeUndefined();
    expect(p.veiculoId).toBeUndefined();
    expect(p).toMatchObject({
      interessadoNome: 'Ana',
      interessadoTelefone: '(11) 99999-1111',
      veiculoCategoria: 'B',
      veiculoMarca: 'Honda',
      veiculoModelo: 'CG 160',
      veiculoAnoFabricacao: 2019,
      veiculoCor: 'Preta',
      // lista e PDF mostram "marca modelo": a descrição sai dos campos, não é digitada à parte
      veiculoDescricao: 'Honda CG 160',
    });
    expect(p.veiculoChassi).toBeUndefined();
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

describe('concluir cadastro', () => {
  const completo: ConclusaoValues = {
    tipoPessoa: 'PF',
    nome: ' Joao ',
    documento: '529.982.247-25',
    email: '',
    telefone: '(11) 99999-1111',
    placa: 'jkl4m56',
    marca: '',
    modelo: 'CG 160',
    categoria: 'B',
    anoFabricacao: '2019',
    anoModelo: '',
    cor: 'Preta',
    chassi: '',
    kmAtual: '',
  };

  it('parte do que o consultor já digitou no rascunho', () => {
    const inicial = conclusaoInicial({
      interessadoNome: 'Joao',
      interessadoTelefone: '(11) 99999-1111',
      interessadoEmail: 'joao@teste.com',
      veiculoPlaca: 'abc1d23',
      veiculoDescricao: 'Honda CG 160',
      veiculoCategoria: 'A',
      veiculoMarca: 'Honda',
      veiculoModelo: 'CG 160 Titan',
      veiculoAnoFabricacao: 2019,
      veiculoCor: 'Preta',
      veiculoChassi: '9C2KC1670KR000001',
    });
    expect(inicial).toMatchObject({
      nome: 'Joao',
      telefone: '11999991111',
      email: 'joao@teste.com',
      placa: 'ABC1D23',
      marca: 'Honda',
      modelo: 'CG 160 Titan',
      anoFabricacao: '2019',
      cor: 'Preta',
      chassi: '9C2KC1670KR000001',
      categoria: 'A',
      documento: '',
    });
  });

  it('cliente e veículo novos: payload com documento só em dígitos e placa em caixa alta', () => {
    expect(montarConclusao(completo, {})).toEqual({
      payload: {
        cliente: { tipoPessoa: 'PF', nome: 'Joao', documento: '52998224725', email: undefined, telefone: '11999991111', ativo: true },
        veiculo: { placa: 'JKL4M56', marca: undefined, modelo: 'CG 160', categoria: 'B', anoFabricacao: 2019, anoModelo: undefined, cor: 'Preta', chassi: undefined, kmAtual: undefined },
      },
    });
  });

  it('cobra o que falta: documento do tamanho certo, placa e categoria', () => {
    const r = montarConclusao({ ...completo, documento: '123', placa: ' ', categoria: '' }, {});
    expect(r).toEqual({ erros: { documento: 'CPF deve ter 11 dígitos', placa: 'Informe a placa', categoria: 'Selecione a categoria' } });
    expect(montarConclusao({ ...completo, tipoPessoa: 'PJ' }, {})).toMatchObject({ erros: { documento: 'CNPJ deve ter 14 dígitos' } });
  });

  it('cadastros existentes dispensam os campos correspondentes e vão só pelo id', () => {
    const vazio = { ...completo, nome: '', documento: '', placa: '', categoria: '' as const };
    expect(montarConclusao(vazio, { clienteId: 7, veiculoId: 9 })).toEqual({ payload: { clienteId: 7, veiculoId: 9 } });
  });

  it('rascunho que já tem cliente: manda só o veículo', () => {
    const r = montarConclusao({ ...completo, nome: '', documento: '' }, { clienteJaVinculado: true });
    expect(r).toMatchObject({ payload: { veiculo: { placa: 'JKL4M56', modelo: 'CG 160', categoria: 'B' } } });
  });
});
