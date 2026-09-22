import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/test/queryClientWrapper';
import { useCreateCliente, useUpdateCliente } from '@/hooks/useClientes';
import { useDeleteVeiculo } from '@/hooks/useVeiculos';
import { useCepLookup } from '@/hooks/useCepLookup';
import { veiculosApi } from '@/api/endpoints/veiculos';
import { toast } from '@/store/toastStore';
import { ClienteFormModal } from './ClienteFormModal';

function renderModal(props: React.ComponentProps<typeof ClienteFormModal>) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ClienteFormModal {...props} />
    </QueryClientProvider>,
  );
}

vi.mock('@/hooks/useClientes', () => ({
  useCreateCliente: vi.fn(),
  useUpdateCliente: vi.fn(),
  clientesKeys: { all: ['clientes'] },
}));
vi.mock('@/hooks/useVeiculos', () => ({ useDeleteVeiculo: vi.fn() }));
vi.mock('@/hooks/useModelosVeiculo', () => ({
  useModelosVeiculo: vi.fn(() => ({ data: { content: [] } })),
  useCreateModeloVeiculo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/hooks/useCepLookup', () => ({ useCepLookup: vi.fn() }));
vi.mock('@/api/endpoints/veiculos', () => ({ veiculosApi: { update: vi.fn(), create: vi.fn() } }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const clienteComVeiculo = {
  id: 1,
  tipoPessoa: 'PF',
  nome: 'Carlos Eduardo',
  documento: '12345678901',
  ativo: true,
  veiculos: [{ id: 10, placa: 'MTG0001', marca: 'Volkswagen', modelo: 'Gol 1.6' }],
};

describe('ClienteFormModal', () => {
  let createMutateAsync: ReturnType<typeof vi.fn>;
  let updateMutateAsync: ReturnType<typeof vi.fn>;
  let deleteVeiculoMutateAsync: ReturnType<typeof vi.fn>;
  let buscarCep: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    updateMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    deleteVeiculoMutateAsync = vi.fn().mockResolvedValue(undefined);
    buscarCep = vi.fn().mockResolvedValue(null);
    vi.mocked(useCreateCliente).mockReturnValue({ mutateAsync: createMutateAsync, isPending: false } as never);
    vi.mocked(useUpdateCliente).mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false } as never);
    vi.mocked(useDeleteVeiculo).mockReturnValue({ mutateAsync: deleteVeiculoMutateAsync, isPending: false } as never);
    vi.mocked(useCepLookup).mockReturnValue({ buscando: false, buscar: buscarCep } as never);
    vi.mocked(veiculosApi.update).mockResolvedValue({ id: 10 } as never);
    vi.mocked(veiculosApi.create).mockResolvedValue({ id: 20 } as never);
  });

  it('labels the document field CPF for pessoa física by default', () => {
    renderModal({ open: true, onClose: vi.fn(), cliente: null });
    expect(screen.getByText('Novo cliente')).toBeInTheDocument();
    expect(screen.getByText('CPF', { exact: false })).toBeInTheDocument();
  });

  it('relabels to Razão social/CNPJ when switching to pessoa jurídica', async () => {
    renderModal({ open: true, onClose: vi.fn(), cliente: null });
    await userEvent.selectOptions(screen.getByLabelText(/Tipo de pessoa/), 'Pessoa jurídica');

    expect(screen.getByText('Razão social', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('CNPJ', { exact: false })).toBeInTheDocument();
  });

  it('masks the CPF as the user types digits', async () => {
    renderModal({ open: true, onClose: vi.fn(), cliente: null });
    const documentoInput = screen.getByLabelText(/^CPF/);
    await userEvent.type(documentoInput, '12345678901');

    expect(documentoInput).toHaveValue('123.456.789-01');
  });

  it('looks up the address on CEP blur and fills the fields it returns', async () => {
    buscarCep.mockResolvedValueOnce({ logradouro: 'Av. Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' });
    renderModal({ open: true, onClose: vi.fn(), cliente: null });

    const cepInput = screen.getByLabelText(/^CEP/);
    await userEvent.type(cepInput, '01310100');
    await userEvent.tab();

    expect(buscarCep).toHaveBeenCalledWith('01310-100');
    await waitFor(() => expect(screen.getByLabelText(/^Logradouro/)).toHaveValue('Av. Paulista'));
    expect(screen.getByLabelText(/^Cidade/)).toHaveValue('São Paulo');
  });

  it('requires a nome before saving', async () => {
    renderModal({ open: true, onClose: vi.fn(), cliente: null });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('requires a documento before saving once the field has been touched and cleared', async () => {
    renderModal({ open: true, onClose: vi.fn(), cliente: null });
    const documentoInput = screen.getByLabelText(/^CPF/);
    await userEvent.type(documentoInput, '123');
    await userEvent.clear(documentoInput);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o documento')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('creates a new cliente, sending along any new veículos', async () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose, cliente: null });

    await userEvent.type(screen.getByLabelText(/^Nome completo/), 'Fernanda Souza');
    await userEvent.type(screen.getByLabelText(/^CPF/), '98765432100');
    await userEvent.click(screen.getByRole('button', { name: /Adicionar veículo/ }));
    await userEvent.type(screen.getByLabelText(/^Placa/), 'MTG0002');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Fernanda Souza',
        veiculos: [expect.objectContaining({ placa: 'MTG0002' })],
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Cliente cadastrado com sucesso.');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the linked veículos section and lets one be edited inline when editing a cliente', async () => {
    renderModal({ open: true, onClose: vi.fn(), cliente: clienteComVeiculo as never });
    expect(screen.getByText('Editar cliente')).toBeInTheDocument();
    expect(screen.getByText('Veículos vinculados')).toBeInTheDocument();
    expect(screen.getByText('MTG0001')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Editar veículo'));
    expect(screen.getByRole('button', { name: /Concluir edição/ })).toBeInTheDocument();
  });

  it('updates an existing cliente and persists edited/new veículos through the veículo endpoints', async () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose, cliente: clienteComVeiculo as never });

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, payload: expect.objectContaining({ nome: 'Carlos Eduardo' }) }),
    );
    expect(veiculosApi.update).toHaveBeenCalledWith(10, expect.objectContaining({ placa: 'MTG0001', clienteId: 1 }));
    expect(toast.success).toHaveBeenCalledWith('Cliente atualizado com sucesso.');
    expect(onClose).toHaveBeenCalled();
  });

  it('removes a linked veículo after confirming, and toasts success', async () => {
    renderModal({ open: true, onClose: vi.fn(), cliente: clienteComVeiculo as never });

    await userEvent.click(screen.getByLabelText('Remover veículo'));
    expect(screen.getByText(/remover a placa "MTG0001"/)).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(deleteVeiculoMutateAsync).toHaveBeenCalledWith(10));
    expect(toast.success).toHaveBeenCalledWith('Veículo removido.');
    expect(screen.queryByText('MTG0001')).not.toBeInTheDocument();
  });

  it('toasts an error when removing a linked veículo fails', async () => {
    deleteVeiculoMutateAsync.mockRejectedValueOnce(new Error('veículo em uma OS ativa'));
    renderModal({ open: true, onClose: vi.fn(), cliente: clienteComVeiculo as never });

    await userEvent.click(screen.getByLabelText('Remover veículo'));
    const confirmButtons = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('veículo em uma OS ativa'));
  });

  it('toasts an error when saving the cliente fails', async () => {
    createMutateAsync.mockRejectedValueOnce(new Error('documento já cadastrado'));
    renderModal({ open: true, onClose: vi.fn(), cliente: null });

    await userEvent.type(screen.getByLabelText(/^Nome completo/), 'Fernanda Souza');
    await userEvent.type(screen.getByLabelText(/^CPF/), '98765432100');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('documento já cadastrado'));
  });
});
