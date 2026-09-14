import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRegistrarMovimentacao } from '@/hooks/useEstoque';
import { toast } from '@/store/toastStore';
import { MovimentacaoModal } from './MovimentacaoModal';

vi.mock('@/hooks/useEstoque', () => ({ useRegistrarMovimentacao: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const produto = { id: 1, nome: 'Óleo Motor 10W30', quantidadeDisponivel: 40, quantidadeReservada: 5 };

describe('MovimentacaoModal', () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useRegistrarMovimentacao).mockReturnValue({ mutateAsync, isPending: false } as never);
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
});
