import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/test/queryClientWrapper';
import { useClientes, useDeleteCliente } from '@/hooks/useClientes';
import { toast } from '@/store/toastStore';
import { ClientesPage } from './ClientesPage';

function renderPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ClientesPage />
    </QueryClientProvider>,
  );
}

vi.mock('@/hooks/useClientes', () => ({
  useClientes: vi.fn(),
  useDeleteCliente: vi.fn(),
  useCreateCliente: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateCliente: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  clientesKeys: { all: ['clientes'] },
}));
vi.mock('@/hooks/useVeiculos', () => ({ useDeleteVeiculo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })) }));
vi.mock('@/hooks/useCepLookup', () => ({ useCepLookup: vi.fn(() => ({ buscando: false, buscar: vi.fn() })) }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const clientes = {
  content: [
    {
      id: 1,
      nome: 'Carlos Eduardo',
      documento: '12345678901',
      tipoPessoa: 'PF',
      telefone: '11912345678',
      ativo: true,
      veiculos: [{ id: 10, placa: 'MTG0001' }],
    },
    { id: 2, nome: 'Fernanda LTDA', documento: '98765432000188', tipoPessoa: 'PJ', email: 'contato@fernanda.com', ativo: false, veiculos: [] },
  ],
  pageNumber: 0,
  totalPages: 1,
  totalElements: 2,
};

describe('ClientesPage', () => {
  let deleteMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(useClientes).mockReturnValue({ data: clientes, isLoading: false, isFetching: false } as never);
    deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeleteCliente).mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false } as never);
  });

  it('lists clientes with document, contato, veículos and status', () => {
    renderPage();
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-01')).toBeInTheDocument();
    expect(screen.getByText('(11) 91234-5678')).toBeInTheDocument();
    expect(screen.getByText('MTG0001')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('shows "Nenhum" for a cliente without any veículos', () => {
    renderPage();
    expect(screen.getByText('Nenhum')).toBeInTheDocument();
  });

  it('shows the pluralized total count in the subtitle', () => {
    renderPage();
    expect(screen.getByText('2 clientes cadastrados, com os veículos vinculados')).toBeInTheDocument();
  });

  it('resets to the first page when the search term changes', async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome, CPF\/CNPJ ou placa/), 'Carlos');

    expect(vi.mocked(useClientes).mock.calls.at(-1)?.[0]).toMatchObject({ page: 0, busca: 'Carlos' });
  });

  it('shows the "nada encontrado" dialog once a search resolves to zero results', async () => {
    vi.mocked(useClientes).mockReturnValue({
      data: { content: [], pageNumber: 0, totalPages: 0, totalElements: 0 },
      isLoading: false,
      isFetching: false,
    } as never);
    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome, CPF\/CNPJ ou placa/), 'xyz');

    expect(await screen.findByText('Nada encontrado')).toBeInTheDocument();
  });

  it('opens the create modal from "Novo cliente"', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Novo cliente/ }));
    expect(screen.getByText('Novo cliente', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the edit modal when a row is clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Carlos Eduardo'));
    expect(screen.getByText('Editar cliente')).toBeInTheDocument();
  });

  it('confirms and deletes a cliente', async () => {
    renderPage();
    await userEvent.click(screen.getAllByLabelText('Remover')[0]);
    const confirmButtons = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(deleteMutateAsync).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('Cliente removido.');
  });

  it('toasts an error when the delete fails', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new Error('cliente possui OS vinculada'));
    renderPage();
    await userEvent.click(screen.getAllByLabelText('Remover')[0]);
    const confirmButtons = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(toast.error).toHaveBeenCalledWith('cliente possui OS vinculada');
  });

  it('closes the create/edit modal via Cancelar', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Novo cliente/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Novo cliente', { selector: 'h2' }));
  });

  it('shows the empty state when there are no clientes', () => {
    vi.mocked(useClientes).mockReturnValue({
      data: { content: [], pageNumber: 0, totalPages: 0, totalElements: 0 },
      isLoading: false,
      isFetching: false,
    } as never);
    renderPage();
    expect(screen.getByText('Nenhum cliente cadastrado')).toBeInTheDocument();
  });
});
