import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreatePerfil, useUpdatePerfil, usePermissoesDisponiveis } from '@/hooks/usePerfis';
import { toast } from '@/store/toastStore';
import { PerfilFormModal } from './PerfilFormModal';

vi.mock('@/hooks/usePerfis', () => ({
  useCreatePerfil: vi.fn(),
  useUpdatePerfil: vi.fn(),
  usePermissoesDisponiveis: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const permissoes = [
  { id: 1, codigo: 'CLIENTE_READ', descricao: 'Ver clientes' },
  { id: 2, codigo: 'CLIENTE_WRITE', descricao: 'Editar clientes' },
  { id: 3, codigo: 'ORDEM_SERVICO_READ', descricao: 'Ver ordens de serviço' },
];

describe('PerfilFormModal', () => {
  let createMutateAsync: ReturnType<typeof vi.fn>;
  let updateMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(usePermissoesDisponiveis).mockReturnValue({ data: permissoes } as never);
    createMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    updateMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useCreatePerfil).mockReturnValue({ mutateAsync: createMutateAsync, isPending: false } as never);
    vi.mocked(useUpdatePerfil).mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false } as never);
  });

  it('lists every available permission as a checkbox, and offers presets only when creating', () => {
    render(<PerfilFormModal open onClose={vi.fn()} perfil={null} />);
    expect(screen.getByLabelText('Ver clientes')).toBeInTheDocument();
    expect(screen.getByLabelText('Editar clientes')).toBeInTheDocument();
    expect(screen.getByText('Aplicar modelo')).toBeInTheDocument();
  });

  it('hides the preset selector when editing an existing perfil', () => {
    render(
      <PerfilFormModal
        open
        onClose={vi.fn()}
        perfil={{ id: 1, nome: 'Operacional', permissoes: [{ codigo: 'CLIENTE_READ' }] } as never}
      />,
    );
    expect(screen.getByText('Editar perfil de acesso')).toBeInTheDocument();
    expect(screen.queryByText('Aplicar modelo')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ver clientes')).toBeChecked();
  });

  it('applies the OPERACIONAL preset, checking its predefined permissions', async () => {
    render(<PerfilFormModal open onClose={vi.fn()} perfil={null} />);

    await userEvent.selectOptions(screen.getByLabelText('Aplicar modelo'), 'Operacional — foco em OS');

    expect(screen.getByLabelText('Ver clientes')).toBeChecked();
    expect(screen.getByLabelText('Ver ordens de serviço')).toBeChecked();
    expect(screen.getByLabelText('Editar clientes')).not.toBeChecked();
  });

  it('applies the ADMIN preset by checking every available permission', async () => {
    render(<PerfilFormModal open onClose={vi.fn()} perfil={null} />);

    await userEvent.selectOptions(screen.getByLabelText('Aplicar modelo'), 'Administrador — acesso total');

    expect(screen.getByLabelText('Ver clientes')).toBeChecked();
    expect(screen.getByLabelText('Editar clientes')).toBeChecked();
    expect(screen.getByLabelText('Ver ordens de serviço')).toBeChecked();
  });

  it('toggles an individual permission checkbox independently', async () => {
    render(<PerfilFormModal open onClose={vi.fn()} perfil={null} />);
    const checkbox = screen.getByLabelText('Ver clientes');

    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('requires at least one permission before saving', async () => {
    render(<PerfilFormModal open onClose={vi.fn()} perfil={null} />);
    await userEvent.type(screen.getByLabelText(/^Nome/), 'Novo Perfil');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Selecione ao menos uma permissão')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('creates a new perfil with the selected permissions', async () => {
    const onClose = vi.fn();
    render(<PerfilFormModal open onClose={onClose} perfil={null} />);

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Recepção');
    await userEvent.click(screen.getByLabelText('Ver clientes'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Recepção', permissoes: ['CLIENTE_READ'] }),
    );
    expect(toast.success).toHaveBeenCalledWith('Perfil cadastrado.');
    expect(onClose).toHaveBeenCalled();
  });

  it('updates an existing perfil by id', async () => {
    render(
      <PerfilFormModal
        open
        onClose={vi.fn()}
        perfil={{ id: 7, nome: 'Operacional', permissoes: [{ codigo: 'CLIENTE_READ' }] } as never}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, payload: expect.objectContaining({ nome: 'Operacional' }) }),
    );
    expect(toast.success).toHaveBeenCalledWith('Perfil atualizado.');
  });

  it('toasts an error when saving fails', async () => {
    createMutateAsync.mockRejectedValueOnce(new Error('nome já usado'));
    render(<PerfilFormModal open onClose={vi.fn()} perfil={null} />);

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Recepção');
    await userEvent.click(screen.getByLabelText('Ver clientes'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('nome já usado'));
  });
});
