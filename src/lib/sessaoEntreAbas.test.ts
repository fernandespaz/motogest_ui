import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { anunciarLogin, anunciarLogout, iniciarEscutaEntreAbas } from './sessaoEntreAbas';

// BroadcastChannel de mentira que entrega a mensagem às OUTRAS instâncias do mesmo canal (como o navegador faz entre abas).
class CanalFalso {
  static todos: CanalFalso[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  constructor(readonly nome: string) {
    CanalFalso.todos.push(this);
  }
  postMessage(data: unknown) {
    CanalFalso.todos
      .filter((c) => c !== this && c.nome === this.nome)
      .forEach((c) => c.onmessage?.({ data } as MessageEvent));
  }
  close() {
    CanalFalso.todos = CanalFalso.todos.filter((c) => c !== this);
  }
}

describe('sessão única entre abas do mesmo navegador', () => {
  const assign = vi.fn();
  let parar: () => void;
  let outraAba: CanalFalso;

  beforeEach(() => {
    CanalFalso.todos = [];
    assign.mockClear();
    vi.stubGlobal('BroadcastChannel', CanalFalso);
    vi.stubGlobal('location', { ...window.location, assign });
    useAuthStore.setState({ isAuthenticated: true, loginEm: 1000, permissoes: ['X'], nome: 'Diego' });
    parar = iniciarEscutaEntreAbas();
    outraAba = new CanalFalso('motogest.sessao');
  });

  afterEach(() => {
    parar();
    vi.unstubAllGlobals();
  });

  it('derruba esta aba quando outra aba faz um login mais novo', () => {
    outraAba.postMessage({ tipo: 'login', loginEm: 2000 });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().nome).toBeUndefined();
    expect(assign).toHaveBeenCalledWith('/login?sessao=outra-aba');
  });

  it('não derruba esta aba por um login mais antigo (dois logins quase simultâneos: vence o último)', () => {
    outraAba.postMessage({ tipo: 'login', loginEm: 500 });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(assign).not.toHaveBeenCalled();
  });

  it('derruba esta aba quando o usuário sai em outra aba', () => {
    outraAba.postMessage({ tipo: 'logout' });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(assign).toHaveBeenCalledWith('/login?sessao=encerrada');
  });

  it('ignora avisos quando esta aba já está deslogada (ex.: a própria tela de login)', () => {
    useAuthStore.setState({ isAuthenticated: false, loginEm: null });

    outraAba.postMessage({ tipo: 'login', loginEm: 2000 });
    outraAba.postMessage({ tipo: 'logout' });

    expect(assign).not.toHaveBeenCalled();
  });

  it('anunciarLogin/anunciarLogout chegam às outras abas', () => {
    const recebidas: unknown[] = [];
    outraAba.onmessage = (e) => recebidas.push(e.data);

    anunciarLogin(3000);
    anunciarLogout();

    expect(recebidas).toEqual([{ tipo: 'login', loginEm: 3000 }, { tipo: 'logout' }]);
  });

  it('sem BroadcastChannel no navegador, nada quebra', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    expect(() => iniciarEscutaEntreAbas()()).not.toThrow();
  });
});
