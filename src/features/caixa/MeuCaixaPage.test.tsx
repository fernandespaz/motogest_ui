import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCaixaPeriodo,
  useCaixaSessaoAberta,
  useAbrirCaixaSessao,
  useRegistrarCaixa,
  useFecharCaixaSessao,
  useFaturarOrdemServico,
  useCategoriasFinanceiras,
} from '@/hooks/useFinanceiro';
import { useVenderProdutos } from '@/hooks/useVendaCaixa';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useVeiculo } from '@/hooks/useVeiculos';
import { useProdutos } from '@/hooks/useProdutos';
import { useAuthStore } from '@/store/authStore';
import { MeuCaixaPage } from './MeuCaixaPage';

vi.mock('@/hooks/useVendaCaixa', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useVendaCaixa')>()),
  useVenderProdutos: vi.fn(),
}));
vi.mock('@/hooks/useFinanceiro', () => ({
  useCaixaSessaoAberta: vi.fn(),
  useCaixaPeriodo: vi.fn(),
  useAbrirCaixaSessao: vi.fn(),
  useRegistrarCaixa: vi.fn(),
  useFecharCaixaSessao: vi.fn(),
  useFaturarOrdemServico: vi.fn(),
  useCategoriasFinanceiras: vi.fn(),
}));
vi.mock('@/hooks/useOrdensServico', () => ({ useOrdensServico: vi.fn() }));
vi.mock('@/hooks/useVeiculos', () => ({ useVeiculo: vi.fn() }));
vi.mock('@/hooks/useProdutos', () => ({ useProdutos: vi.fn() }));
vi.mock('./ContasDoDiaCard', () => ({ ContasDoDiaCard: () => <div>Contas para baixar</div> }));

const sessaoAberta = {
  id: 1,
  identificador: 'CX-0001',
  turno: 'Manhã',
  status: 'ABERTO' as const,
  abertoEm: '2026-01-15T08:00:00',
  saldoInicial: { dinheiro: 100, cartao: 0, pix: 0, transferencia: 0, total: 100 },
  totalEntradas: { dinheiro: 200, cartao: 50, pix: 30, transferencia: 0, total: 280 },
  totalSaidas: { dinheiro: 20, cartao: 0, pix: 0, transferencia: 0, total: 20 },
  saldoAtual: { dinheiro: 280, cartao: 50, pix: 30, transferencia: 0, total: 360 },
};

const movimentosDaSessao = [
  {
    id: 11,
    tipo: 'ENTRADA' as const,
    valor: 200,
    formaPagamento: 'DINHEIRO' as const,
    dataMovimento: '2026-01-15T09:00:00',
    caixaSessaoId: 1,
    descricao: 'Venda balcão',
  },
];

describe('MeuCaixaPage', () => {
  beforeEach(() => {
    vi.mocked(useAbrirCaixaSessao).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useRegistrarCaixa).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useFecharCaixaSessao).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useVenderProdutos).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCategoriasFinanceiras).mockReturnValue({ data: [] } as never);
    vi.mocked(useProdutos).mockReturnValue({ data: { content: [] }, isFetching: false } as never);
    useAuthStore.setState({ permissoes: [] });
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [] }, isFetching: false } as never);
    vi.mocked(useVeiculo).mockReturnValue({ data: undefined, isLoading: false } as never);
    vi.mocked(useCaixaPeriodo).mockReturnValue({ data: [], isLoading: false } as never);
  });

  it('offers to open a shift when there is no open session', () => {
    vi.mocked(useCaixaSessaoAberta).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    render(<MeuCaixaPage />);

    expect(screen.getByText('Nenhum caixa aberto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir caixa/ })).toBeInTheDocument();
  });

  it('opens the AbrirCaixaModal from the empty state', async () => {
    vi.mocked(useCaixaSessaoAberta).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    render(<MeuCaixaPage />);

    await userEvent.click(screen.getByRole('button', { name: /Abrir caixa/ }));
    expect(screen.getByText('Abrir caixa', { selector: 'h2' })).toBeInTheDocument();
  });

  it('shows the shift balances and today’s movements when a session is open', () => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ'] });
    vi.mocked(useCaixaSessaoAberta).mockReturnValue({
      data: sessaoAberta,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useCaixaPeriodo).mockReturnValue({ data: movimentosDaSessao, isLoading: false } as never);
    render(<MeuCaixaPage />);

    expect(screen.getByText('R$ 360,00')).toBeInTheDocument(); // saldo atual total
    expect(screen.getByText('Venda balcão')).toBeInTheDocument();
  });

  // Um movimento no período que pertence a OUTRA sessão (ex.: um colega abriu
  // e fechou um turno antes deste) não pode vazar pra lista "Lançamentos do
  // turno" — só existe filtro de período no backend, o filtro por sessão é
  // feito no cliente (ver comentário em MeuCaixaPage).
  it('filters out movimentos from a different caixa session in the same period window', () => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ'] });
    vi.mocked(useCaixaSessaoAberta).mockReturnValue({
      data: sessaoAberta,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useCaixaPeriodo).mockReturnValue({
      data: [...movimentosDaSessao, { id: 99, tipo: 'ENTRADA', valor: 999, caixaSessaoId: 2, dataMovimento: '2026-01-15T07:00:00' }],
      isLoading: false,
    } as never);
    render(<MeuCaixaPage />);

    expect(screen.getByText('Venda balcão')).toBeInTheDocument();
    expect(screen.queryByText('R$ 999,00')).not.toBeInTheDocument();
  });

  it('opens the entrada modal fixed to tipo ENTRADA', async () => {
    vi.mocked(useCaixaSessaoAberta).mockReturnValue({
      data: sessaoAberta,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    render(<MeuCaixaPage />);

    await userEvent.click(screen.getByRole('button', { name: /Nova entrada/ }));
    expect(screen.getByText('Nova entrada', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the saída modal fixed to tipo SAIDA', async () => {
    vi.mocked(useCaixaSessaoAberta).mockReturnValue({
      data: sessaoAberta,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    render(<MeuCaixaPage />);

    await userEvent.click(screen.getByRole('button', { name: /Nova saída/ }));
    expect(screen.getByText('Nova saída', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the FaturarOSModal from "Faturar OS"', async () => {
    vi.mocked(useCaixaSessaoAberta).mockReturnValue({
      data: sessaoAberta,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    render(<MeuCaixaPage />);

    await userEvent.click(screen.getByRole('button', { name: /Faturar OS/ }));
    expect(screen.getByText('Faturar OS', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the FecharCaixaModal from "Fechar caixa"', async () => {
    vi.mocked(useCaixaSessaoAberta).mockReturnValue({
      data: sessaoAberta,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    render(<MeuCaixaPage />);

    await userEvent.click(screen.getByRole('button', { name: /Fechar caixa/ }));
    expect(screen.getByText('Fechar caixa', { selector: 'h2' })).toBeInTheDocument();
  });

  it('does not request the movement list for a cashier without FINANCEIRO_READ (the backend answers 403)', () => {
    vi.mocked(useCaixaSessaoAberta).mockReturnValue({
      data: sessaoAberta,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);
    render(<MeuCaixaPage />);

    expect(useCaixaPeriodo).toHaveBeenCalledWith('', expect.any(String));
    expect(screen.getByText('R$ 360,00')).toBeInTheDocument();
    expect(screen.queryByText('Venda balcão')).not.toBeInTheDocument();
    expect(screen.getByText(/FINANCEIRO_READ/)).toBeInTheDocument();
  });

  describe('permission gating', () => {
    beforeEach(() => {
      vi.mocked(useCaixaSessaoAberta).mockReturnValue({
        data: sessaoAberta,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      } as never);
    });

    it('shows only the cashier operations to a profile without estoque/financeiro access', () => {
      render(<MeuCaixaPage />);

      expect(screen.getByRole('button', { name: /Nova saída/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Vender produtos/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Contas para baixar')).not.toBeInTheDocument();
    });

    it('hides sale and bills when the profile can only read (the backend would answer 403)', () => {
      useAuthStore.setState({ permissoes: ['ESTOQUE_READ', 'FINANCEIRO_READ'] });
      render(<MeuCaixaPage />);

      expect(screen.queryByRole('button', { name: /Vender produtos/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Contas para baixar')).not.toBeInTheDocument();
    });

    it('offers product sales with ESTOQUE_READ and the bills to settle with FINANCEIRO_READ', async () => {
      useAuthStore.setState({
        permissoes: ['ESTOQUE_READ', 'ESTOQUE_WRITE', 'FINANCEIRO_READ', 'FINANCEIRO_WRITE'],
      });
      render(<MeuCaixaPage />);

      expect(screen.getByText('Contas para baixar')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /Vender produtos/ }));
      expect(screen.getByText('Vender produtos', { selector: 'h2' })).toBeInTheDocument();
    });
  });
});
