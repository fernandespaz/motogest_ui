import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVeiculos, useDeleteVeiculo } from '@/hooks/useVeiculos';
import { useBuscaVeiculosPorPlaca, useClientes } from '@/hooks/useClientes';
import { useAuthStore } from '@/store/authStore';
import { useModelosVeiculo } from '@/hooks/useModelosVeiculo';
import { toast } from '@/store/toastStore';
import { VeiculosPage } from './VeiculosPage';

vi.mock('@/hooks/useVeiculos', () => ({
  useVeiculos: vi.fn(),
  useDeleteVeiculo: vi.fn(),
  useCreateVeiculo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateVeiculo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/hooks/useClientes', () => ({ useClientes: vi.fn(), useBuscaVeiculosPorPlaca: vi.fn() }));
vi.mock('@/hooks/useModelosVeiculo', () => ({
  useModelosVeiculo: vi.fn(() => ({ data: { content: [] } })),
  useCreateModeloVeiculo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const veiculos = {
  content: [{ id: 1, placa: 'MTG0001', marca: 'Volkswagen', modelo: 'Gol 1.6', clienteNome: 'Carlos Eduardo', kmAtual: 12000 }],
  pageNumber: 0,
  totalPages: 1,
  totalElements: 1,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <VeiculosPage />
    </MemoryRouter>,
  );
}

describe('VeiculosPage', () => {
  let deleteMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(useVeiculos).mockReturnValue({ data: veiculos, isLoading: false } as never);
    vi.mocked(useClientes).mockReturnValue({ data: { totalElements: 5 }, isLoading: false } as never);
    vi.mocked(useBuscaVeiculosPorPlaca).mockReturnValue({ data: [], isLoading: false } as never);
    useAuthStore.setState({ permissoes: ['VEICULO_READ', 'CLIENTE_READ'] });
    deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeleteVeiculo).mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false } as never);
  });

  it('shows the catalog thumbnail for a row whose marca/modelo matches an entry', () => {
    vi.mocked(useModelosVeiculo).mockReturnValue({
      data: { content: [{ id: 1, marca: 'Volkswagen', modelo: 'Gol 1.6', imagemBase64: 'aGVsbG8=' }] },
    } as never);
    const { container } = renderPage();
    expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/jpeg;base64,aGVsbG8=');
  });

  it('falls back to the generic icon when no catalog entry matches the row', () => {
    renderPage();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('lists veículos with their placa, marca/modelo, and cliente', () => {
    renderPage();
    expect(screen.getByText('MTG0001')).toBeInTheDocument();
    expect(screen.getByText('Volkswagen Gol 1.6')).toBeInTheDocument();
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
  });

  it('shows only the empty-state "Cadastrar cliente" action when there are no clientes yet, not a header button too', async () => {
    vi.mocked(useClientes).mockReturnValue({ data: { totalElements: 0 }, isLoading: false } as never);
    vi.mocked(useVeiculos).mockReturnValue({
      data: { content: [], pageNumber: 0, totalPages: 1, totalElements: 0 },
      isLoading: false,
    } as never);
    renderPage();

    expect(screen.getByText('Cadastre um cliente primeiro')).toBeInTheDocument();
    const botoes = screen.getAllByRole('button', { name: /Cadastrar cliente/ });
    expect(botoes).toHaveLength(1);
    await userEvent.click(botoes[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/clientes');
  });

  it('opens the create modal when there are clientes available', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Novo veículo/ }));
    expect(screen.getByText('Novo veículo', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the edit modal when a row is clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByText('MTG0001'));
    expect(screen.getByText('Editar veículo')).toBeInTheDocument();
  });

  it('confirms and deletes a veículo', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Remover'));
    expect(screen.getByText(/remover a placa "MTG0001"/)).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(deleteMutateAsync).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('Veículo removido.');
  });

  it('opens the edit modal from the row’s pencil button', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Editar'));
    expect(screen.getByText('Editar veículo')).toBeInTheDocument();
  });

  it('toasts an error when the delete fails', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new Error('veículo possui OS vinculada'));
    renderPage();
    await userEvent.click(screen.getByLabelText('Remover'));
    const confirmButtons = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(toast.error).toHaveBeenCalledWith('veículo possui OS vinculada');
  });

  it('closes the create/edit modal via its own Cancelar', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Novo veículo/ }));
    expect(screen.getByText('Novo veículo', { selector: 'h2' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Novo veículo', { selector: 'h2' }));
  });

  it('dismisses the delete confirmation via Cancelar', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Remover'));
    expect(screen.getByText('Remover veículo')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Remover veículo'));
  });

  it('offers the empty-state "Novo veículo" action when there are clientes but no veículos yet', async () => {
    vi.mocked(useVeiculos).mockReturnValue({
      data: { content: [], pageNumber: 0, totalPages: 1, totalElements: 0 },
      isLoading: false,
    } as never);
    renderPage();

    const buttons = screen.getAllByRole('button', { name: /Novo veículo/ });
    await userEvent.click(buttons[buttons.length - 1]);
    expect(screen.getByText('Novo veículo', { selector: 'h2' })).toBeInTheDocument();
  });

  it('paginates when there is more than one page of veículos', async () => {
    vi.mocked(useVeiculos).mockReturnValue({
      data: { ...veiculos, totalPages: 2, totalElements: 21 },
      isLoading: false,
    } as never);
    renderPage();

    expect(screen.getByText('21 registros')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(useVeiculos).toHaveBeenLastCalledWith({ page: 1, size: 20 }, { enabled: true });
  });

  it('searches by plate and shows only the matching vehicles, without pagination', async () => {
    vi.mocked(useBuscaVeiculosPorPlaca).mockImplementation(
      (termo: string) =>
        ({
          data: termo ? [{ id: 7, placa: 'ABC1D23', marca: 'Chevrolet', modelo: 'Onix', clienteNome: 'Fernanda' }] : [],
          isLoading: false,
        }) as never,
    );
    renderPage();
    await userEvent.type(screen.getByLabelText('Buscar veículo por placa'), 'abc-1d');

    expect(await screen.findByText('ABC1D23')).toBeInTheDocument();
    expect(screen.queryByText('MTG0001')).not.toBeInTheDocument();
    expect(useBuscaVeiculosPorPlaca).toHaveBeenLastCalledWith('abc-1d', { enabled: true });
  });

  it('explains an empty plate search instead of offering to create a vehicle', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Buscar veículo por placa'), 'ZZZ9');
    expect(await screen.findByText('Nenhum veículo com essa placa')).toBeInTheDocument();
  });

  it('hides the plate search for profiles without CLIENTE_READ', () => {
    useAuthStore.setState({ permissoes: ['VEICULO_READ'] });
    renderPage();
    expect(screen.queryByLabelText('Buscar veículo por placa')).not.toBeInTheDocument();
  });
});
