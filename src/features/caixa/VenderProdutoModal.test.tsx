import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVenderProdutos } from '@/hooks/useVendaCaixa';
import { useProdutos } from '@/hooks/useProdutos';
import { toast } from '@/store/toastStore';
import { VenderProdutoModal } from './VenderProdutoModal';

vi.mock('@/hooks/useVendaCaixa', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useVendaCaixa')>()),
  useVenderProdutos: vi.fn(),
}));
vi.mock('@/hooks/useProdutos', () => ({ useProdutos: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sessao = { id: 7, identificador: 'CX-0007', status: 'ABERTO' as const };
const produtos = [
  { id: 1, nome: 'Filtro de óleo', codigo: 'FO-1', precoVenda: 30, quantidadeDisponivel: 2, ativo: true },
  { id: 3, nome: 'Brinde', codigo: 'BR-1', precoVenda: 0, quantidadeDisponivel: 5, ativo: true },
  { id: 2, nome: 'Pastilha', codigo: 'PA-1', precoVenda: 80, quantidadeDisponivel: 0, ativo: true },
];

describe('VenderProdutoModal', () => {
  beforeEach(() => {
    vi.mocked(useProdutos).mockReturnValue({ data: { content: produtos }, isFetching: false } as never);
    vi.mocked(useVenderProdutos).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });

  it('blocks products without available stock', () => {
    render(<VenderProdutoModal open sessao={sessao} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Adicionar Pastilha' })).toBeDisabled();
  });

  it('blocks products without a sale price', () => {
    render(<VenderProdutoModal open sessao={sessao} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Adicionar Brinde' })).toBeDisabled();
  });

  it('caps the quantity at the available stock and totals the sale', async () => {
    render(<VenderProdutoModal open sessao={sessao} onClose={vi.fn()} />);

    const adicionar = screen.getByRole('button', { name: 'Adicionar Filtro de óleo' });
    await userEvent.click(adicionar);
    await userEvent.click(adicionar);
    expect(adicionar).toBeDisabled();
    await userEvent.click(adicionar);

    expect(screen.getByLabelText('Quantidade de Filtro de óleo')).toHaveTextContent('2');
    expect(screen.getByText('R$ 60,00', { selector: 'span' })).toBeInTheDocument();
  });

  it('confirms the sale tied to the session, then closes', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useVenderProdutos).mockReturnValue({ mutateAsync, isPending: false } as never);
    const onClose = vi.fn();
    render(<VenderProdutoModal open sessao={sessao} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar Filtro de óleo' }));
    await userEvent.selectOptions(screen.getByLabelText('Forma de pagamento'), 'PIX');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar venda' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      sessaoId: 7,
      sessaoIdentificador: 'CX-0007',
      formaPagamento: 'PIX',
      itens: [{ produtoId: 1, nome: 'Filtro de óleo', quantidade: 1, precoUnitario: 30 }],
    });
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Venda registrada.'));
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the cart open and toasts when the sale fails', async () => {
    vi.mocked(useVenderProdutos).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('estoque insuficiente')),
      isPending: false,
    } as never);
    const onClose = vi.fn();
    render(<VenderProdutoModal open sessao={sessao} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar Filtro de óleo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar venda' }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('estoque insuficiente'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
