import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardPage } from './DashboardPage';

vi.mock('@/hooks/useDashboard', () => ({ useDashboard: vi.fn() }));

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
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
    expect(screen.getByText('OS em andamento')).toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: /OS abertas/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agendamentos hoje/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Novo orçamento/ })).toHaveAttribute('href', '/orcamentos/novo');
    expect(screen.queryByRole('link', { name: /Clientes/ })).not.toBeInTheDocument();
  });
});
