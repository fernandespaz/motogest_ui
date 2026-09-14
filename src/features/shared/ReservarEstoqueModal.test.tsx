import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useReservarEstoque } from '@/hooks/useReservasEstoque';
import { toast } from '@/store/toastStore';
import { ReservarEstoqueModal } from './ReservarEstoqueModal';

vi.mock('@/hooks/useReservasEstoque', () => ({ useReservarEstoque: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const baseProps = {
  open: true,
  onClose: vi.fn(),
  referenciaTipo: 'ORDEM_SERVICO' as const,
  referenciaId: 1,
  produtoId: 5,
  produtoNome: 'Óleo Motor 10W30',
  quantidadeSugerida: 2,
  estoqueDisponivel: 40,
};

describe('ReservarEstoqueModal', () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useReservarEstoque).mockReturnValue({ mutateAsync, isPending: false } as never);
  });

  it('shows the produto and its available stock', () => {
    render(<ReservarEstoqueModal {...baseProps} />);
    expect(screen.getByText('Óleo Motor 10W30')).toBeInTheDocument();
    expect(screen.getByText('Estoque disponível: 40')).toBeInTheDocument();
  });

  it('pre-fills the quantity with the smaller of quantidadeSugerida and estoqueDisponivel', () => {
    render(<ReservarEstoqueModal {...baseProps} quantidadeSugerida={100} estoqueDisponivel={5} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(5);
  });

  it('falls back to 1 when the suggested quantity resolves to zero/invalid', () => {
    render(<ReservarEstoqueModal {...baseProps} quantidadeSugerida={0} estoqueDisponivel={40} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(1);
  });

  it('shows a validation error and disables "Reservar" when the quantity exceeds stock', async () => {
    render(<ReservarEstoqueModal {...baseProps} estoqueDisponivel={5} quantidadeSugerida={5} />);
    const qtdInput = screen.getByRole('spinbutton');

    await userEvent.clear(qtdInput);
    await userEvent.type(qtdInput, '20');

    expect(screen.getByText('Quantidade inválida ou maior que o disponível')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reservar' })).toBeDisabled();
  });

  it('submits the reservation, toasts success, and closes', async () => {
    const onClose = vi.fn();
    render(<ReservarEstoqueModal {...baseProps} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reservar' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      produtoId: 5,
      payload: { quantidade: 2, referenciaTipo: 'ORDEM_SERVICO', referenciaId: 1 },
    });
    expect(toast.success).toHaveBeenCalledWith('Estoque reservado.');
    expect(onClose).toHaveBeenCalled();
  });

  it('toasts an error and keeps the modal open when the reservation fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('sem estoque'));
    const onClose = vi.fn();
    render(<ReservarEstoqueModal {...baseProps} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reservar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('sem estoque'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets the quantity and closes on Cancelar', async () => {
    const onClose = vi.fn();
    render(<ReservarEstoqueModal {...baseProps} onClose={onClose} />);
    const qtdInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtdInput);
    await userEvent.type(qtdInput, '10');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
  });
});
