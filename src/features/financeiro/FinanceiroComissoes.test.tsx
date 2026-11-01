import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useComissoes, usePagarComissoes, useResumoComissoes } from '@/hooks/useComissoes';
import { useSituacaoFechamento } from '@/hooks/useFinanceiro';
import { FinanceiroComissoes } from './FinanceiroComissoes';

vi.mock('@/hooks/useComissoes', () => ({
  useComissoes: vi.fn(),
  usePagarComissoes: vi.fn(),
  useResumoComissoes: vi.fn(),
}));
vi.mock('@/hooks/useFinanceiro', () => ({ useSituacaoFechamento: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const resumo = [
  { usuarioId: 12, usuarioNome: 'João Mecânico', totalMecanico: 320, totalConsultor: 0, totalPendente: 200, totalPago: 120, quantidadePendente: 5 },
];

describe('FinanceiroComissoes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 29)); // 29/10/2026, depois do fechamento do dia 20
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ', 'FINANCEIRO_WRITE'] } as never);
    vi.mocked(useSituacaoFechamento).mockReturnValue({ isLoading: false, data: { diaFechamento: 20 } } as never);
    vi.mocked(useResumoComissoes).mockReturnValue({ isLoading: false, data: resumo } as never);
    vi.mocked(useComissoes).mockReturnValue({ isLoading: false, data: [] } as never);
    vi.mocked(usePagarComissoes).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });
  afterEach(() => vi.useRealTimers());

  it('consulta o período do dia de fechamento e mostra o 5º dia útil do mês seguinte', () => {
    render(<FinanceiroComissoes />);

    expect(useResumoComissoes).toHaveBeenCalledWith({ inicio: '2026-10-21', fim: '2026-11-20' }, { enabled: true });
    expect(screen.getByText(/Pagamento previsto: 07\/12\/2026/)).toBeInTheDocument();
    expect(screen.getByText('João Mecânico')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 200,00').length).toBeGreaterThan(0);
  });

  it('trocar o período refaz a consulta com as datas dele', async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 29));
    render(<FinanceiroComissoes />);

    await userEvent.setup({ advanceTimers: () => {} }).selectOptions(screen.getByLabelText('Período'), '2026-10-20');

    expect(useResumoComissoes).toHaveBeenLastCalledWith({ inicio: '2026-09-21', fim: '2026-10-20' }, { enabled: true });
  });
});
