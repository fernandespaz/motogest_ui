import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useRelatorioCaixaDiario, useRelatorioCaixaPeriodo } from '@/hooks/useFinanceiro';
import { baixarExportacaoCaixa } from './caixaExport';
import { CaixaRelatoriosTab } from './CaixaRelatoriosTab';

vi.mock('@/hooks/useFinanceiro', () => ({
  useRelatorioCaixaDiario: vi.fn(),
  useRelatorioCaixaPeriodo: vi.fn(),
}));
vi.mock('@/api/endpoints/caixa', () => ({
  caixaApi: { relatorios: { diarioExportar: vi.fn(), periodoExportar: vi.fn() } },
}));
vi.mock('./caixaExport', () => ({ baixarExportacaoCaixa: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('CaixaRelatoriosTab', () => {
  it('shows the daily totals by default', () => {
    vi.mocked(useRelatorioCaixaDiario).mockReturnValue({
      data: { totalEntradas: 500, totalSaidas: 100, saldoDia: 400, movimentos: [], sessoes: [] },
      isLoading: false,
    } as never);
    vi.mocked(useRelatorioCaixaPeriodo).mockReturnValue({ data: undefined, isLoading: false } as never);
    render(<CaixaRelatoriosTab />);

    expect(screen.getByText('R$ 400,00')).toBeInTheDocument();
  });

  it('switches to the período sub-tab and shows peak days', async () => {
    vi.mocked(useRelatorioCaixaDiario).mockReturnValue({
      data: { totalEntradas: 0, totalSaidas: 0, saldoDia: 0, movimentos: [], sessoes: [] },
      isLoading: false,
    } as never);
    vi.mocked(useRelatorioCaixaPeriodo).mockReturnValue({
      data: {
        totalEntradas: 1000,
        totalSaidas: 200,
        saldoPeriodo: 800,
        diaDePicoDeEntrada: '2026-01-10',
        diaDePicoDeSaida: '2026-01-12',
        pontosDiarios: [],
      },
      isLoading: false,
    } as never);
    render(<CaixaRelatoriosTab />);

    await userEvent.click(screen.getByRole('button', { name: 'Período' }));

    expect(screen.getByText('R$ 800,00')).toBeInTheDocument();
    expect(screen.getByText('10/01/2026')).toBeInTheDocument();
  });

  it('exports the daily report as Excel via the shared export helper', async () => {
    vi.mocked(useRelatorioCaixaDiario).mockReturnValue({
      data: { totalEntradas: 0, totalSaidas: 0, saldoDia: 0, movimentos: [], sessoes: [] },
      isLoading: false,
    } as never);
    vi.mocked(useRelatorioCaixaPeriodo).mockReturnValue({ data: undefined, isLoading: false } as never);
    render(<CaixaRelatoriosTab />);

    await userEvent.click(screen.getByRole('button', { name: /^Excel$/ }));

    expect(baixarExportacaoCaixa).toHaveBeenCalledWith(expect.any(Function), expect.stringMatching(/^caixa-diario-/), 'XLSX');
  });
});
