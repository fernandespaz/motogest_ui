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
  osProntasParaFaturar: [],
  osProntasParaEntrega: [],
  osEntregues: [],
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

  it('lists recently delivered OS with the conclusion date, linking to the OS itself', () => {
    vi.mocked(useDashboardConsultor).mockReturnValue({
      carteira: {
        ...carteiraVazia,
        osEntregues: [
          { id: 55, numero: 'OS-000055', clienteNome: 'Maria', veiculoPlaca: 'XYZ9A87', dataConclusao: '2026-09-10T14:00:00' },
        ],
      },
      agendaHoje: [],
      produtividade: undefined,
      permissoes: { podeOrcamentos: false, podeOs: true, podeAgenda: false },
      isLoading: false,
    } as never);
    renderPage();

    // Aparece duas vezes: o tile de número no topo e o título da lista.
    expect(screen.getAllByText('OS entregues recentemente').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('link', { name: /OS-000055 · Maria/ })).toHaveAttribute('href', '/ordens-servico/55');
    expect(screen.getByText('10/09/2026')).toBeInTheDocument();
  });

  // Regra de negócio: o veículo só é liberado depois de pago — Concluída e
  // Faturada são etapas distintas, cada uma numa lista própria.
  it('splits ready-to-invoice (Concluída) from ready-for-delivery (Faturada), each in its own list', () => {
    vi.mocked(useDashboardConsultor).mockReturnValue({
      carteira: {
        ...carteiraVazia,
        osProntasParaFaturar: [
          { id: 60, numero: 'OS-000060', clienteNome: 'Bruno', veiculoPlaca: 'AAA1111', valorTotal: 300 },
        ],
        osProntasParaEntrega: [
          {
            id: 61,
            numero: 'OS-000061',
            clienteNome: 'Carla',
            veiculoPlaca: 'BBB2222',
            dataFaturamento: '2026-09-12T10:00:00',
          },
        ],
      },
      agendaHoje: [],
      produtividade: undefined,
      permissoes: { podeOrcamentos: false, podeOs: true, podeAgenda: false },
      isLoading: false,
    } as never);
    renderPage();

    expect(screen.getAllByText('Prontas para faturar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('link', { name: /OS-000060 · Bruno/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /OS-000061 · Carla/ })).toHaveAttribute('href', '/ordens-servico/61');
    expect(screen.getByText('Faturada 12/09/2026')).toBeInTheDocument();
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
