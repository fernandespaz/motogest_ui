import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/store/authStore';
import { LoginPage } from './LoginPage';

vi.mock('@/api/endpoints/auth', () => ({ authApi: { login: vi.fn(), logout: vi.fn() } }));

const RESPOSTA = {
  token: null,
  usuarioId: 3,
  tenantId: 1,
  nome: 'Zé',
  email: '',
  perfil: 'Mecânico',
  permissoes: [],
  usuarioCodigo: '7351948',
  oficinaCodigo: '4829163',
};

function renderLogin(url = '/login') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

async function preencher({ oficina, usuario, senha }: { oficina?: string; usuario?: string; senha?: string }) {
  if (oficina !== undefined) {
    const campo = screen.getByLabelText(/Código da oficina/);
    await userEvent.clear(campo);
    if (oficina) await userEvent.type(campo, oficina);
  }
  if (usuario !== undefined) {
    const campo = screen.getByLabelText(/Código do usuário/);
    await userEvent.clear(campo);
    if (usuario) await userEvent.type(campo, usuario);
  }
  if (senha !== undefined) await userEvent.type(screen.getByLabelText(/Senha/), senha);
}

describe('LoginPage — só por códigos (oficina + usuário)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(authApi.login).mockReset();
    useAuthStore.setState({ isAuthenticated: false, loginEm: null });
  });

  it('não tem campo de e-mail nem de CNPJ: só os dois códigos e a senha', () => {
    renderLogin();

    expect(screen.getByLabelText(/Código da oficina/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Código do usuário/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/)).toBeInTheDocument();
    expect(screen.queryByText(/e-mail/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CNPJ/i)).not.toBeInTheDocument();
  });

  it('envia o código da oficina, o do usuário e a senha', async () => {
    vi.mocked(authApi.login).mockResolvedValue(RESPOSTA as never);
    renderLogin();

    await preencher({ oficina: '4829163', usuario: '7351948', senha: 'segredo' });
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({ identificador: '7351948', senha: 'segredo', oficina: '4829163' }),
    );
  });

  it('exige os dois códigos: sem eles nem chama a API', async () => {
    renderLogin();

    await preencher({ oficina: '', usuario: '', senha: 'segredo' });
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    expect(await screen.findByText('Informe o código da oficina')).toBeInTheDocument();
    expect(screen.getByText('Informe o código do usuário')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('espaços digitados ou colados nos códigos são descartados antes de enviar', async () => {
    vi.mocked(authApi.login).mockResolvedValue(RESPOSTA as never);
    renderLogin();

    await preencher({ oficina: ' 482 9163 ', usuario: ' 735 1948', senha: 'segredo' });
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({ identificador: '7351948', senha: 'segredo', oficina: '4829163' }),
    );
  });

  it('o link de acesso (?oficina=) já vem preenchido, e vale mais que o lembrado', () => {
    localStorage.setItem('motogest:login-lembrado', JSON.stringify({ oficina: '1111111', usuario: '2222222' }));
    renderLogin('/login?oficina=4829163');

    expect(screen.getByLabelText(/Código da oficina/)).toHaveValue('4829163');
    expect(screen.getByLabelText(/Código do usuário/)).toHaveValue('2222222');
  });

  it('lembrar: grava os dois códigos confirmados pelo servidor, e NUNCA a senha', async () => {
    vi.mocked(authApi.login).mockResolvedValue(RESPOSTA as never);
    renderLogin();

    await preencher({ oficina: '4829163', usuario: '7351948', senha: 'segredo-super' });
    await userEvent.click(screen.getByLabelText(/Lembrar os códigos/));
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    await waitFor(() => expect(localStorage.getItem('motogest:login-lembrado')).not.toBeNull());
    expect(JSON.parse(localStorage.getItem('motogest:login-lembrado')!)).toEqual({ oficina: '4829163', usuario: '7351948' });
    expect(JSON.stringify(Object.values(localStorage))).not.toContain('segredo-super');
    expect(JSON.stringify(Object.values(sessionStorage))).not.toContain('segredo-super');
  });

  it('sem marcar "lembrar", esquece o que estava lembrado', async () => {
    localStorage.setItem('motogest:login-lembrado', JSON.stringify({ oficina: '4829163', usuario: '7351948' }));
    vi.mocked(authApi.login).mockResolvedValue(RESPOSTA as never);
    renderLogin();

    await userEvent.click(screen.getByLabelText(/Lembrar os códigos/)); // vinha marcado: desmarca
    await userEvent.type(screen.getByLabelText(/Senha/), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    await waitFor(() => expect(authApi.login).toHaveBeenCalled());
    await waitFor(() => expect(localStorage.getItem('motogest:login-lembrado')).toBeNull());
  });

  it('credenciais inválidas: mensagem genérica, sem revelar o que falhou', async () => {
    const invalido = new AxiosError('401');
    invalido.response = { status: 401, data: { message: 'Credenciais invalidas' }, statusText: '', headers: {}, config: {} as never } as never;
    vi.mocked(authApi.login).mockRejectedValue(invalido);
    renderLogin();

    await preencher({ oficina: '4829163', usuario: '1234567', senha: 'errada' });
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    expect(await screen.findByText('Credenciais invalidas')).toBeInTheDocument();
  });
});
