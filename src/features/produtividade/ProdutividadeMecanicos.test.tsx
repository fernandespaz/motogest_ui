import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProdutividadeMecanico, useProdutividadeMecanicos } from '@/hooks/useProdutividade';
import { useAuthStore } from '@/store/authStore';
import { ProdutividadeMecanicosPage } from './ProdutividadeMecanicosPage';
import { MinhaProdutividadePage } from './MinhaProdutividadePage';
import { GuardaProdutividade } from './ProdutividadeAbas';

vi.mock('@/hooks/useProdutividade', () => ({
  useProdutividadeMecanicos: vi.fn(),
  useProdutividadeMecanico: vi.fn(),
}));

const indicadores = {
  minutosTrabalhados: 600,
  minutosDisponiveis: 9600,
  ocupacaoPercentual: 6.3,
  osConcluidas: 2,
  minutosVendidos: 150,
  minutosConsumidos: 120,
  eficienciaPercentual: 125,
  produtividadePercentual: 1.6,
  osComTempoEstourado: 0,
  valorMaoDeObra: 300,
  quantidadePausas: 1,
  minutosPausados: 15,
};

function LocalAtual() {
  const loc = useLocation();
  return <p data-testid="local">{loc.pathname + loc.search}</p>;
}

function renderEm(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/produtividade/mecanicos"
          element={
            <GuardaProdutividade>
              <ProdutividadeMecanicosPage />
            </GuardaProdutividade>
          }
        />
        <Route path="/minha-produtividade" element={<MinhaProdutividadePage />} />
        <Route path="*" element={null} />
      </Routes>
      <LocalAtual />
    </MemoryRouter>,
  );
}

describe('ProdutividadeMecanicosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ permissoes: ['PRODUTIVIDADE_READ'], perfil: 'Administrador', usuarioId: 99 });
    vi.mocked(useProdutividadeMecanicos).mockReturnValue({
      data: {
        mes: '2026-09',
        minutosDisponiveisPorMecanico: 9600,
        totalOficina: indicadores,
        mecanicos: [{ usuarioId: 3, usuarioNome: 'Marcos Mecanico', indicadores }],
      },
      isLoading: false,
      isPlaceholderData: false,
      isFetching: false,
    } as never);
  });

  it('lists each mechanic in technical hours and opens the detail on click', async () => {
    renderEm('/produtividade/mecanicos?mes=2026-09');
    expect(useProdutividadeMecanicos).toHaveBeenCalledWith('2026-09');
    expect(screen.getByText('Marcos Mecanico')).toBeInTheDocument();
    // 150 min vendidos → 2,5 h (no card do total e na linha do mecânico)
    expect(screen.getAllByText('2,5 h').length).toBeGreaterThanOrEqual(2);

    await userEvent.click(screen.getByText('Marcos Mecanico'));
    expect(screen.getByTestId('local')).toHaveTextContent('/produtividade/mecanicos/3?mes=2026-09');
  });

  it('switches to the consultores tab keeping the month', async () => {
    renderEm('/produtividade/mecanicos?mes=2026-08');
    await userEvent.click(screen.getByRole('button', { name: 'Consultores' }));
    expect(screen.getByTestId('local')).toHaveTextContent('/produtividade?mes=2026-08');
  });

  it('redirects a Consultor to their own detail without mounting the mechanics report', () => {
    useAuthStore.setState({ permissoes: ['PRODUTIVIDADE_READ'], perfil: 'Consultor Técnico', usuarioId: 1 });
    renderEm('/produtividade/mecanicos?mes=2026-09');
    expect(useProdutividadeMecanicos).not.toHaveBeenCalled();
    expect(screen.getByTestId('local')).toHaveTextContent('/produtividade/consultores/1?mes=2026-09');
  });

  it("sends a Mecânico to his own screen even with PRODUTIVIDADE_READ, never to colleagues' hours", () => {
    useAuthStore.setState({ permissoes: ['PRODUTIVIDADE_READ'], perfil: 'Mecânico', usuarioId: 3 });
    vi.mocked(useProdutividadeMecanico).mockReturnValue({ data: undefined, isLoading: true } as never);
    renderEm('/produtividade/mecanicos?mes=2026-09');
    expect(useProdutividadeMecanicos).not.toHaveBeenCalled();
    expect(screen.getByTestId('local')).toHaveTextContent('/minha-produtividade?mes=2026-09');
  });
});

describe('MinhaProdutividadePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProdutividadeMecanico).mockReturnValue({
      data: { mes: '2026-09', usuarioId: 3, usuarioNome: 'Marcos', indicadores, ordensConcluidas: [], horasPorDia: [] },
      isLoading: false,
      isPlaceholderData: false,
      isFetching: false,
    } as never);
  });

  it("shows the logged-in mechanic's own technical hours", () => {
    useAuthStore.setState({ permissoes: ['PRODUTIVIDADE_READ', 'ORDEM_SERVICO_READ'], perfil: 'Mecânico', usuarioId: 3 });
    renderEm('/minha-produtividade?mes=2026-09');
    expect(useProdutividadeMecanico).toHaveBeenCalledWith(3, '2026-09', { enabled: true });
    expect(screen.getByText('Horas técnicas vendidas')).toBeInTheDocument();
    expect(screen.getByText('125%')).toBeInTheDocument();
  });

  it('does not query and explains why when the profile lacks PRODUTIVIDADE_READ', () => {
    useAuthStore.setState({ permissoes: ['ORDEM_SERVICO_READ'], perfil: 'Mecânico', usuarioId: 3 });
    renderEm('/minha-produtividade');
    expect(useProdutividadeMecanico).toHaveBeenCalledWith(3, expect.any(String), { enabled: false });
    expect(screen.getByText('Relatório não liberado para o seu perfil')).toBeInTheDocument();
  });
});
