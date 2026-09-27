import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useAbrirCaixaSessao } from '@/hooks/useFinanceiro';
import { AbrirCaixaModal } from './AbrirCaixaModal';

vi.mock('@/hooks/useFinanceiro', () => ({ useAbrirCaixaSessao: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('AbrirCaixaModal', () => {
  it('requires a turno before submitting', async () => {
    const mutateAsync = vi.fn();
    vi.mocked(useAbrirCaixaSessao).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<AbrirCaixaModal open onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir caixa' }));

    expect(await screen.findByText('Informe o turno')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a negative saldo inicial', async () => {
    const mutateAsync = vi.fn();
    vi.mocked(useAbrirCaixaSessao).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<AbrirCaixaModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/^Turno/), 'Manhã');
    // userEvent.type digitaria "-" e "5" e "0" caractere a caractere — um
    // <input type="number"> rejeita o estado intermediário "-" sozinho, então
    // o valor final não fica confiável; fireEvent.change aplica o valor final
    // de uma vez, testando só a validação em si.
    fireEvent.change(screen.getByLabelText('Dinheiro (R$)'), { target: { value: '-50' } });
    await userEvent.click(screen.getByRole('button', { name: 'Abrir caixa' }));

    expect(await screen.findAllByText('Informe um valor válido')).not.toHaveLength(0);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('submits the turno and saldo inicial per forma de pagamento, then closes', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 1, status: 'ABERTO' });
    vi.mocked(useAbrirCaixaSessao).mockReturnValue({ mutateAsync, isPending: false } as never);
    const onClose = vi.fn();
    render(<AbrirCaixaModal open onClose={onClose} />);

    await userEvent.type(screen.getByLabelText(/^Turno/), 'Manhã');
    await userEvent.type(screen.getByLabelText('Dinheiro (R$)'), '100');
    await userEvent.type(screen.getByLabelText('Pix (R$)'), '50');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir caixa' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      turno: 'Manhã',
      saldoInicialDinheiro: 100,
      saldoInicialCartao: 0,
      saldoInicialPix: 50,
      saldoInicialTransferencia: 0,
    });
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('closes without saving via Cancelar', async () => {
    vi.mocked(useAbrirCaixaSessao).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    const onClose = vi.fn();
    render(<AbrirCaixaModal open onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
  });
});
