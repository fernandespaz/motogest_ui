import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateUsuario, useUpdateUsuario } from '@/hooks/useUsuarios';
import { usePerfis } from '@/hooks/usePerfis';
import { toast } from '@/store/toastStore';
import { UsuarioFormModal } from './UsuarioFormModal';

vi.mock('@/hooks/useUsuarios', () => ({
  useCreateUsuario: vi.fn(),
  useUpdateUsuario: vi.fn(),
}));
vi.mock('@/hooks/usePerfis', () => ({ usePerfis: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('UsuarioFormModal', () => {
  let createMutateAsync: ReturnType<typeof vi.fn>;
  let updateMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(usePerfis).mockReturnValue({ data: [{ id: 1, nome: 'Administrador' }] } as never);
    createMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    updateMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useCreateUsuario).mockReturnValue({ mutateAsync: createMutateAsync, isPending: false } as never);
    vi.mocked(useUpdateUsuario).mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false } as never);
  });

  it('labels the password field as required "Senha" for a new usuário', () => {
    render(<UsuarioFormModal open onClose={vi.fn()} usuario={null} />);
    expect(screen.getByText('Novo usuário')).toBeInTheDocument();
    expect(screen.getByText('Senha', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Mínimo de 6 caracteres')).toBeInTheDocument();
  });

  it('relabels the password field as optional "Nova senha" when editing', () => {
    render(
      <UsuarioFormModal
        open
        onClose={vi.fn()}
        usuario={{ id: 1, nome: 'Diego', email: 'diego@ramtec.com.br', perfilId: 1, ativo: true } as never}
      />,
    );
    expect(screen.getByText('Editar usuário')).toBeInTheDocument();
    expect(screen.getByText('Nova senha')).toBeInTheDocument();
    expect(screen.getByText('Deixe em branco para manter a senha atual')).toBeInTheDocument();
    expect(screen.getByLabelText('Usuário ativo')).toBeInTheDocument();
  });

  it('requires a password when creating a new usuário', async () => {
    render(<UsuarioFormModal open onClose={vi.fn()} usuario={null} />);
    await userEvent.type(screen.getByLabelText(/^Nome/), 'Fernanda');
    await userEvent.type(screen.getByLabelText(/^E-mail/), 'fernanda@ramtec.com.br');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('A senha deve ter ao menos 6 caracteres')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('creates a new usuário with a password', async () => {
    const onClose = vi.fn();
    render(<UsuarioFormModal open onClose={onClose} usuario={null} />);

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Fernanda');
    await userEvent.type(screen.getByLabelText(/^E-mail/), 'fernanda@ramtec.com.br');
    await userEvent.selectOptions(screen.getByLabelText(/Perfil de acesso/), 'Administrador');
    await userEvent.type(screen.getByLabelText('Senha', { exact: false }), 'senha123');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Fernanda', email: 'fernanda@ramtec.com.br', senha: 'senha123' }),
    );
    expect(toast.success).toHaveBeenCalledWith('Usuário cadastrado.');
    expect(onClose).toHaveBeenCalled();
  });

  it('updates an existing usuário without requiring a new password, sending senha: undefined', async () => {
    const onClose = vi.fn();
    render(
      <UsuarioFormModal
        open
        onClose={onClose}
        usuario={{ id: 5, nome: 'Diego', email: 'diego@ramtec.com.br', perfilId: 1, ativo: true } as never}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, payload: expect.objectContaining({ senha: undefined }) }),
    );
    expect(toast.success).toHaveBeenCalledWith('Usuário atualizado.');
  });

  it('sends the new password when one is typed while editing', async () => {
    render(
      <UsuarioFormModal
        open
        onClose={vi.fn()}
        usuario={{ id: 5, nome: 'Diego', email: 'diego@ramtec.com.br', perfilId: 1, ativo: true } as never}
      />,
    );

    await userEvent.type(screen.getByLabelText('Nova senha'), 'novaSenha123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ senha: 'novaSenha123' }) }),
    );
  });

  it('toasts an error when saving fails', async () => {
    createMutateAsync.mockRejectedValueOnce(new Error('e-mail já cadastrado'));
    render(<UsuarioFormModal open onClose={vi.fn()} usuario={null} />);

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Fernanda');
    await userEvent.type(screen.getByLabelText(/^E-mail/), 'fernanda@ramtec.com.br');
    await userEvent.selectOptions(screen.getByLabelText(/Perfil de acesso/), 'Administrador');
    await userEvent.type(screen.getByLabelText('Senha', { exact: false }), 'senha123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('e-mail já cadastrado'));
  });
});
