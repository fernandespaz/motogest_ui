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
  usuarioCodigo: '0003',
  oficinaCodigo: 'RAMTEC',
};

function renderLogin(url = '/login') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

async function preencher({ oficina, usuario, senha }: { oficina?: string; usuario: string; senha: string }) {
  if (oficina !== undefined) {
    const campo = screen.getByLabelText(/^Oficina/);
    await userEvent.clear(campo);
    if (oficina) await userEvent.type(campo, oficina);
  }
  const campoUsuario = screen.getByLabelText(/Usuário/);
  await userEvent.clear(campoUsuario);
  await userEvent.type(campoUsuario, usuario);
  await userEvent.type(screen.getByLabelText(/Senha/), senha);
}

describe('LoginPage — oficina + usuário', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(authApi.login).mockReset();
    useAuthStore.setState({ isAuthenticated: false, loginEm: null });
  });

  it('envia oficina, usuário e senha', async () => {
    vi.mocked(authApi.login).mockResolvedValue(RESPOSTA as never);
    renderLogin();

    await preencher({ oficina: 'ramtec', usuario: '0003', senha: 'segredo' });
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({ identificador: '0003', senha: 'segredo', oficina: 'ramtec' }),
    );
  });

  it('espaços no código da oficina são descartados antes de enviar', async () => {
    vi.mocked(authApi.login).mockResolvedValue(RESPOSTA as never);
    renderLogin();

    await preencher({ oficina: ' ram tec ', usuario: '0003', senha: 'segredo' });
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({ identificador: '0003', senha: 'segredo', oficina: 'ramtec' }),
    );
  });

  it('com a oficina em branco entra só por e-mail (a oficina nem vai no pedido)', async () => {
    vi.mocked(authApi.login).mockResolvedValue(RESPOSTA as never);
    renderLogin();

    await preencher({ oficina: '', usuario: 'diego@ramtec.com.br', senha: 'segredo' });
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({ identificador: 'diego@ramtec.com.br', senha: 'segredo' }),
    );
  });

  it('o link de acesso (?oficina=) já vem preenchido, e vale mais que o lembrado', () => {
    localStorage.setItem('motogest:login-lembrado', JSON.stringify({ oficina: 'OUTRA', usuario: '0001' }));
    renderLogin('/login?oficina=ramtec');

    expect(screen.getByLabelText(/^Oficina/)).toHaveValue('RAMTEC');
    expect(screen.getByLabelText(/Usuário/)).toHaveValue('0001');
  });

  it('lembrar: grava oficina e usuário confirmados pelo servidor, e NUNCA a senha', async () => {
    vi.mocked(authApi.login).mockResolvedValue(RESPOSTA as never);
    renderLogin();

    await preencher({ oficina: 'ramtec', usuario: '3', senha: 'segredo-super' });
    await userEvent.click(screen.getByLabelText(/Lembrar oficina e usuário/));
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    await waitFor(() => expect(localStorage.getItem('motogest:login-lembrado')).not.toBeNull());
    expect(JSON.parse(localStorage.getItem('motogest:login-lembrado')!)).toEqual({ oficina: 'RAMTEC', usuario: '0003' });
    expect(JSON.stringify(Object.values(localStorage))).not.toContain('segredo-super');
    expect(JSON.stringify(Object.values(sessionStorage))).not.toContain('segredo-super');
  });

  it('sem marcar "lembrar", esquece o que estava lembrado', async () => {
    localStorage.setItem('motogest:login-lembrado', JSON.stringify({ oficina: 'RAMTEC', usuario: '0001' }));
    vi.mocked(authApi.login).mockResolvedValue(RESPOSTA as never);
    renderLogin();

    await userEvent.click(screen.getByLabelText(/Lembrar oficina e usuário/)); // vinha marcado: desmarca
    await userEvent.type(screen.getByLabelText(/Senha/), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    await waitFor(() => expect(authApi.login).toHaveBeenCalled());
    await waitFor(() => expect(localStorage.getItem('motogest:login-lembrado')).toBeNull());
  });

  it('e-mail em mais de uma oficina: mostra a escolha e repete o login com a oficina escolhida', async () => {
    const conflito = new AxiosError('409');
    conflito.response = {
      status: 409,
      data: { codigo: 'ESCOLHER_OFICINA', details: ['RAMTEC|Ram Tec', 'RAMTECT|Ram Tec Teste'] },
      statusText: '',
      headers: {},
      config: {} as never,
    } as never;
    vi.mocked(authApi.login).mockRejectedValueOnce(conflito).mockResolvedValueOnce(RESPOSTA as never);
    renderLogin();

    await preencher({ oficina: '', usuario: 'diego@ramtec.com.br', senha: 'segredo' });
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    expect(await screen.findByText('Em qual oficina deseja entrar?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Ram Tec Teste/ }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenLastCalledWith({
        identificador: 'diego@ramtec.com.br',
        senha: 'segredo',
        oficina: 'RAMTECT',
      }),
    );
  });

  it('credenciais inválidas: mensagem genérica, sem revelar o que falhou', async () => {
    const invalido = new AxiosError('401');
    invalido.response = { status: 401, data: { message: 'Credenciais invalidas' }, statusText: '', headers: {}, config: {} as never } as never;
    vi.mocked(authApi.login).mockRejectedValue(invalido);
    renderLogin();

    await preencher({ oficina: 'RAMTEC', usuario: '0009', senha: 'errada' });
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    expect(await screen.findByText('Credenciais invalidas')).toBeInTheDocument();
    expect(screen.queryByText('Em qual oficina deseja entrar?')).not.toBeInTheDocument();
  });
});
