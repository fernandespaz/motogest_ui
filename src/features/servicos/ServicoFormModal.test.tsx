import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateServico, useUpdateServico } from '@/hooks/useServicos';
import { toast } from '@/store/toastStore';
import { ServicoFormModal } from './ServicoFormModal';

vi.mock('@/hooks/useServicos', () => ({
  useCreateServico: vi.fn(),
  useUpdateServico: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

async function preencherTempos() {
  await userEvent.type(screen.getByLabelText('Tempo mín. (h)', { exact: false }), '1');
  await userEvent.type(screen.getByLabelText('Tempo máx. (h)', { exact: false }), '2');
}

describe('ServicoFormModal', () => {
  let createMutateAsync: ReturnType<typeof vi.fn>;
  let updateMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    updateMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useCreateServico).mockReturnValue({ mutateAsync: createMutateAsync, isPending: false } as never);
    vi.mocked(useUpdateServico).mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false } as never);
  });

  it('renders empty for a new serviço, without the "ativo" toggle', () => {
    render(<ServicoFormModal open onClose={vi.fn()} servico={null} />);
    expect(screen.getByText('Novo serviço')).toBeInTheDocument();
    expect(screen.queryByLabelText('Serviço ativo')).not.toBeInTheDocument();
  });

  it('prefills the form and shows the "ativo" toggle when editing', () => {
    render(
      <ServicoFormModal
        open
        onClose={vi.fn()}
        servico={{ id: 1, nome: 'Troca de Óleo', categoria: 'A', tempoMinHoras: 0.5, tempoMaxHoras: 1, ativo: true } as never}
      />,
    );
    expect(screen.getByText('Editar serviço')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Troca de Óleo')).toBeInTheDocument();
    expect(screen.getByLabelText('Serviço ativo')).toBeInTheDocument();
  });

  it('shows a validation error when submitting without a nome', async () => {
    render(<ServicoFormModal open onClose={vi.fn()} servico={null} />);
    await preencherTempos();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a tempo máximo smaller than the tempo mínimo', async () => {
    render(<ServicoFormModal open onClose={vi.fn()} servico={null} />);
    await userEvent.type(screen.getByLabelText('Nome', { exact: false }), 'Alinhamento');
    await userEvent.type(screen.getByLabelText('Tempo mín. (h)', { exact: false }), '2');
    await userEvent.type(screen.getByLabelText('Tempo máx. (h)', { exact: false }), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('O tempo máximo precisa ser maior ou igual ao mínimo')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('creates a new serviço and closes on success', async () => {
    const onClose = vi.fn();
    render(<ServicoFormModal open onClose={onClose} servico={null} />);

    await userEvent.type(screen.getByLabelText('Nome', { exact: false }), 'Alinhamento');
    await userEvent.selectOptions(screen.getByLabelText('Categoria', { exact: false }), 'B');
    await preencherTempos();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Alinhamento', categoria: 'B', tempoMinHoras: 1, tempoMaxHoras: 2 }),
    );
    expect(toast.success).toHaveBeenCalledWith('Serviço cadastrado.');
    expect(onClose).toHaveBeenCalled();
  });

  it('updates an existing serviço by id', async () => {
    const onClose = vi.fn();
    render(
      <ServicoFormModal
        open
        onClose={onClose}
        servico={{ id: 5, nome: 'Troca de Óleo', categoria: 'A', tempoMinHoras: 0.5, tempoMaxHoras: 1 } as never}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, payload: expect.objectContaining({ nome: 'Troca de Óleo', categoria: 'A' }) }),
    );
    expect(toast.success).toHaveBeenCalledWith('Serviço atualizado.');
  });

  it('toasts an error and keeps the modal open when saving fails', async () => {
    createMutateAsync.mockRejectedValueOnce(new Error('falhou'));
    const onClose = vi.fn();
    render(<ServicoFormModal open onClose={onClose} servico={null} />);

    await userEvent.type(screen.getByLabelText('Nome', { exact: false }), 'Alinhamento');
    await preencherTempos();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('falhou'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
