import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useOficinaAtual, useOficinaLogoSrc } from '@/hooks/useOficina';
import { Sidebar } from './Sidebar';

vi.mock('@/hooks/useOficina', () => ({
  useOficinaAtual: vi.fn(),
  useOficinaLogoSrc: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Sidebar', () => {
  beforeEach(() => {
    vi.mocked(useOficinaAtual).mockReturnValue({ data: { nomeFantasia: 'Ram Tec' } } as never);
    vi.mocked(useOficinaLogoSrc).mockReturnValue(undefined);
    mockNavigate.mockClear();
  });

  it('renders only the nav items the session has permission for, grouped by section', () => {
    useAuthStore.setState({ nome: 'Diego', perfil: 'Administrador', permissoes: ['CLIENTE_READ', 'ESTOQUE_READ'] });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Produtos e Estoque')).toBeInTheDocument();
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
  });

  it('shows the oficina name and the logged-in user', () => {
    useAuthStore.setState({ nome: 'Diego Fernandes', perfil: 'Administrador', permissoes: [] });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ram Tec')).toBeInTheDocument();
    expect(screen.getByText('Diego Fernandes')).toBeInTheDocument();
  });

  it('logs out and redirects to /login when "Sair" is clicked', async () => {
    const logoutSpy = vi.fn();
    useAuthStore.setState({ nome: 'Diego', perfil: 'Administrador', permissoes: [], logout: logoutSpy });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(logoutSpy).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
