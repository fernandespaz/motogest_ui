import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useTodasContasPagar, useTodasContasReceber } from '@/hooks/useFinanceiro';
import { FinanceiroPage } from './FinanceiroPage';

vi.mock('@/hooks/useFinanceiro', () => ({ useTodasContasPagar: vi.fn(), useTodasContasReceber: vi.fn() }));
vi.mock('./CaixaAdminTab', () => ({ CaixaAdminTab: () => <p>aba-caixa</p> }));
vi.mock('./FinanceiroAjustes', () => ({ FinanceiroAjustes: () => <p>aba-ajustes</p> }));
vi.mock('./FinanceiroRelatorios', () => ({ FinanceiroRelatorios: () => <p>aba-relatorios</p> }));
vi.mock('./FinanceiroFechamento', () => ({ FinanceiroFechamento: () => <p>aba-fechamento</p> }));
vi.mock('./ContasTab', () => ({
  ContasTab: ({ tipo, situacaoInicial }: { tipo: string; situacaoInicial: string }) => (
    <p>
      aba-{tipo}-{situacaoInicial}
    </p>
  ),
}));
vi.mock('./FinanceiroVisaoGeral', () => ({
  FinanceiroVisaoGeral: ({ onIrPara }: { onIrPara: (d: { aba: string; situacao?: string }) => void }) => (
    <button onClick={() => onIrPara({ aba: 'receber', situacao: 'vencida' })}>aba-geral</button>
  ),
}));

const dia = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');

function renderPage(url = '/financeiro') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <FinanceiroPage />
    </MemoryRouter>,
  );
}

describe('FinanceiroPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ', 'CAIXA_GERENCIAR'] });
    vi.mocked(useTodasContasPagar).mockReturnValue({ data: [] } as never);
    vi.mocked(useTodasContasReceber).mockReturnValue({ data: [] } as never);
  });

  it('opens on the overview by default and on the tab named in ?aba=', () => {
    renderPage();
    expect(screen.getByText('aba-geral')).toBeInTheDocument();
  });

  it('opens straight on the tab and the situation named in the URL', () => {
    renderPage('/financeiro?aba=receber&situacao=vencida');
    expect(screen.getByText('aba-receber-vencida')).toBeInTheDocument();
  });

  it('opens the settings tab (categories and closing day) for who can read the financeiro', () => {
    renderPage('/financeiro?aba=ajustes');
    expect(screen.getByText('aba-ajustes')).toBeInTheDocument();
  });

  it('ignores an unknown situation in the URL', () => {
    renderPage('/financeiro?aba=pagar&situacao=qualquer');
    expect(screen.getByText('aba-pagar-todas')).toBeInTheDocument();
  });

  it('lets the overview send the user to a filtered tab', async () => {
    renderPage();
    await userEvent.click(screen.getByText('aba-geral'));
    expect(screen.getByText('aba-receber-vencida')).toBeInTheDocument();
  });

  it('flags overdue accounts in a strip and in the tab badges, and the strip leads to the overdue list', async () => {
    vi.mocked(useTodasContasPagar).mockReturnValue({
      data: [{ id: 1, status: 'PENDENTE', dataVencimento: dia(-3), valor: 100 }, { id: 2, status: 'PENDENTE', dataVencimento: dia(5), valor: 50 }],
    } as never);
    renderPage();

    expect(screen.getByText('1 conta vencida')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Ver vencidas/ }));
    expect(screen.getByText('aba-pagar-vencida')).toBeInTheDocument();
  });

  it('shows no strip when nothing is overdue', () => {
    renderPage();
    expect(screen.queryByText(/vencida/)).not.toBeInTheDocument();
  });

  // CAIXA_GERENCIAR é um código próprio, separado de FINANCEIRO_READ — o
  // Perfil Caixa (CAIXA_OPERAR) opera pela tela "Meu Caixa" (/caixa), nunca
  // por aqui, e quem só tem FINANCEIRO_READ não deveria ver todos os turnos.
  it('hides the caixa tab (and never mounts it) without CAIXA_GERENCIAR, even with FINANCEIRO_READ', () => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ'] });
    renderPage('/financeiro?aba=caixa');
    expect(screen.queryByRole('button', { name: 'Caixa' })).not.toBeInTheDocument();
    expect(screen.queryByText('aba-caixa')).not.toBeInTheDocument();
    expect(screen.getByText('aba-geral')).toBeInTheDocument();
  });

  it('shows only the caixa tab for who has CAIXA_GERENCIAR without FINANCEIRO_READ, with no overdue strip', () => {
    useAuthStore.setState({ permissoes: ['CAIXA_GERENCIAR'] });
    vi.mocked(useTodasContasPagar).mockReturnValue({ data: [{ id: 1, status: 'PENDENTE', dataVencimento: dia(-3), valor: 100 }] } as never);
    renderPage('/financeiro');
    expect(screen.getByText('aba-caixa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /A pagar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajustes' })).not.toBeInTheDocument();
    expect(screen.queryByText(/conta vencida/)).not.toBeInTheDocument();
  });
});
