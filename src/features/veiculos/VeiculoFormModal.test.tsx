import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateVeiculo, useUpdateVeiculo } from '@/hooks/useVeiculos';
import { useClientes } from '@/hooks/useClientes';
import { toast } from '@/store/toastStore';
import { VeiculoFormModal } from './VeiculoFormModal';

vi.mock('@/hooks/useVeiculos', () => ({
  useCreateVeiculo: vi.fn(),
  useUpdateVeiculo: vi.fn(),
}));
vi.mock('@/hooks/useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const clientes = { content: [{ id: 1, nome: 'Carlos Eduardo' }] };

describe('VeiculoFormModal', () => {
  let createMutateAsync: ReturnType<typeof vi.fn>;
  let updateMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(useClientes).mockReturnValue({ data: clientes } as never);
    createMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    updateMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useCreateVeiculo).mockReturnValue({ mutateAsync: createMutateAsync, isPending: false } as never);
    vi.mocked(useUpdateVeiculo).mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false } as never);
  });

  it('renders empty for a new veículo, defaulting the cliente when given', () => {
    render(<VeiculoFormModal open onClose={vi.fn()} veiculo={null} defaultClienteId={1} />);
    expect(screen.getByText('Novo veículo')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Cliente/ })).toHaveValue('1');
  });

  it('prefills the form when editing an existing veículo', () => {
    render(
      <VeiculoFormModal
        open
        onClose={vi.fn()}
        veiculo={{ id: 1, clienteId: 1, placa: 'MTG0001', modelo: 'CG 160', cor: 'Preta', anoFabricacao: 2022, chassi: '123' } as never}
      />,
    );
    expect(screen.getByText('Editar veículo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MTG0001')).toBeInTheDocument();
  });

  it('shows validation errors for the required fields', async () => {
    render(<VeiculoFormModal open onClose={vi.fn()} veiculo={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Selecione o cliente')).toBeInTheDocument();
    expect(screen.getByText('Informe a placa')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('filters the cliente options as the user types a search term', async () => {
    render(<VeiculoFormModal open onClose={vi.fn()} veiculo={null} />);
    await userEvent.type(screen.getByPlaceholderText('Buscar cliente pelo nome...'), 'Carlos');

    expect(vi.mocked(useClientes).mock.calls.at(-1)?.[0]).toEqual({ size: 50, nome: 'Carlos' });
  });

  it('creates a new veículo with the filled fields', async () => {
    const onClose = vi.fn();
    render(<VeiculoFormModal open onClose={onClose} veiculo={null} />);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Cliente/ }), 'Carlos Eduardo');
    await userEvent.type(screen.getByLabelText('Placa', { exact: false }), 'MTG0002');
    await userEvent.type(screen.getByLabelText(/^Modelo/), 'Fazer 250');
    await userEvent.type(screen.getByLabelText('Cor', { exact: false }), 'Vermelha');
    await userEvent.type(screen.getByLabelText('Ano de fabricação', { exact: false }), '2022');
    await userEvent.type(screen.getByLabelText('Chassi', { exact: false }), '9BWZZZ377VT004251');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: 1, placa: 'MTG0002', modelo: 'Fazer 250' }),
    );
    expect(toast.success).toHaveBeenCalledWith('Veículo cadastrado com sucesso.');
    expect(onClose).toHaveBeenCalled();
  });

  it('updates an existing veículo by id and toasts success', async () => {
    const onClose = vi.fn();
    render(
      <VeiculoFormModal
        open
        onClose={onClose}
        veiculo={{ id: 1, clienteId: 1, placa: 'MTG0001', modelo: 'CG 160', cor: 'Preta', anoFabricacao: 2022, chassi: '123' } as never}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, payload: expect.objectContaining({ placa: 'MTG0001' }) }),
    );
    expect(toast.success).toHaveBeenCalledWith('Veículo atualizado com sucesso.');
    expect(onClose).toHaveBeenCalled();
  });

  it('toasts an error when saving fails', async () => {
    updateMutateAsync.mockRejectedValueOnce(new Error('placa duplicada'));
    const onClose = vi.fn();
    render(
      <VeiculoFormModal
        open
        onClose={onClose}
        veiculo={{ id: 1, clienteId: 1, placa: 'MTG0001', modelo: 'CG 160', cor: 'Preta', anoFabricacao: 2022, chassi: '123' } as never}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('placa duplicada'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
