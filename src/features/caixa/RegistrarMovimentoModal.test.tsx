import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useRegistrarCaixa } from '@/hooks/useFinanceiro';
import { toast } from '@/store/toastStore';
import { RegistrarMovimentoModal } from './RegistrarMovimentoModal';

vi.mock('@/hooks/useFinanceiro', () => ({ useRegistrarCaixa: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('RegistrarMovimentoModal', () => {
  it('titles and colors the confirm button for tipo ENTRADA', () => {
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<RegistrarMovimentoModal open tipo="ENTRADA" onClose={vi.fn()} />);

    expect(screen.getByText('Nova entrada', { selector: 'h2' })).toBeInTheDocument();
  });

  it('titles the modal for tipo SAIDA', () => {
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<RegistrarMovimentoModal open tipo="SAIDA" onClose={vi.fn()} />);

    expect(screen.getByText('Nova saída', { selector: 'h2' })).toBeInTheDocument();
  });

  it('requires a positive valor before submitting', async () => {
    const mutateAsync = vi.fn();
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<RegistrarMovimentoModal open tipo="ENTRADA" onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe um valor válido')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  // `tipo` vem fixo por prop (qual botão abriu o modal em MeuCaixaPage), não é
  // um campo do formulário — o payload precisa incluí-lo mesmo sem um <select>
  // correspondente.
  it('submits the payload merged with the fixed tipo prop, then closes', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync, isPending: false } as never);
    const onClose = vi.fn();
    render(<RegistrarMovimentoModal open tipo="SAIDA" onClose={onClose} />);

    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'PAGAMENTO_CONTA');
    await userEvent.selectOptions(screen.getByLabelText('Forma de pagamento'), 'PIX');
    await userEvent.type(screen.getByLabelText(/^Valor/), '75');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Pagamento fornecedor');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      categoria: 'PAGAMENTO_CONTA',
      formaPagamento: 'PIX',
      valor: 75,
      descricao: 'Pagamento fornecedor',
      tipo: 'SAIDA',
    });
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Saída registrada.'));
    expect(onClose).toHaveBeenCalled();
  });

  it('toasts the backend error message on failure, without closing', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('saldo insuficiente'));
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync, isPending: false } as never);
    const onClose = vi.fn();
    render(<RegistrarMovimentoModal open tipo="SAIDA" onClose={onClose} />);

    await userEvent.type(screen.getByLabelText(/^Valor/), '75');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('saldo insuficiente'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
