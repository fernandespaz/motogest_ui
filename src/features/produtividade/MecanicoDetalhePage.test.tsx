import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProdutividadeMecanico } from '@/hooks/useProdutividade';
import { useAuthStore } from '@/store/authStore';
import { MecanicoDetalhePage } from './MecanicoDetalhePage';

vi.mock('@/hooks/useProdutividade', () => ({ useProdutividadeMecanico: vi.fn() }));

function renderPage(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/produtividade/mecanicos/:usuarioId" element={<MecanicoDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MecanicoDetalhePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ permissoes: ['PRODUTIVIDADE_READ', 'ORDEM_SERVICO_READ'], perfil: 'Administrador' });
  });

  it("shows the mechanic's hours and links each finished OS", () => {
    vi.mocked(useProdutividadeMecanico).mockReturnValue({
      data: {
        usuarioNome: 'Marcos Mecanico',
        indicadores: { minutosVendidos: 90 },
        ordensConcluidas: [{ id: 5, numero: 'OS-000005', minutosVendidos: 90, minutosConsumidos: 60, tempoEstourado: false }],
        horasPorDia: [{ data: '2026-09-01', minutosTrabalhados: 60 }],
      },
      isLoading: false,
    } as never);
    renderPage('/produtividade/mecanicos/3?mes=2026-09');

    expect(useProdutividadeMecanico).toHaveBeenCalledWith(3, '2026-09');
    expect(screen.getByText('Marcos Mecanico')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'OS-000005' })).toHaveAttribute('href', '/ordens-servico/5');
    expect(screen.getByRole('listitem', { name: '01/09/2026: 1 h' })).toBeInTheDocument();
  });

  it('shows "not found" for a malformed id or a failed request instead of spinning forever', () => {
    vi.mocked(useProdutividadeMecanico).mockReturnValue({ data: undefined, isLoading: false } as never);
    renderPage('/produtividade/mecanicos/abc');
    expect(screen.getByText('Mecânico não encontrado')).toBeInTheDocument();

    vi.mocked(useProdutividadeMecanico).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);
    renderPage('/produtividade/mecanicos/3');
    expect(screen.getAllByText('Mecânico não encontrado')).toHaveLength(2);
  });
});
