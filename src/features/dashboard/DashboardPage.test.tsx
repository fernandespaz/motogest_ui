import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';
import { DashboardPage } from './DashboardPage';

vi.mock('@/hooks/useDashboard', () => ({ useDashboard: vi.fn() }));
vi.mock('@/hooks/useDashboardAdmin', () => ({ useDashboardAdmin: vi.fn() }));

const adminVazio = {
  funil: { abertas: 0, emExecucao: 0, paraFaturar: 0, paraEntregar: 0 },
  agendaHoje: [],
  carregandoOs: false,
  carregandoAgenda: false,
  podeOs: false,
  podeAgenda: false,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useDashboardAdmin).mockReturnValue(adminVazio as never);
    useAuthStore.setState({ nome: 'Diego Fernandes', permissoes: [], perfil: 'Administrador' });
  });

  it('shows a spinner while loading', () => {
    vi.mocked(useDashboard).mockReturnValue({ data: undefined, isLoading: true } as never);
    renderPage();
    expect(screen.getByText('Carregando indicadores...')).toBeInTheDocument();
  });

  it('greets the user by their first name and shows the operational stats', () => {
    vi.mocked(useDashboard).mockReturnValue({
      isLoading: false,
      data: { ordensServicoAbertas: 3, ordensServicoEmAndamento: 2, agendamentosHoje: 5 },
    } as never);
    renderPage();

    expect(screen.getByText('Olá, Diego')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('O.S. em andamento')).toBeInTheDocument();
  });

  it('hides financial stats for a profile without FINANCEIRO_READ', () => {
    vi.mocked(useDashboard).mockReturnValue({
      isLoading: false,
      data: { contasAReceberPendentes: { valorTotal: 100, quantidade: 2 } },
    } as never);
    renderPage();

    expect(screen.queryByText('A receber (pendente)')).not.toBeInTheDocument();
  });

  it('shows financial stats for a profile with FINANCEIRO_READ', () => {
    useAuthStore.setState({ nome: 'Diego Fernandes', permissoes: ['FINANCEIRO_READ'] });
    vi.mocked(useDashboard).mockReturnValue({
      isLoading: false,
      data: {
        contasAReceberPendentes: { valorTotal: 500, quantidade: 3 },
        contasAPagarPendentes: { valorTotal: 200, quantidade: 1 },
        saldoCaixaMesAtual: -50,
      },
    } as never);
    renderPage();

    expect(screen.getByText('A receber (pendente)')).toBeInTheDocument();
    expect(screen.getByText('A pagar (pendente)')).toBeInTheDocument();
    expect(screen.getByText('Saldo de caixa (mês)')).toBeInTheDocument();
  });

  it('flags low stock with a warning tone when below the minimum', () => {
    vi.mocked(useDashboard).mockReturnValue({
      isLoading: false,
      data: { produtosAbaixoDoEstoqueMinimo: 4 },
    } as never);
    renderPage();

    expect(screen.getByText('Produtos abaixo do mínimo')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('turns stat cards and shortcuts into links only for screens the profile can open', () => {
    useAuthStore.setState({
      nome: 'Diego Fernandes',
      permissoes: ['ORDEM_SERVICO_READ', 'ORCAMENTO_WRITE'],
      perfil: 'Administrador',
    });
    vi.mocked(useDashboard).mockReturnValue({ isLoading: false, data: { ordensServicoAbertas: 1 } } as never);
    renderPage();

    expect(screen.getByRole('button', { name: /O.S. abertas/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agendamentos hoje/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Novo orçamento/ })).toHaveAttribute('href', '/orcamentos/novo');
    expect(screen.queryByRole('link', { name: /Clientes/ })).not.toBeInTheDocument();
  });

  it('shows the OS funnel donut and today’s agenda for a profile that can read them', () => {
    useAuthStore.setState({
      nome: 'Diego Fernandes',
      permissoes: ['ORDEM_SERVICO_READ', 'AGENDA_READ'],
      perfil: 'Administrador',
    });
    vi.mocked(useDashboard).mockReturnValue({ isLoading: false, data: {} } as never);
    vi.mocked(useDashboardAdmin).mockReturnValue({
      ...adminVazio,
      podeOs: true,
      podeAgenda: true,
      funil: { abertas: 1, emExecucao: 4, paraFaturar: 2, paraEntregar: 0 },
      agendaHoje: [{ id: 1, dataHora: '2026-10-18T14:30:00', clienteNome: 'Maria Souza', veiculoPlaca: 'ABC1D23', status: 'AGENDADO' }],
    } as never);
    renderPage();

    expect(screen.getByText('Em execução')).toBeInTheDocument();
    expect(screen.getByText('O.S. ativas')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('ABC1D23')).toBeInTheDocument();
  });

  it('shows the finance donut with the projected result and cash balance', () => {
    useAuthStore.setState({ nome: 'Diego Fernandes', permissoes: ['FINANCEIRO_READ'], perfil: 'Administrador' });
    vi.mocked(useDashboard).mockReturnValue({
      isLoading: false,
      data: {
        contasAReceberPendentes: { valorTotal: 500, quantidade: 3 },
        contasAPagarPendentes: { valorTotal: 200, quantidade: 1 },
        saldoCaixaMesAtual: 90,
      },
    } as never);
    renderPage();

    expect(screen.getByText('Resultado previsto')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Gráfico de rosca.*A receber/ })).toBeInTheDocument();
    expect(screen.getByText('Saldo de caixa (mês)')).toBeInTheDocument();
  });

  it('mostra erro com "Tentar novamente" (e não um spinner eterno) quando GET /dashboard falha', async () => {
    const refetch = vi.fn();
    vi.mocked(useDashboard).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never);
    renderPage();

    expect(screen.getByText('Não foi possível carregar o painel')).toBeInTheDocument();
    expect(screen.queryByText('Carregando indicadores...')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('com o funil de OS, um só "O.S. na oficina" (mesma fonte da rosca) no lugar dos dois contadores do backend; legenda leva à lista filtrada', () => {
    vi.mocked(useDashboard).mockReturnValue({
      isLoading: false,
      data: { ordensServicoAbertas: 2, ordensServicoEmAndamento: 10 },
    } as never);
    vi.mocked(useDashboardAdmin).mockReturnValue({
      ...adminVazio,
      podeOs: true,
      funil: { abertas: 4, emExecucao: 23, paraFaturar: 10, paraEntregar: 12 },
      totalOs: 49,
    } as never);
    renderPage();

    expect(screen.getByText('O.S. na oficina', { selector: 'p' }).nextElementSibling).toHaveTextContent('49');
    expect(screen.queryByText('O.S. em andamento')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Prontas para faturar/ })).toHaveAttribute('href', '/ordens-servico?status=CONCLUIDA');
    expect(screen.getByRole('link', { name: /Prontas para entrega/ })).toHaveAttribute('href', '/ordens-servico?status=FATURADO');
  });

  it('falha só no bloco de OS: mostra erro com nova tentativa nele, sem derrubar o painel', async () => {
    const refazerOs = vi.fn();
    vi.mocked(useDashboard).mockReturnValue({ isLoading: false, data: { agendamentosHoje: 3 } } as never);
    vi.mocked(useDashboardAdmin).mockReturnValue({ ...adminVazio, podeOs: true, erroOs: true, refazerOs } as never);
    renderPage();

    expect(screen.getByText('Olá, Diego')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as ordens de serviço.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refazerOs).toHaveBeenCalled();
  });
});
