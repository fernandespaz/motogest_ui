import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lerLoginLembrado, limparLoginLembrado, linkDeAcesso, salvarLoginLembrado } from './loginOficina';

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

describe('linkDeAcesso', () => {
  it('abre o login já com o código da oficina', () => {
    expect(linkDeAcesso('4829163', 'https://app.exemplo.com')).toBe('https://app.exemplo.com/login?oficina=4829163');
    expect(linkDeAcesso(undefined, 'https://app.exemplo.com')).toBe('https://app.exemplo.com/login');
  });
});
