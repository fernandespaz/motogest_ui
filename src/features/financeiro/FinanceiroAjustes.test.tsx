import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import {
  useAtualizarCategoriaFinanceira,
  useAtualizarParametrosFinanceiros,
  useCategoriasFinanceiras,
  useCriarCategoriaFinanceira,
  useParametrosFinanceiros,
} from '@/hooks/useFinanceiro';
import { toast } from '@/store/toastStore';
import { FinanceiroAjustes } from './FinanceiroAjustes';

vi.mock('@/hooks/useFinanceiro', () => ({
  useAtualizarCategoriaFinanceira: vi.fn(),
  useAtualizarParametrosFinanceiros: vi.fn(),
  useCategoriasFinanceiras: vi.fn(),
  useCriarCategoriaFinanceira: vi.fn(),
  useParametrosFinanceiros: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const despesas = [
  { id: 1, nome: 'Aluguel', tipo: 'DESPESA', fixa: true, ativo: true },
  { id: 2, nome: 'Marketing', tipo: 'DESPESA', fixa: false, ativo: false },
];
const receitas = [{ id: 10, nome: 'Serviços (OS)', tipo: 'RECEITA', fixa: false, ativo: true }];

describe('FinanceiroAjustes', () => {
  let atualizarParametros: ReturnType<typeof vi.fn>;
  let criarCategoria: ReturnType<typeof vi.fn>;
  let atualizarCategoria: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ', 'FINANCEIRO_WRITE'] });
    atualizarParametros = vi.fn().mockResolvedValue({ diaFechamento: 25 });
    criarCategoria = vi.fn().mockResolvedValue({});
    atualizarCategoria = vi.fn().mockResolvedValue({});
    vi.mocked(useParametrosFinanceiros).mockReturnValue({ data: { diaFechamento: 20 }, isLoading: false } as never);
    vi.mocked(useAtualizarParametrosFinanceiros).mockReturnValue({ mutateAsync: atualizarParametros, isPending: false } as never);
    vi.mocked(useCategoriasFinanceiras).mockImplementation(
      ((params?: { tipo?: string }) => ({ data: params?.tipo === 'RECEITA' ? receitas : despesas, isLoading: false })) as never,
    );
    vi.mocked(useCriarCategoriaFinanceira).mockReturnValue({ mutateAsync: criarCategoria, isPending: false } as never);
    vi.mocked(useAtualizarCategoriaFinanceira).mockReturnValue({ mutateAsync: atualizarCategoria, isPending: false } as never);
    vi.mocked(toast.success).mockClear();
  });

  it('shows the closing day and the current period it implies', () => {
    render(<FinanceiroAjustes />);
    expect(screen.getByLabelText(/^Dia do fechamento/)).toHaveValue(20);
    expect(screen.getByText(/Período atual:/)).toHaveTextContent('20/');
  });

  it('saves a new closing day only after it changes, and rejects values out of 1–31', async () => {
    render(<FinanceiroAjustes />);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();

    await userEvent.clear(screen.getByLabelText(/^Dia do fechamento/));
    await userEvent.type(screen.getByLabelText(/^Dia do fechamento/), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe um dia entre 1 e 31')).toBeInTheDocument();
    expect(atualizarParametros).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText(/^Dia do fechamento/));
    await userEvent.type(screen.getByLabelText(/^Dia do fechamento/), '25');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(atualizarParametros).toHaveBeenCalledWith({ diaFechamento: 25 }));
    expect(toast.success).toHaveBeenCalledWith('Dia de fechamento atualizado.');
  });

  it('lists expense and income categories, marking fixed and inactive ones', () => {
    render(<FinanceiroAjustes />);
    const aluguel = screen.getByText('Aluguel').closest('li')!;
    expect(within(aluguel).getByText('Fixa')).toBeInTheDocument();
    const marketing = screen.getByText('Marketing').closest('li')!;
    expect(within(marketing).getByText('Inativa')).toBeInTheDocument();
    expect(within(marketing).getByRole('button', { name: 'Reativar' })).toBeInTheDocument();
    expect(screen.getByText('Serviços (OS)')).toBeInTheDocument();
  });

  it('creates a fixed expense category', async () => {
    render(<FinanceiroAjustes />);
    const [novaDespesa] = screen.getAllByRole('button', { name: /Nova categoria/ });
    await userEvent.click(novaDespesa);

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Seguro do imóvel');
    await userEvent.click(screen.getByLabelText(/Despesa fixa/));
    // o botão do modal vem por último (o outro "Salvar" é o do dia de fechamento)
    const salvar = screen.getAllByRole('button', { name: 'Salvar' });
    await userEvent.click(salvar[salvar.length - 1]);

    await waitFor(() => expect(criarCategoria).toHaveBeenCalled());
    expect(criarCategoria).toHaveBeenCalledWith({ nome: 'Seguro do imóvel', tipo: 'DESPESA', fixa: true });
  });

  it('does not offer the "fixed" option for an income category', async () => {
    render(<FinanceiroAjustes />);
    const botoes = screen.getAllByRole('button', { name: /Nova categoria/ });
    await userEvent.click(botoes[1]);
    expect(screen.queryByLabelText(/Despesa fixa/)).not.toBeInTheDocument();
  });

  it('deactivates a category keeping its name and kind', async () => {
    render(<FinanceiroAjustes />);
    const aluguel = screen.getByText('Aluguel').closest('li')!;
    await userEvent.click(within(aluguel).getByRole('button', { name: 'Desativar' }));

    await waitFor(() => expect(atualizarCategoria).toHaveBeenCalled());
    expect(atualizarCategoria).toHaveBeenCalledWith({
      id: 1,
      payload: { nome: 'Aluguel', tipo: 'DESPESA', fixa: true, ativo: false },
    });
  });

  it('is read-only without FINANCEIRO_WRITE', () => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ'] });
    render(<FinanceiroAjustes />);
    expect(screen.getByLabelText(/^Dia do fechamento/)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nova categoria/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();
  });
});
