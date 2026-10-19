import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRegistrarMovimentacao } from '@/hooks/useEstoque';
import { useCategoriasFinanceiras } from '@/hooks/useFinanceiro';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { MovimentacaoModal } from './MovimentacaoModal';

vi.mock('@/hooks/useEstoque', () => ({ useRegistrarMovimentacao: vi.fn() }));
vi.mock('@/hooks/useFinanceiro', () => ({ useCategoriasFinanceiras: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const produto = { id: 1, nome: 'Óleo Motor 10W30', quantidadeDisponivel: 40, quantidadeReservada: 5 };

describe('MovimentacaoModal', () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useRegistrarMovimentacao).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useCategoriasFinanceiras).mockReturnValue({ data: [{ id: 8, nome: 'Peças e insumos' }, { id: 9, nome: 'Ferramentas' }] } as never);
    useAuthStore.setState({ permissoes: ['ESTOQUE_WRITE'] });
  });

  it('shows the produto name in the title and its available/reserved stock', () => {
    render(<MovimentacaoModal open onClose={vi.fn()} produto={produto as never} />);
    expect(screen.getByText('Movimentar estoque — Óleo Motor 10W30')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('requires a positive quantidade', async () => {
    render(<MovimentacaoModal open onClose={vi.fn()} produto={produto as never} />);
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Informe uma quantidade positiva')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('registers a movimentação for the given produto and type', async () => {
    const onClose = vi.fn();
    render(<MovimentacaoModal open onClose={onClose} produto={produto as never} />);

    await userEvent.selectOptions(screen.getByLabelText(/Tipo de movimentação/), 'Saída');
    await userEvent.type(screen.getByLabelText(/Quantidade/), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith({
      produtoId: 1,
      payload: expect.objectContaining({ tipo: 'SAIDA', quantidade: 3 }),
    });
    expect(toast.success).toHaveBeenCalledWith('Movimentação registrada.');
    expect(onClose).toHaveBeenCalled();
  });

  it('does nothing on submit when there is no produto selected', async () => {
    render(<MovimentacaoModal open onClose={vi.fn()} produto={null} />);
    await userEvent.type(screen.getByLabelText(/Quantidade/), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('toasts an error when registering fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('estoque insuficiente'));
    render(<MovimentacaoModal open onClose={vi.fn()} produto={produto as never} />);

    await userEvent.type(screen.getByLabelText(/Quantidade/), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('estoque insuficiente'));
  });

  describe('compra (conta a pagar)', () => {
    beforeEach(() => useAuthStore.setState({ permissoes: ['ESTOQUE_WRITE', 'FINANCEIRO_WRITE'] }));

    it('does not offer the payable to someone without FINANCEIRO_WRITE', () => {
      useAuthStore.setState({ permissoes: ['ESTOQUE_WRITE'] });
      render(<MovimentacaoModal open onClose={vi.fn()} produto={produto as never} />);
      expect(screen.queryByLabelText('Gerar a conta a pagar desta compra')).not.toBeInTheDocument();
    });

    it('only offers it for an entrada', async () => {
      render(<MovimentacaoModal open onClose={vi.fn()} produto={produto as never} />);
      expect(screen.getByLabelText('Gerar a conta a pagar desta compra')).toBeInTheDocument();
      await userEvent.selectOptions(screen.getByLabelText(/Tipo de movimentação/), 'Saída');
      expect(screen.queryByLabelText('Gerar a conta a pagar desta compra')).not.toBeInTheDocument();
    });

    it('sends the supplier, total, due date and category along with the entrada', async () => {
      render(<MovimentacaoModal open onClose={vi.fn()} produto={produto as never} />);
      await userEvent.type(screen.getByLabelText(/Quantidade/), '12');
      await userEvent.click(screen.getByLabelText('Gerar a conta a pagar desta compra'));
      await userEvent.type(screen.getByLabelText(/^Fornecedor/), 'Auto Peças Veloz');
      await userEvent.type(screen.getByLabelText(/^Valor total da compra/), '480.5');
      await userEvent.type(screen.getByLabelText(/^Vencimento/), '2026-11-10');
      await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'Ferramentas');
      await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

      await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
      expect(mutateAsync).toHaveBeenCalledWith({
        produtoId: 1,
        payload: expect.objectContaining({
          tipo: 'ENTRADA',
          quantidade: 12,
          contaPagar: { fornecedor: 'Auto Peças Veloz', valor: 480.5, dataVencimento: '2026-11-10', categoriaId: 9, documento: undefined },
        }),
      });
      expect(toast.success).toHaveBeenCalledWith('Entrada registrada e conta a pagar criada.');
    });

    it('asks for the missing payable fields instead of silently skipping the account', async () => {
      render(<MovimentacaoModal open onClose={vi.fn()} produto={produto as never} />);
      await userEvent.type(screen.getByLabelText(/Quantidade/), '2');
      await userEvent.click(screen.getByLabelText('Gerar a conta a pagar desta compra'));
      await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

      expect(await screen.findByText('Informe o fornecedor')).toBeInTheDocument();
      expect(screen.getByText('Informe o valor da compra')).toBeInTheDocument();
      expect(screen.getByText('Informe o vencimento')).toBeInTheDocument();
      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('registers a plain entrada, with no payable, when the box is left unchecked', async () => {
      render(<MovimentacaoModal open onClose={vi.fn()} produto={produto as never} />);
      await userEvent.type(screen.getByLabelText(/Quantidade/), '4');
      await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
      await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
      expect(mutateAsync.mock.calls[0][0].payload.contaPagar).toBeUndefined();
    });
  });
});
