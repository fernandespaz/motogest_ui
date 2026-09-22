import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProdutividadeConsultores } from '@/hooks/useProdutividade';
import { useAuthStore } from '@/store/authStore';
import { ProdutividadeConsultoresPage } from './ProdutividadeConsultoresPage';

vi.mock('@/hooks/useProdutividade', () => ({ useProdutividadeConsultores: vi.fn() }));

const indicadores = (over: Record<string, number | null>) => ({
  orcamentosEmitidos: 10,
  orcamentosAprovados: 5,
  taxaConversaoPercentual: 50,
  valorFaturado: 1000,
  servicosFechados: 4,
  ticketMedio: 250,
  tempoMedioRespostaMinutos: 90,
  horasTecnicasVendidas: 20,
  horasTecnicasDisponiveis: 100,
  produtividadeHorasPercentual: 20,
  clientesAtendidos: 4,
  clientesRecorrentes: 1,
  indiceFidelizacaoPercentual: 25,
  ...over,
});

const relatorio = {
  mes: '2026-09',
  horasTecnicasDisponiveis: 100,
  totalOficina: indicadores({ valorFaturado: 6000 }),
  consultores: [
    { usuarioId: null, usuarioNome: 'Sem consultor registrado', indicadores: indicadores({ valorFaturado: 9000 }) },
    { usuarioId: 1, usuarioNome: 'Ana Souza', indicadores: indicadores({ valorFaturado: 1000, tempoMedioRespostaMinutos: 30 }) },
    { usuarioId: 2, usuarioNome: 'Bruno Lima', indicadores: indicadores({ valorFaturado: 5000, tempoMedioRespostaMinutos: 240 }) },
  ],
};

function LocalAtual() {
  const loc = useLocation();
  return <p data-testid="local">{loc.pathname + loc.search}</p>;
}

function renderPage(url = '/produtividade?mes=2026-09') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/produtividade" element={<ProdutividadeConsultoresPage />} />
        <Route path="*" element={null} />
      </Routes>
      <LocalAtual />
    </MemoryRouter>,
  );
}

function nomesNaOrdem() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent ?? '');
}

describe('ProdutividadeConsultoresPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: ['PRODUTIVIDADE_READ'] });
    vi.mocked(useProdutividadeConsultores).mockReturnValue({
      data: relatorio,
      isLoading: false,
      isPlaceholderData: false,
    } as never);
  });

  it('reads the month from the URL and shows the oficina totals', () => {
    renderPage();
    expect(useProdutividadeConsultores).toHaveBeenCalledWith('2026-09');
    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();
    expect(screen.getByText('Taxa de conversão')).toBeInTheDocument();
    expect(screen.getByText('5 de 10 orçamentos aprovados')).toBeInTheDocument();
  });

  it('ranks by revenue by default and keeps "Sem consultor" last', () => {
    renderPage();
    const nomes = nomesNaOrdem();
    expect(nomes[0]).toContain('Bruno Lima');
    expect(nomes[1]).toContain('Ana Souza');
    expect(nomes[2]).toContain('Sem consultor registrado');
  });

  it('ranks response time ascending — faster is better', async () => {
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'resposta');
    expect(nomesNaOrdem()[0]).toContain('Ana Souza');
  });

  it('opens a consultor detail keeping the selected month', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Ana Souza'));
    expect(screen.getByTestId('local')).toHaveTextContent('/produtividade/consultores/1?mes=2026-09');
  });

  it('does not navigate for the "Sem consultor" row', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Sem consultor registrado'));
    expect(screen.getByTestId('local')).toHaveTextContent('/produtividade?mes=2026-09');
  });

  it('moves to the previous month but never past the current one', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Mês anterior'));
    expect(screen.getByTestId('local')).toHaveTextContent('mes=2026-08');

    renderPage(`/produtividade`);
    expect(screen.getAllByLabelText('Próximo mês').at(-1)).toBeDisabled();
  });

  it('warns when the PHT is not configured, linking to it only for who manages it', () => {
    vi.mocked(useProdutividadeConsultores).mockReturnValue({
      data: { ...relatorio, horasTecnicasDisponiveis: null },
      isLoading: false,
    } as never);
    renderPage();
    expect(screen.getByText(/depende das horas disponíveis/)).toBeInTheDocument();
    expect(screen.queryByText('Configurar hora técnica')).not.toBeInTheDocument();

    useAuthStore.setState({ permissoes: ['PRODUTIVIDADE_READ', 'HORA_TECNICA_GERENCIAR'] });
    renderPage();
    expect(screen.getByText('Configurar hora técnica')).toBeInTheDocument();
  });
});
