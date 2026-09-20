import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

function renderModal(props: Partial<React.ComponentProps<typeof UsuarioFormModal>> = {}) {
  return render(
    <MemoryRouter>
      <UsuarioFormModal open onClose={vi.fn()} usuario={null} {...props} />
    </MemoryRouter>,
  );
}

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
    renderModal();
    expect(screen.getByText('Novo usuário')).toBeInTheDocument();
    expect(screen.getByText('Senha', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Mínimo de 6 caracteres')).toBeInTheDocument();
  });

  it('relabels the password field as optional "Nova senha" when editing', () => {
    renderModal({
      usuario: { id: 1, nome: 'Diego', email: 'diego@ramtec.com.br', perfilId: 1, ativo: true } as never,
    });
    expect(screen.getByText('Editar usuário')).toBeInTheDocument();
    expect(screen.getByText('Nova senha')).toBeInTheDocument();
    expect(screen.getByText('Deixe em branco para manter a senha atual')).toBeInTheDocument();
    expect(screen.getByLabelText('Usuário ativo')).toBeInTheDocument();
  });

  it('requires a password when creating a new usuário', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(/^Nome/), 'Fernanda');
    await userEvent.type(screen.getByLabelText(/^E-mail/), 'fernanda@ramtec.com.br');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('A senha deve ter ao menos 6 caracteres')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('creates a new usuário with a password', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Fernanda');
    await userEvent.type(screen.getByLabelText(/^E-mail/), 'fernanda@ramtec.com.br');
    await userEvent.selectOptions(screen.getByLabelText(/Perfil de acesso/), 'Administrador');
    await userEvent.type(screen.getByLabelText(/^Senha/), 'senha123');

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
    renderModal({
      onClose,
      usuario: { id: 5, nome: 'Diego', email: 'diego@ramtec.com.br', perfilId: 1, ativo: true } as never,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, payload: expect.objectContaining({ senha: undefined }) }),
    );
    expect(toast.success).toHaveBeenCalledWith('Usuário atualizado.');
  });

  it('sends the new password when one is typed while editing', async () => {
    renderModal({
      usuario: { id: 5, nome: 'Diego', email: 'diego@ramtec.com.br', perfilId: 1, ativo: true } as never,
    });

    await userEvent.type(screen.getByLabelText('Nova senha'), 'novaSenha123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ senha: 'novaSenha123' }) }),
    );
  });

  it('toasts an error when saving fails', async () => {
    createMutateAsync.mockRejectedValueOnce(new Error('e-mail já cadastrado'));
    renderModal();

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Fernanda');
    await userEvent.type(screen.getByLabelText(/^E-mail/), 'fernanda@ramtec.com.br');
    await userEvent.selectOptions(screen.getByLabelText(/Perfil de acesso/), 'Administrador');
    await userEvent.type(screen.getByLabelText(/^Senha/), 'senha123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('e-mail já cadastrado'));
  });

  describe('limite de usuários excedido (409 LIMITE_USUARIOS_EXCEDIDO)', () => {
    function erroDeLimite(mensagem = 'Seu plano Básico permite até 2 usuários ativos. Faça upgrade para adicionar mais.') {
      return { isAxiosError: true, response: { status: 409, data: { codigo: 'LIMITE_USUARIOS_EXCEDIDO', mensagem } } };
    }

    it('shows the backend message with an upgrade CTA instead of a generic toast', async () => {
      createMutateAsync.mockRejectedValueOnce(erroDeLimite());
      renderModal();

      await userEvent.type(screen.getByLabelText(/^Nome/), 'Fernanda');
      await userEvent.type(screen.getByLabelText(/^E-mail/), 'fernanda@ramtec.com.br');
      await userEvent.selectOptions(screen.getByLabelText(/Perfil de acesso/), 'Administrador');
      await userEvent.type(screen.getByLabelText(/^Senha/), 'senha123');
      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('Limite de usuários atingido')).toBeInTheDocument();
      expect(
        screen.getByText('Seu plano Básico permite até 2 usuários ativos. Faça upgrade para adicionar mais.'),
      ).toBeInTheDocument();
      expect(toast.error).not.toHaveBeenCalled();
      // O formulário fica escondido enquanto o aviso é mostrado.
      expect(screen.queryByLabelText(/^Nome/)).not.toBeInTheDocument();
    });

    it('never shows a raw upstream error dump, even when the backend leaks one in mensagem (regressão)', async () => {
      createMutateAsync.mockRejectedValueOnce(
        erroDeLimite(
          'Falha ao comunicar com o PagBank: 401 Unauthorized: "{"error_messages":[{"code":"UNAUTHORIZED","description":"Invalid credential. Review AUTHORIZATION header"}]}"',
        ),
      );
      renderModal();

      await userEvent.type(screen.getByLabelText(/^Nome/), 'Fernanda');
      await userEvent.type(screen.getByLabelText(/^E-mail/), 'fernanda@ramtec.com.br');
      await userEvent.selectOptions(screen.getByLabelText(/Perfil de acesso/), 'Administrador');
      await userEvent.type(screen.getByLabelText(/^Senha/), 'senha123');
      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('Seu plano atingiu o limite de usuários ativos.')).toBeInTheDocument();
      expect(screen.queryByText(/error_messages/)).not.toBeInTheDocument();
      expect(screen.queryByText(/UNAUTHORIZED/)).not.toBeInTheDocument();
    });

    it('navigates to /oficina/licenca and closes the modal when "Fazer upgrade" is clicked', async () => {
      createMutateAsync.mockRejectedValueOnce(erroDeLimite());
      const onClose = vi.fn();
      renderModal({ onClose });

      await userEvent.type(screen.getByLabelText(/^Nome/), 'Fernanda');
      await userEvent.type(screen.getByLabelText(/^E-mail/), 'fernanda@ramtec.com.br');
      await userEvent.selectOptions(screen.getByLabelText(/Perfil de acesso/), 'Administrador');
      await userEvent.type(screen.getByLabelText(/^Senha/), 'senha123');
      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      await screen.findByText('Limite de usuários atingido');

      await userEvent.click(screen.getByRole('button', { name: 'Fazer upgrade' }));
      expect(onClose).toHaveBeenCalled();
    });

    it('also applies when reactivating a usuário via edição (PUT), not just criação', async () => {
      updateMutateAsync.mockRejectedValueOnce(erroDeLimite('Seu plano Pro permite até 6 usuários ativos.'));
      renderModal({
        usuario: { id: 5, nome: 'Diego', email: 'diego@ramtec.com.br', perfilId: 1, ativo: false } as never,
      });

      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('Seu plano Pro permite até 6 usuários ativos.')).toBeInTheDocument();
    });
  });
});
