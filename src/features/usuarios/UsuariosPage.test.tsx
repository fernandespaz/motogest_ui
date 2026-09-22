import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useUsuarios, useDeleteUsuario } from '@/hooks/useUsuarios';
import { useLicencaAtual } from '@/hooks/useOficina';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { UsuariosPage } from './UsuariosPage';

vi.mock('@/hooks/useUsuarios', () => ({
  useUsuarios: vi.fn(),
  useDeleteUsuario: vi.fn(),
  useCreateUsuario: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateUsuario: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/hooks/useOficina', () => ({ useLicencaAtual: vi.fn() }));
vi.mock('@/hooks/usePerfis', () => ({ usePerfis: vi.fn(() => ({ data: [] })) }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderPage() {
  return render(
    <MemoryRouter>
      <UsuariosPage />
    </MemoryRouter>,
  );
}

const usuarios = [
  { id: 1, nome: 'Diego Fernandes', email: 'diego@ramtec.com.br', perfilNome: 'Administrador', ativo: true },
  { id: 2, nome: 'Fernanda Souza', email: 'fernanda@ramtec.com.br', perfilNome: 'Consultor', ativo: false },
];

describe('UsuariosPage', () => {
  let deleteMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuthStore.setState({ usuarioId: 1, permissoes: ['USUARIO_READ', 'USUARIO_WRITE'] });
    vi.mocked(useUsuarios).mockReturnValue({ data: usuarios, isLoading: false } as never);
    vi.mocked(useLicencaAtual).mockReturnValue({ data: { plano: 'PRO', limiteUsuarios: null, usuariosAtivos: 2 } } as never);
    deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeleteUsuario).mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false } as never);
  });

  it('lists usuários with their perfil and status', () => {
    renderPage();
    expect(screen.getByText('Diego Fernandes')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('hides the delete button for the currently logged-in usuário', () => {
    renderPage();
    const ownRow = screen.getByText('Diego Fernandes').closest('tr')!;
    const otherRow = screen.getByText('Fernanda Souza').closest('tr')!;

    expect(ownRow.querySelectorAll('button')).toHaveLength(1);
    expect(otherRow.querySelectorAll('button')).toHaveLength(2);
  });

  it('is read-only with USUARIO_READ alone — no create, edit or delete (backend requires USUARIO_WRITE)', async () => {
    useAuthStore.setState({ permissoes: ['USUARIO_READ'] });
    renderPage();

    expect(screen.getByText('Fernanda Souza')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo usuário/ })).not.toBeInTheDocument();
    expect(screen.getByText('Fernanda Souza').closest('tr')!.querySelectorAll('button')).toHaveLength(0);

    await userEvent.click(screen.getByText('Fernanda Souza'));
    expect(screen.queryByText('Editar usuário')).not.toBeInTheDocument();
  });

  it('opens the create modal from "Novo usuário"', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Novo usuário/ }));
    expect(screen.getByText('Novo usuário', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the edit modal when a row is clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Diego Fernandes'));
    expect(screen.getByText('Editar usuário')).toBeInTheDocument();
  });

  it('confirms and deletes another usuário', async () => {
    renderPage();
    const otherRow = screen.getByText('Fernanda Souza').closest('tr')!;
    await userEvent.click(otherRow.querySelectorAll('button')[1]);
    expect(screen.getByText('Remover usuário')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));

    expect(deleteMutateAsync).toHaveBeenCalledWith(2);
    expect(toast.success).toHaveBeenCalledWith('Usuário removido.');
  });

  it('toasts an error when the delete fails', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new Error('usuário é o único admin'));
    renderPage();
    const otherRow = screen.getByText('Fernanda Souza').closest('tr')!;
    await userEvent.click(otherRow.querySelectorAll('button')[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));

    expect(toast.error).toHaveBeenCalledWith('usuário é o único admin');
  });

  it('closes the modal via Cancelar', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Novo usuário/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Novo usuário', { selector: 'h2' }));
  });

  it('shows the empty state when there are no usuários', () => {
    vi.mocked(useUsuarios).mockReturnValue({ data: [], isLoading: false } as never);
    renderPage();
    expect(screen.getByText('Nenhum usuário cadastrado')).toBeInTheDocument();
  });

  describe('limite de usuários do plano', () => {
    it('shows no usage count or warning for an unlimited plan (limiteUsuarios null)', () => {
      renderPage();
      expect(screen.queryByText(/de.*usuários/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Limite de/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Novo usuário/ })).toBeEnabled();
    });

    it('shows the usage count with the plan label when a limit is set and not yet reached', () => {
      vi.mocked(useLicencaAtual).mockReturnValue({ data: { plano: 'PRO', limiteUsuarios: 6, usuariosAtivos: 2 } } as never);
      renderPage();
      expect(screen.getByText(/2 de 6 usuários \(Pro\)/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Novo usuário/ })).toBeEnabled();
    });

    it('disables "Novo usuário" and shows an upgrade warning once the limit is reached', () => {
      vi.mocked(useLicencaAtual).mockReturnValue({ data: { plano: 'BASICO', limiteUsuarios: 2, usuariosAtivos: 2 } } as never);
      renderPage();

      expect(screen.getByRole('button', { name: /Novo usuário/ })).toBeDisabled();
      expect(screen.getByText(/Limite de 2 usuários ativos do plano Básico atingido/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Fazer upgrade' })).toHaveAttribute('href', '/oficina/licenca');
    });
  });
});
