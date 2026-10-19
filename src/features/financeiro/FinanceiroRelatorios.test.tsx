import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodasContasPagar, useTodasContasReceber } from '@/hooks/useFinanceiro';
import { baixarCsv } from '@/lib/csv';
import { FinanceiroRelatorios } from './FinanceiroRelatorios';

vi.mock('@/hooks/useFinanceiro', () => ({ useTodasContasPagar: vi.fn(), useTodasContasReceber: vi.fn() }));
vi.mock('@/lib/csv', () => ({ baixarCsv: vi.fn() }));

describe('FinanceiroRelatorios', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 18, 12)); // 18/10/2026: período padrão 01/10 a 18/10
    vi.mocked(useTodasContasPagar).mockReturnValue({
      isLoading: false,
      data: [
        { id: 1, descricao: 'Aluguel', categoriaId: 5, categoriaNome: 'Aluguel', valor: 900, dataVencimento: '2026-10-05', status: 'PAGO', valorPago: 900 },
        { id: 2, descricao: 'Peças', categoriaId: 6, categoriaNome: 'Peças', valor: 300, dataVencimento: '2026-10-10', status: 'PENDENTE' },
        { id: 3, descricao: 'Avulsa', valor: 100, dataVencimento: '2026-10-12', status: 'PENDENTE' },
        { id: 4, descricao: 'Cancelada', categoriaId: 5, categoriaNome: 'Aluguel', valor: 999, dataVencimento: '2026-10-07', status: 'CANCELADO' },
        { id: 5, descricao: 'Fora do período', categoriaId: 5, categoriaNome: 'Aluguel', valor: 777, dataVencimento: '2026-09-30', status: 'PENDENTE' },
      ],
    } as never);
    vi.mocked(useTodasContasReceber).mockReturnValue({
      isLoading: false,
      data: [{ id: 10, descricao: 'OS #1', clienteNome: 'Carlos', categoriaId: 9, categoriaNome: 'Serviços (OS)', valor: 2000, dataVencimento: '2026-10-08', status: 'RECEBIDO', valorPago: 2000, dataRecebimento: '2026-10-08' }],
    } as never);
    vi.mocked(baixarCsv).mockClear();
  });

  afterEach(() => vi.useRealTimers());

  it('lists the expenses of the period by category, leaving out canceled and out-of-period accounts', () => {
    render(<FinanceiroRelatorios />);
    expect(screen.getByText('Despesas por categoria', { selector: 'h3, h2, p, div' })).toBeInTheDocument();
    expect(screen.getByText('Aluguel')).toBeInTheDocument(); // só a conta de 900
    expect(screen.getAllByText('R$ 900,00').length).toBeGreaterThan(0);
    expect(screen.getByText('Sem categoria')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.300,00')).toBeInTheDocument(); // total
  });

  it('switches to income by category', async () => {
    render(<FinanceiroRelatorios />);
    await userEvent.click(screen.getByRole('radio', { name: 'Receitas por categoria' }));
    expect(screen.getByText('Serviços (OS)')).toBeInTheDocument();
    expect(screen.queryByText('Peças')).not.toBeInTheDocument();
  });

  it('exports the category report with a total row', async () => {
    render(<FinanceiroRelatorios />);
    await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    const [nome, linhas] = vi.mocked(baixarCsv).mock.calls[0];
    expect(nome).toBe('financeiro-despesas-2026-10-01-a-2026-10-18');
    expect(linhas[0]).toEqual(['Categoria', 'Valor', '% do total']);
    expect(linhas.at(-1)).toEqual(['Total', 1300, 100]);
  });

  it('exports every account of the period with its situation', async () => {
    render(<FinanceiroRelatorios />);
    await userEvent.click(screen.getByRole('radio', { name: 'Contas do período' }));
    expect(screen.getByText('5 contas', { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    const [, linhas] = vi.mocked(baixarCsv).mock.calls[0];
    expect(linhas).toHaveLength(1 + 5); // cabeçalho + 3 a pagar + cancelada + 1 a receber
    expect(linhas.some((l) => l[1] === 'OS #1' && l[2] === 'Carlos' && l[6] === 'Quitada')).toBe(true);
    expect(linhas.some((l) => l[1] === 'Avulsa' && l[3] === 'Sem categoria')).toBe(true);
  });
});
