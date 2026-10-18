import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCategoriasFinanceiras, useRegistrarCaixa } from '@/hooks/useFinanceiro';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { RegistrarMovimentoModal } from './RegistrarMovimentoModal';

vi.mock('@/hooks/useFinanceiro', () => ({ useRegistrarCaixa: vi.fn(), useCategoriasFinanceiras: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('RegistrarMovimentoModal', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: [] });
    vi.mocked(useCategoriasFinanceiras).mockReturnValue({ data: [] } as never);
  });

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
  // correspondente. A categoria do backend é sempre OUTRO no lançamento avulso.
  it('submits the payload merged with the fixed tipo prop, then closes', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync, isPending: false } as never);
    const onClose = vi.fn();
    render(<RegistrarMovimentoModal open tipo="SAIDA" onClose={onClose} />);

    await userEvent.selectOptions(screen.getByLabelText('Forma de pagamento'), 'PIX');
    await userEvent.type(screen.getByLabelText(/^Valor/), '75');
    await userEvent.type(screen.getByLabelText(/Justificativa/), 'Compra de material de limpeza');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      categoria: 'OUTRO',
      formaPagamento: 'PIX',
      valor: 75,
      descricao: 'Compra de material de limpeza',
      tipo: 'SAIDA',
    });
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Saída registrada.'));
    expect(onClose).toHaveBeenCalled();
  });

  it('requires a justification for a saída', async () => {
    const mutateAsync = vi.fn();
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<RegistrarMovimentoModal open tipo="SAIDA" onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/^Valor/), '75');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe a justificativa da saída')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('hides the financial category picker from a profile without FINANCEIRO_READ', () => {
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCategoriasFinanceiras).mockReturnValue({ data: [{ id: 1, nome: 'Aluguel' }] } as never);
    render(<RegistrarMovimentoModal open tipo="SAIDA" onClose={vi.fn()} />);

    expect(screen.queryByLabelText('Categoria')).not.toBeInTheDocument();
  });

  it('prefixes the description with the chosen financial category', async () => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ'] });
    const mutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useCategoriasFinanceiras).mockReturnValue({ data: [{ id: 1, nome: 'Aluguel' }] } as never);
    render(<RegistrarMovimentoModal open tipo="SAIDA" onClose={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'Aluguel');
    await userEvent.type(screen.getByLabelText(/^Valor/), '10');
    await userEvent.type(screen.getByLabelText(/Justificativa/), 'Sinal');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ descricao: '[Aluguel] Sinal' }));
  });

  it('toasts the backend error message on failure, without closing', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('saldo insuficiente'));
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync, isPending: false } as never);
    const onClose = vi.fn();
    render(<RegistrarMovimentoModal open tipo="SAIDA" onClose={onClose} />);

    await userEvent.type(screen.getByLabelText(/^Valor/), '75');
    await userEvent.type(screen.getByLabelText(/Justificativa/), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('saldo insuficiente'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
