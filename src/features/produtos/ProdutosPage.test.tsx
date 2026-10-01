import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProdutos, useDeleteProduto, useProdutosAbaixoDoMinimo } from '@/hooks/useProdutos';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { ProdutosPage } from './ProdutosPage';

vi.mock('@/hooks/useProdutos', () => ({
  useProdutos: vi.fn(),
  useProdutosAbaixoDoMinimo: vi.fn(),
  useDeleteProduto: vi.fn(),
  useCreateProduto: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateProduto: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useEnviarImagemProduto: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRemoverImagemProduto: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useProdutoImagemBlob: vi.fn(() => ({ data: undefined })),
}));
vi.mock('@/hooks/useEstoque', () => ({ useRegistrarMovimentacao: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })) }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const produtos = {
  content: [
    {
      id: 1,
      nome: 'Óleo Motor 10W30',
      codigo: 'OL-001',
      precoVenda: 32,
      quantidadeDisponivel: 40,
      quantidadeEstoque: 45,
      abaixoDoMinimo: false,
      categoria: 'OLEO_LUBRIFICANTE',
    },
    {
      id: 2,
      nome: 'Pastilha de Freio',
      codigo: 'PF-002',
      precoVenda: 89,
      quantidadeDisponivel: 1,
      quantidadeEstoque: 1,
      abaixoDoMinimo: true,
      categoria: 'FREIOS',
    },
  ],
  pageNumber: 0,
  totalPages: 1,
  totalElements: 2,
};

describe('ProdutosPage', () => {
  let deleteMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // ESTOQUE_WRITE por padrão — cada teste de restrição de perfil ajusta as
    // permissões que precisa (ver bloco "com apenas ESTOQUE_READ" abaixo).
    useAuthStore.setState({ permissoes: ['ESTOQUE_READ', 'ESTOQUE_WRITE'] });
    vi.mocked(useProdutos).mockReturnValue({ data: produtos, isLoading: false } as never);
    vi.mocked(useProdutosAbaixoDoMinimo).mockReturnValue({ data: [produtos.content[1]] } as never);
    deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeleteProduto).mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false } as never);
  });

  it('lists produtos with price, stock, category and status', () => {
    render(<ProdutosPage />);
    expect(screen.getByText('Óleo Motor 10W30')).toBeInTheDocument();
    expect(screen.getByText('R$ 32,00')).toBeInTheDocument();
    expect(screen.getByText('Abaixo do mínimo')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    const cards = screen.getAllByTestId('produto-card');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Óleo e lubrificante')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Freios')).toBeInTheDocument();
  });

  it('shows accurate stat cards for total produtos and low-stock count', () => {
    render(<ProdutosPage />);
    const totalCard = screen.getByText('Produtos cadastrados').parentElement!;
    expect(within(totalCard).getByText('2')).toBeInTheDocument();
    const minimoCard = screen.getByText('Abaixo do estoque mínimo', { selector: 'p' }).parentElement!;
    expect(within(minimoCard).getByText('1')).toBeInTheDocument();
  });

  it('highlights disponível and total stock on each card', () => {
    render(<ProdutosPage />);
    const [oleo, freio] = screen.getAllByTestId('produto-card');
    expect(within(oleo).getByText('40')).toBeInTheDocument();
    expect(within(oleo).getByText('45 em estoque')).toBeInTheDocument();
    expect(within(freio).getByText('1')).toBeInTheDocument();
    expect(within(freio).getByText('1 em estoque')).toBeInTheDocument();
  });

  it('toggles a categoria filter on and off, resetting to the first page', async () => {
    render(<ProdutosPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }));

    expect(useProdutos).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 0, categoria: 'FILTROS' }),
    );
    expect(useProdutosAbaixoDoMinimo).toHaveBeenLastCalledWith({ categoria: 'FILTROS' });
    expect(screen.getByRole('button', { name: 'Filtros' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    expect(useProdutos).toHaveBeenLastCalledWith(expect.objectContaining({ categoria: undefined }));
  });

  it('shows 7 featured categorias plus Outros, hiding the rest until Outros is opened', async () => {
    render(<ProdutosPage />);
    const grupo = within(screen.getByRole('group', { name: 'Filtrar por categoria' }));
    expect(grupo.getAllByRole('button')).toHaveLength(8);
    expect(screen.queryByRole('button', { name: 'Freios' })).not.toBeInTheDocument();

    await userEvent.click(grupo.getByRole('button', { name: 'Outros' }));
    await userEvent.click(screen.getByRole('button', { name: 'Freios' }));

    expect(useProdutos).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, categoria: 'FREIOS' }));
    expect(grupo.getByRole('button', { name: 'Outros' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('filters by busca (nome/código)', async () => {
    render(<ProdutosPage />);
    await userEvent.type(screen.getByPlaceholderText('Buscar por nome ou código...'), 'freio');

    expect(useProdutos).toHaveBeenLastCalledWith(expect.objectContaining({ busca: 'freio' }));
  });

  it('toggles the low-stock filtered view from its stat card', async () => {
    render(<ProdutosPage />);
    const statCard = screen.getByText('Abaixo do estoque mínimo').closest('[role="button"]')!;

    await userEvent.click(statCard);
    expect(screen.queryByText('Óleo Motor 10W30')).not.toBeInTheDocument();
    expect(screen.getByText('Pastilha de Freio')).toBeInTheDocument();
  });

  it('makes the low-stock stat card non-interactive when nothing is below the minimum', () => {
    vi.mocked(useProdutosAbaixoDoMinimo).mockReturnValue({ data: [] } as never);
    render(<ProdutosPage />);
    const statCard = screen.getByText('Abaixo do estoque mínimo').closest('div')!;
    expect(statCard.closest('[role="button"]')).not.toBeInTheDocument();
  });

  it('opens the movimentação modal from its row action', async () => {
    render(<ProdutosPage />);
    await userEvent.click(screen.getAllByLabelText('Movimentar estoque')[0]);
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

  describe('com apenas ESTOQUE_READ (ex.: Consultor Técnico, sem ESTOQUE_WRITE)', () => {
    beforeEach(() => {
      useAuthStore.setState({ permissoes: ['ESTOQUE_READ'] });
    });

    it('is read-only — no create, edit, remove or movimentar action (backend requires ESTOQUE_WRITE)', async () => {
      render(<ProdutosPage />);

      expect(screen.getByText('Óleo Motor 10W30')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Novo produto/ })).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Editar')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Remover')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Movimentar estoque')).not.toBeInTheDocument();

      await userEvent.click(screen.getByText('Óleo Motor 10W30'));
      expect(screen.queryByText('Editar produto')).not.toBeInTheDocument();
    });
  });
});
