import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useFecharPeriodo, useFechamentos, useReabrirFechamento, useSituacaoFechamento } from '@/hooks/useFinanceiro';
import { toast } from '@/store/toastStore';
import { FinanceiroFechamento } from './FinanceiroFechamento';

vi.mock('@/hooks/useFinanceiro', () => ({
  useFecharPeriodo: vi.fn(),
  useFechamentos: vi.fn(),
  useReabrirFechamento: vi.fn(),
  useSituacaoFechamento: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const proximoBase = {
  inicio: '2026-09-21',
  fim: '2026-10-20',
  podeFechar: true,
  diasParaFechar: -2,
  totalReceitas: 5000,
  totalDespesas: 3200,
  resultado: 1800,
  contasPendentes: 0,
  valorPendente: 0,
  contasSemCategoria: 0,
};

const fechado = {
  id: 7,
  periodoInicio: '2026-08-21',
  periodoFim: '2026-09-20',
  status: 'FECHADO',
  resultado: 900,
  contasPendentes: 0,
  fechadoPorNome: 'Diego',
  fechadoEm: '2026-09-21T10:00:00',
};

describe('FinanceiroFechamento', () => {
  let fechar: ReturnType<typeof vi.fn>;
  let reabrir: ReturnType<typeof vi.fn>;

  function situacao(proximo = {}, dataMuro: string | null = '2026-09-20') {
    vi.mocked(useSituacaoFechamento).mockReturnValue({
      isLoading: false,
      data: { diaFechamento: 20, dataMuro: dataMuro ?? undefined, proximo: { ...proximoBase, ...proximo } },
    } as never);
  }

  beforeEach(() => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ', 'FINANCEIRO_FECHAR'] });
    fechar = vi.fn().mockResolvedValue({});
    reabrir = vi.fn().mockResolvedValue({});
    situacao();
    vi.mocked(useFechamentos).mockReturnValue({ isLoading: false, data: [fechado] } as never);
    vi.mocked(useFecharPeriodo).mockReturnValue({ mutateAsync: fechar, isPending: false } as never);
    vi.mocked(useReabrirFechamento).mockReturnValue({ mutateAsync: reabrir, isPending: false } as never);
    vi.mocked(toast.success).mockClear();
  });

  // O Modal não tem role=dialog: o botão de confirmar é sempre o último com o nome.
  const ultimo = (nome: string) => screen.getAllByRole('button', { name: nome }).at(-1)!;

  it('shows the wall date, the next period and a clean checklist', () => {
    render(<FinanceiroFechamento />);
    expect(screen.getByText('Financeiro fechado até 20/09/2026')).toBeInTheDocument();
    expect(screen.getByText(/Período de 21\/09\/2026 a 20\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText('Pronto para fechar')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma conta em aberto no período')).toBeInTheDocument();
    expect(screen.getByText('Todas as contas do período têm categoria')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.800,00')).toBeInTheDocument();
  });

  it('says how long is left while the period cannot be closed yet', () => {
    situacao({ podeFechar: false, diasParaFechar: 5 });
    render(<FinanceiroFechamento />);
    expect(screen.getByText('Fecha em 5 dias')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar período' })).toBeDisabled();
  });

  it('closes the period straight away when nothing is open', async () => {
    render(<FinanceiroFechamento />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar período' }));
    await userEvent.type(screen.getByLabelText('Observação (opcional)'), 'Tudo certo');
    await userEvent.click(ultimo('Fechar período'));

    await waitFor(() => expect(fechar).toHaveBeenCalledWith({ confirmarPendencias: false, observacao: 'Tudo certo' }));
    expect(toast.success).toHaveBeenCalledWith('Período fechado.');
  });

  it('warns about open accounts and only closes after the user acknowledges them', async () => {
    situacao({ contasPendentes: 2, valorPendente: 450, contasSemCategoria: 1 });
    render(<FinanceiroFechamento />);
    expect(screen.getByText(/2 contas em aberto \(R\$ 450,00\)/)).toBeInTheDocument();
    expect(screen.getByText(/1 conta sem categoria/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Fechar período' }));
    expect(ultimo('Fechar período')).toBeDisabled();

    await userEvent.click(screen.getByLabelText(/Estou ciente/));
    await userEvent.click(ultimo('Fechar período'));
    await waitFor(() => expect(fechar).toHaveBeenCalledWith({ confirmarPendencias: true, observacao: undefined }));
  });

  it('reopens only the latest closing, and only with a real reason', async () => {
    vi.mocked(useFechamentos).mockReturnValue({
      isLoading: false,
      data: [fechado, { ...fechado, id: 6, periodoFim: '2026-08-20', status: 'REABERTO', reabertoPorNome: 'Ana', motivoReabertura: 'Erro de lançamento' }],
    } as never);
    render(<FinanceiroFechamento />);

    expect(screen.getAllByRole('button', { name: 'Reabrir' })).toHaveLength(1);
    expect(screen.getByText(/Reaberto por Ana/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    await userEvent.type(screen.getByLabelText(/^Motivo/), 'ok');
    expect(ultimo('Reabrir')).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/^Motivo/), ' esqueci uma nota');
    await userEvent.click(ultimo('Reabrir'));
    await waitFor(() => expect(reabrir).toHaveBeenCalledWith({ id: 7, payload: { motivo: 'ok esqueci uma nota' } }));
  });

  it('is read-only without FINANCEIRO_FECHAR', () => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ'] });
    render(<FinanceiroFechamento />);
    expect(screen.queryByRole('button', { name: 'Fechar período' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reabrir' })).not.toBeInTheDocument();
    expect(screen.getByText('Financeiro fechado até 20/09/2026')).toBeInTheDocument();
  });

  it('explains that nothing has been closed yet', () => {
    situacao({}, null);
    vi.mocked(useFechamentos).mockReturnValue({ isLoading: false, data: [] } as never);
    render(<FinanceiroFechamento />);
    expect(screen.getByText('Nenhum período fechado ainda')).toBeInTheDocument();
    expect(screen.getByText('Nenhum fechamento registrado.')).toBeInTheDocument();
  });
});
