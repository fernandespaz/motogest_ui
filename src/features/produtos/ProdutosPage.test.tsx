import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProdutos, useDeleteProduto, useProdutosAbaixoDoMinimo } from '@/hooks/useProdutos';
import { toast } from '@/store/toastStore';
import { ProdutosPage } from './ProdutosPage';

vi.mock('@/hooks/useProdutos', () => ({
  useProdutos: vi.fn(),
  useProdutosAbaixoDoMinimo: vi.fn(),
  useDeleteProduto: vi.fn(),
  useCreateProduto: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateProduto: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/hooks/useEstoque', () => ({ useRegistrarMovimentacao: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })) }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const produtos = {
  content: [
    { id: 1, nome: 'Óleo Motor 10W30', codigo: 'OL-001', precoVenda: 32, quantidadeDisponivel: 40, quantidadeEstoque: 45, abaixoDoMinimo: false },
    { id: 2, nome: 'Pastilha de Freio', codigo: 'PF-002', precoVenda: 89, quantidadeDisponivel: 1, quantidadeEstoque: 1, abaixoDoMinimo: true },
  ],
  pageNumber: 0,
  totalPages: 1,
  totalElements: 2,
};

describe('ProdutosPage', () => {
  let deleteMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(useProdutos).mockReturnValue({ data: produtos, isLoading: false } as never);
    vi.mocked(useProdutosAbaixoDoMinimo).mockReturnValue({ data: [produtos.content[1]] } as never);
    deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeleteProduto).mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false } as never);
  });

  it('lists produtos with price, stock and status', () => {
    render(<ProdutosPage />);
    expect(screen.getByText('Óleo Motor 10W30')).toBeInTheDocument();
    expect(screen.getByText('R$ 32,00')).toBeInTheDocument();
    expect(screen.getByText('Abaixo do mínimo')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('shows the low-stock banner and toggles the filtered view', async () => {
    render(<ProdutosPage />);
    const banner = screen.getByText(/produto\(s\) abaixo do estoque mínimo/);
    expect(banner).toBeInTheDocument();

    await userEvent.click(banner);
    expect(screen.queryByText('Óleo Motor 10W30')).not.toBeInTheDocument();
    expect(screen.getByText('Pastilha de Freio')).toBeInTheDocument();
  });

  it('hides the low-stock banner when nothing is below the minimum', () => {
    vi.mocked(useProdutosAbaixoDoMinimo).mockReturnValue({ data: [] } as never);
    render(<ProdutosPage />);
    expect(screen.queryByText(/abaixo do estoque mínimo/)).not.toBeInTheDocument();
  });

  it('opens the movimentação modal from its row action', async () => {
    render(<ProdutosPage />);
    await userEvent.click(screen.getAllByLabelText('Movimentar')[0]);
    expect(screen.getByText('Movimentar estoque — Óleo Motor 10W30')).toBeInTheDocument();
  });

  it('opens the create modal from "Novo produto"', async () => {
    render(<ProdutosPage />);
    await userEvent.click(screen.getByRole('button', { name: /Novo produto/ }));
    expect(screen.getByText('Novo produto', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the edit modal when a row is clicked', async () => {
    render(<ProdutosPage />);
    await userEvent.click(screen.getByText('Óleo Motor 10W30'));
    expect(screen.getByText('Editar produto')).toBeInTheDocument();
  });

  it('confirms and deletes a produto', async () => {
    render(<ProdutosPage />);
    await userEvent.click(screen.getAllByLabelText('Remover')[0]);
    const confirmButtons = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(deleteMutateAsync).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('Produto removido.');
  });

  it('toasts an error when the delete fails', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new Error('produto em uso'));
    render(<ProdutosPage />);
    await userEvent.click(screen.getAllByLabelText('Remover')[0]);
    const confirmButtons = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(toast.error).toHaveBeenCalledWith('produto em uso');
  });

  it('closes the create/edit modal via Cancelar', async () => {
    render(<ProdutosPage />);
    await userEvent.click(screen.getByRole('button', { name: /Novo produto/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Novo produto', { selector: 'h2' }));
  });

  it('shows the empty state when there are no produtos', () => {
    vi.mocked(useProdutos).mockReturnValue({ data: { content: [] }, isLoading: false } as never);
    vi.mocked(useProdutosAbaixoDoMinimo).mockReturnValue({ data: [] } as never);
    render(<ProdutosPage />);
    expect(screen.getByText('Nenhum produto cadastrado')).toBeInTheDocument();
  });
});
