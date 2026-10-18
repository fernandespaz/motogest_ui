import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useParametrosFinanceiros, useTodasContasPagar, useTodasContasReceber } from '@/hooks/useFinanceiro';
import { FinanceiroVisaoGeral } from './FinanceiroVisaoGeral';

vi.mock('@/hooks/useFinanceiro', () => ({
  useParametrosFinanceiros: vi.fn(),
  useTodasContasPagar: vi.fn(),
  useTodasContasReceber: vi.fn(),
}));

// hoje fixo (15/10/2026) para que os vencimentos não atravessem a virada do mês
const HOJE = new Date(2026, 9, 15, 12);

describe('FinanceiroVisaoGeral', () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(HOJE);
    vi.mocked(useParametrosFinanceiros).mockReturnValue({ data: { diaFechamento: 20 } } as never);
    vi.mocked(useTodasContasPagar).mockReturnValue({
      isLoading: false,
      data: [
        { id: 1, descricao: 'Aluguel', fornecedor: 'Imobiliária Sol', categoriaId: 5, categoriaNome: 'Aluguel e condomínio', valor: 900, dataVencimento: '2026-10-11', status: 'PENDENTE' },
        { id: 2, descricao: 'Peças Veloz', fornecedor: 'Auto Peças Veloz', valor: 350, dataVencimento: '2026-10-25', status: 'PENDENTE' },
        { id: 3, descricao: 'Energia', valor: 200, dataVencimento: '2026-09-25', status: 'PAGO' },
      ],
    } as never);
    vi.mocked(useTodasContasReceber).mockReturnValue({
      isLoading: false,
      data: [{ id: 10, descricao: 'Serviço OS #1', clienteNome: 'Carlos', valor: 1000, dataVencimento: '2026-10-18', status: 'PENDENTE' }],
    } as never);
  });

  it('highlights overdue accounts and totals what is open on each side', () => {
    render(<FinanceiroVisaoGeral onIrPara={vi.fn()} />);

    expect(screen.getByText('Contas vencidas')).toBeInTheDocument();
    expect(screen.getByText(/R\$ 900,00 · 1 a pagar · 0 a receber/)).toBeInTheDocument();
    // a pagar em aberto = 900 + 350; a receber em aberto = 1000; resultado = 1000 - 1250
    expect(screen.getAllByText('R$ 1.250,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 1.000,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-R$ 250,00').length).toBeGreaterThan(0);
  });

  it('shows which month the figures belong to and lets the user browse to the previous one', async () => {
    render(<FinanceiroVisaoGeral onIrPara={vi.fn()} />);
    expect(screen.getByText('outubro de 2026')).toBeInTheDocument();
    expect(screen.getByText('Mês atual')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('setembro de 2026')).toBeInTheDocument();
    expect(screen.queryByText('Mês atual')).not.toBeInTheDocument();
    // em setembro só existe a conta paga; nada em aberto
    expect(screen.queryByText('Aluguel', { selector: 'p' })).not.toBeInTheDocument();
    expect(screen.getByText('Tudo em dia')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao mês atual' }));
    expect(screen.getByText('outubro de 2026')).toBeInTheDocument();
    expect(screen.getByText('Aluguel', { selector: 'p' })).toBeInTheDocument();
  });

  it('lists the overdue and upcoming accounts together, oldest first', () => {
    render(<FinanceiroVisaoGeral onIrPara={vi.fn()} />);
    const itens = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    const ordem = ['Aluguel', 'Serviço OS #1', 'Peças Veloz'].map((nome) => itens.findIndex((t) => t.includes(nome)));
    expect(ordem.every((i) => i >= 0)).toBe(true);
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
    expect(screen.queryByText('Energia', { selector: 'p' })).not.toBeInTheDocument();
  });

  it('sends the user to the overdue list from the overdue card', async () => {
    const onIrPara = vi.fn();
    render(<FinanceiroVisaoGeral onIrPara={onIrPara} />);
    await userEvent.click(screen.getByRole('button', { name: /Contas vencidas/ }));
    expect(onIrPara).toHaveBeenCalledWith({ aba: 'pagar', situacao: 'vencida' });
  });

  it('says everything is on time when nothing is overdue, and the card is not a link', () => {
    vi.mocked(useTodasContasPagar).mockReturnValue({ isLoading: false, data: [] } as never);
    render(<FinanceiroVisaoGeral onIrPara={vi.fn()} />);
    expect(screen.getByText('Tudo em dia')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Contas vencidas/ })).not.toBeInTheDocument();
  });
});

describe('FinanceiroVisaoGeral — balanço, categorias e fechamento', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 12));
    vi.mocked(useParametrosFinanceiros).mockReturnValue({ data: { diaFechamento: 20 } } as never);
    vi.mocked(useTodasContasPagar).mockReturnValue({
      isLoading: false,
      data: [
        { id: 1, descricao: 'Aluguel', categoriaId: 5, categoriaNome: 'Aluguel e condomínio', valor: 900, dataVencimento: '2026-10-05', status: 'PAGO', valorPago: 920 },
        { id: 2, descricao: 'Peças', valor: 300, dataVencimento: '2026-10-25', status: 'PENDENTE' },
        { id: 3, descricao: 'Cancelada', categoriaId: 5, categoriaNome: 'Aluguel e condomínio', valor: 999, dataVencimento: '2026-10-07', status: 'CANCELADO' },
      ],
    } as never);
    vi.mocked(useTodasContasReceber).mockReturnValue({
      isLoading: false,
      data: [{ id: 10, descricao: 'OS', valor: 2000, dataVencimento: '2026-10-10', status: 'RECEBIDO', valorPago: 2000 }],
    } as never);
  });

  afterEach(() => vi.useRealTimers());

  it('balances the month: planned vs settled, using the effective amount paid', () => {
    render(<FinanceiroVisaoGeral onIrPara={vi.fn()} />);
    expect(screen.getByText('Balanço do mês')).toBeInTheDocument();
    // despesas previstas 900 + 300 = 1.200 (cancelada fora); pagas 920; receitas 2.000; resultado 800 / realizado 1.080
    expect(screen.getByText('R$ 1.200,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 920,00 pago')).toBeInTheDocument();
    expect(screen.getByText('R$ 800,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.080,00 realizado')).toBeInTheDocument();
  });

  it('ranks the month spending by category and flags what has no category', () => {
    render(<FinanceiroVisaoGeral onIrPara={vi.fn()} />);
    const lista = screen.getAllByRole('list')[0];
    expect(within(lista).getByText('Aluguel e condomínio')).toBeInTheDocument();
    expect(within(lista).getByText('Sem categoria')).toBeInTheDocument();
    expect(within(lista).getByText(/75%/)).toBeInTheDocument();
  });

  it('tells how long until the closing day, only for the current month', async () => {
    render(<FinanceiroVisaoGeral onIrPara={vi.fn()} />);
    expect(screen.getByText((_, el) => el?.tagName === 'P' && /fecha em 5 dias \(dia 20\)/.test(el.textContent ?? ''))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.queryByText(/Período de fechamento/)).not.toBeInTheDocument();
  });
});
