import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUsuarios, useDeleteUsuario } from '@/hooks/useUsuarios';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { UsuariosPage } from './UsuariosPage';

vi.mock('@/hooks/useUsuarios', () => ({
  useUsuarios: vi.fn(),
  useDeleteUsuario: vi.fn(),
  useCreateUsuario: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateUsuario: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/hooks/usePerfis', () => ({ usePerfis: vi.fn(() => ({ data: [] })) }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const usuarios = [
  { id: 1, nome: 'Diego Fernandes', email: 'diego@ramtec.com.br', perfilNome: 'Administrador', ativo: true },
  { id: 2, nome: 'Fernanda Souza', email: 'fernanda@ramtec.com.br', perfilNome: 'Consultor', ativo: false },
];

describe('UsuariosPage', () => {
  let deleteMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuthStore.setState({ usuarioId: 1 });
    vi.mocked(useUsuarios).mockReturnValue({ data: usuarios, isLoading: false } as never);
    deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeleteUsuario).mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false } as never);
  });

  it('lists usuários with their perfil and status', () => {
    render(<UsuariosPage />);
    expect(screen.getByText('Diego Fernandes')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('hides the delete button for the currently logged-in usuário', () => {
    render(<UsuariosPage />);
    const ownRow = screen.getByText('Diego Fernandes').closest('tr')!;
    const otherRow = screen.getByText('Fernanda Souza').closest('tr')!;

    expect(ownRow.querySelectorAll('button')).toHaveLength(1);
    expect(otherRow.querySelectorAll('button')).toHaveLength(2);
  });

  it('opens the create modal from "Novo usuário"', async () => {
    render(<UsuariosPage />);
    await userEvent.click(screen.getByRole('button', { name: /Novo usuário/ }));
    expect(screen.getByText('Novo usuário', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the edit modal when a row is clicked', async () => {
    render(<UsuariosPage />);
    await userEvent.click(screen.getByText('Diego Fernandes'));
    expect(screen.getByText('Editar usuário')).toBeInTheDocument();
  });

  it('confirms and deletes another usuário', async () => {
    render(<UsuariosPage />);
    const otherRow = screen.getByText('Fernanda Souza').closest('tr')!;
    await userEvent.click(otherRow.querySelectorAll('button')[1]);
    expect(screen.getByText('Remover usuário')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));

    expect(deleteMutateAsync).toHaveBeenCalledWith(2);
    expect(toast.success).toHaveBeenCalledWith('Usuário removido.');
  });

  it('toasts an error when the delete fails', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new Error('usuário é o único admin'));
    render(<UsuariosPage />);
    const otherRow = screen.getByText('Fernanda Souza').closest('tr')!;
    await userEvent.click(otherRow.querySelectorAll('button')[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));

    expect(toast.error).toHaveBeenCalledWith('usuário é o único admin');
  });

  it('closes the modal via Cancelar', async () => {
    render(<UsuariosPage />);
    await userEvent.click(screen.getByRole('button', { name: /Novo usuário/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Novo usuário', { selector: 'h2' }));
  });

  it('shows the empty state when there are no usuários', () => {
    vi.mocked(useUsuarios).mockReturnValue({ data: [], isLoading: false } as never);
    render(<UsuariosPage />);
    expect(screen.getByText('Nenhum usuário cadastrado')).toBeInTheDocument();
  });
});
