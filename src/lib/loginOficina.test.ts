import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lerLoginLembrado, limparLoginLembrado, opcoesDeOficinaDoErro, salvarLoginLembrado } from './loginOficina';

function erro(status: number, data: unknown): AxiosError {
  const e = new AxiosError('falhou');
  e.response = { status, data, statusText: '', headers: {}, config: {} as never } as never;
  return e;
}

describe('login lembrado', () => {
  beforeEach(() => localStorage.clear());

  it('guarda e devolve só oficina e usuário', () => {
    salvarLoginLembrado({ oficina: 'RAMTEC', usuario: '0003' });
    expect(lerLoginLembrado()).toEqual({ oficina: 'RAMTEC', usuario: '0003' });
  });

  it('nunca grava senha, mesmo que o objeto traga uma', () => {
    salvarLoginLembrado({ oficina: 'RAMTEC', usuario: '0003', senha: 'segredo' } as never);
    expect(JSON.stringify(Object.values(localStorage))).not.toContain('segredo');
  });

  it('limpar esquece o login', () => {
    salvarLoginLembrado({ oficina: 'RAMTEC', usuario: '0003' });
    limparLoginLembrado();
    expect(lerLoginLembrado()).toBeNull();
  });

  it('ignora um valor corrompido', () => {
    localStorage.setItem('motogest:login-lembrado', '{nao-e-json');
    expect(lerLoginLembrado()).toBeNull();
    localStorage.setItem('motogest:login-lembrado', JSON.stringify({ oficina: 1 }));
    expect(lerLoginLembrado()).toBeNull();
  });

  it('com localStorage indisponível não quebra', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(lerLoginLembrado()).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('opcoesDeOficinaDoErro', () => {
  it('lê as oficinas do 409 ESCOLHER_OFICINA', () => {
    const e = erro(409, { codigo: 'ESCOLHER_OFICINA', details: ['RAMTEC|Ram Tec', 'RAMTEC2|Ram Tec | Teste'] });
    expect(opcoesDeOficinaDoErro(e)).toEqual([
      { codigo: 'RAMTEC', nome: 'Ram Tec' },
      { codigo: 'RAMTEC2', nome: 'Ram Tec | Teste' },
    ]);
  });

  it('devolve null para qualquer outro erro', () => {
    expect(opcoesDeOficinaDoErro(erro(401, { message: 'x' }))).toBeNull();
    expect(opcoesDeOficinaDoErro(erro(409, { codigo: 'LIMITE_USUARIOS_EXCEDIDO' }))).toBeNull();
    expect(opcoesDeOficinaDoErro(new Error('rede'))).toBeNull();
  });
});
