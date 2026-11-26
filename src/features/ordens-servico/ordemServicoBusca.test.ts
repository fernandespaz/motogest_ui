import { describe, expect, it } from 'vitest';
import { casaComTexto, classificarBuscaOS, rotuloOS } from './ordemServicoBusca';

describe('classificarBuscaOS', () => {
  it('vazio', () => {
    expect(classificarBuscaOS('   ')).toEqual({ tipo: 'vazio' });
  });

  it('só dígitos curtos ou com prefixo OS/O.S. = número da O.S.', () => {
    expect(classificarBuscaOS('49')).toEqual({ tipo: 'numero', valor: '49' });
    expect(classificarBuscaOS('OS-000049')).toEqual({ tipo: 'numero', valor: '000049' });
    expect(classificarBuscaOS('o.s. 49')).toEqual({ tipo: 'numero', valor: '49' });
  });

  it('11 ou 14 dígitos (com ou sem pontuação) = CPF/CNPJ', () => {
    expect(classificarBuscaOS('123.456.789-01')).toEqual({ tipo: 'documento', valor: '12345678901' });
    expect(classificarBuscaOS('11222333000181')).toEqual({ tipo: 'documento', valor: '11222333000181' });
  });

  it('letras = placa ou nome (busca nas O.S. recentes)', () => {
    expect(classificarBuscaOS('MTG0006')).toEqual({ tipo: 'texto', valor: 'MTG0006' });
    expect(classificarBuscaOS('bruno')).toEqual({ tipo: 'texto', valor: 'bruno' });
  });
});

describe('casaComTexto', () => {
  const os = { id: 1, numero: 'OS-000049', clienteNome: 'Bruno Henrique Santos', veiculoPlaca: 'MTG0006' };

  it('casa por nome sem acento/caixa e por placa com ou sem hífen', () => {
    expect(casaComTexto(os, 'brúno')).toBe(true);
    expect(casaComTexto(os, 'mtg-0006')).toBe(true);
    expect(casaComTexto(os, 'mtg00')).toBe(true);
    expect(casaComTexto(os, 'zzz')).toBe(false);
  });
});

describe('rotuloOS', () => {
  it('tira o prefixo OS- do número (sem repetir "OS OS-")', () => {
    expect(rotuloOS('OS-000049', 51)).toBe('O.S. 000049');
    expect(rotuloOS(undefined, 51)).toBe('O.S. #51');
    expect(rotuloOS()).toBe('O.S.');
  });
});
