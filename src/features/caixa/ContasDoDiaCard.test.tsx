import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useContasPagarPendentes,
  useContasReceberPendentes,
  usePagarConta,
  useReceberConta,
  useSituacaoFechamento,
} from '@/hooks/useFinanceiro';
import { toast } from '@/store/toastStore';
import { ContasDoDiaCard } from './ContasDoDiaCard';

vi.mock('@/hooks/useFinanceiro', () => ({
  useContasPagarPendentes: vi.fn(),
  useContasReceberPendentes: vi.fn(),
  usePagarConta: vi.fn(),
  useReceberConta: vi.fn(),
  useSituacaoFechamento: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const dia = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');

describe('ContasDoDiaCard', () => {
  const pagar = vi.fn();
  const receber = vi.fn();

  beforeEach(() => {
    pagar.mockReset().mockResolvedValue({});
    receber.mockReset().mockResolvedValue({});
    vi.mocked(useContasPagarPendentes).mockReturnValue({
      data: [{ id: 1, descricao: 'Aluguel', fornecedor: 'Imobiliária', valor: 1000, dataVencimento: dia(-2) }],
      isLoading: false,
    } as never);
    vi.mocked(useContasReceberPendentes).mockReturnValue({
      data: [{ id: 9, descricao: 'OS 15', clienteNome: 'João', valor: 250, dataVencimento: dia(0) }],
      isLoading: false,
    } as never);
    vi.mocked(useSituacaoFechamento).mockReturnValue({ data: undefined } as never);
    vi.mocked(usePagarConta).mockReturnValue({ mutateAsync: pagar, isPending: false } as never);
    vi.mocked(useReceberConta).mockReturnValue({ mutateAsync: receber, isPending: false } as never);
  });

  it('lists payables and receivables, most overdue first, with their due status', () => {
    render(<ContasDoDiaCard />);

    const linhas = screen.getAllByRole('row').slice(1);
    expect(within(linhas[0]).getByText('Aluguel')).toBeInTheDocument();
    expect(within(linhas[0]).getByText('Atrasada 2 dias')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('OS 15')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('Vence hoje')).toBeInTheDocument();
  });

  it('settles a payable through the same endpoint as the Financeiro and confirms', async () => {
    render(<ContasDoDiaCard />);

    await userEvent.click(screen.getByRole('button', { name: 'Pagar Aluguel' }));
    await userEvent.click(screen.getByRole('button', { name: /^Pagar$/ }));

    await vi.waitFor(() => expect(pagar).toHaveBeenCalledWith(expect.objectContaining({ id: 1 })));
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Conta paga e lançada no caixa.'));
    expect(receber).not.toHaveBeenCalled();
  });

  it('settles a receivable via receber', async () => {
    render(<ContasDoDiaCard />);

    await userEvent.click(screen.getByRole('button', { name: 'Receber OS 15' }));
    await userEvent.click(screen.getByRole('button', { name: /^Receber$/ }));

    await vi.waitFor(() => expect(receber).toHaveBeenCalledWith(expect.objectContaining({ id: 9 })));
  });
});
