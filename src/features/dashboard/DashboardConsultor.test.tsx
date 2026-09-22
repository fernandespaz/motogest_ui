import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardConsultor } from '@/hooks/useDashboardConsultor';
import { DashboardPage } from './DashboardPage';
import { tempoDesde } from './DashboardConsultor';

vi.mock('@/hooks/useDashboard', () => ({ useDashboard: vi.fn() }));
vi.mock('@/hooks/useDashboardConsultor', () => ({ useDashboardConsultor: vi.fn() }));

const carteiraVazia = {
  aguardandoCliente: [],
  aprovadosSemOs: [],
  osEmExecucao: [],
  osProntasParaEntrega: [],
  clientesNaCarteira: 0,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage — Consultor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ nome: 'Carla Consultora', perfil: 'Consultor Técnico', usuarioId: 7, permissoes: [] });
  });

  it('shows the consultor panel instead of the workshop overview (no financial numbers)', () => {
    vi.mocked(useDashboardConsultor).mockReturnValue({
      carteira: {
        ...carteiraVazia,
        aguardandoCliente: [{ id: 42, clienteNome: 'João', veiculoPlaca: 'ABC1D23', valorTotal: 500 }],
        clientesNaCarteira: 3,
      },
      agendaHoje: [],
      produtividade: undefined,
      permissoes: { podeOrcamentos: true, podeOs: true, podeAgenda: false },
      isLoading: false,
    } as never);
    renderPage();

    expect(useDashboard).not.toHaveBeenCalled();
    expect(screen.getByText('Olá, Carla')).toBeInTheDocument();
    expect(screen.getByText('Aguardando resposta do cliente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /#42 · João/ })).toHaveAttribute('href', '/orcamentos/42');
    expect(screen.getByText('Clientes na minha carteira')).toBeInTheDocument();
    expect(screen.queryByText('Agendamentos hoje')).not.toBeInTheDocument();
    expect(screen.queryByText('Saldo de caixa (mês)')).not.toBeInTheDocument();
  });

  it('shows the month numbers only when the productivity data came back', () => {
    vi.mocked(useDashboardConsultor).mockReturnValue({
      carteira: carteiraVazia,
      agendaHoje: [],
      produtividade: { indicadores: { taxaConversaoPercentual: 50 } },
      permissoes: { podeOrcamentos: true, podeOs: false, podeAgenda: false },
      isLoading: false,
    } as never);
    renderPage();
    expect(screen.getByText('Meus números no mês')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver detalhe' })).toHaveAttribute('href', '/produtividade/consultores/7');
  });
});

describe('tempoDesde', () => {
  const agora = new Date(2026, 8, 22, 12);
  it('reads as "hoje" / "há N dias"', () => {
    expect(tempoDesde(new Date(2026, 8, 22, 8).toISOString(), agora)).toBe('hoje');
    expect(tempoDesde(new Date(2026, 8, 21, 8).toISOString(), agora)).toBe('há 1 dia');
    expect(tempoDesde(new Date(2026, 8, 17, 8).toISOString(), agora)).toBe('há 5 dias');
    expect(tempoDesde(undefined, agora)).toBe('');
  });
});
