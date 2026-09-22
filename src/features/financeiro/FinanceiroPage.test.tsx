import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { FinanceiroPage } from './FinanceiroPage';

vi.mock('./CaixaTab', () => ({ CaixaTab: () => <p>aba-caixa</p> }));
vi.mock('./ContasPagarTab', () => ({ ContasPagarTab: () => <p>aba-pagar</p> }));
vi.mock('./ContasReceberTab', () => ({ ContasReceberTab: () => <p>aba-receber</p> }));
vi.mock('./DespesasFixasTab', () => ({ DespesasFixasTab: () => <p>aba-despesas-fixas</p> }));

function renderPage(url = '/financeiro') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <FinanceiroPage />
    </MemoryRouter>,
  );
}

describe('FinanceiroPage', () => {
  beforeEach(() => useAuthStore.setState({ permissoes: ['FINANCEIRO_READ', 'HORA_TECNICA_GERENCIAR'] }));

  it('shows the fixed expenses next to the payables for who manages them', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Despesas Fixas' }));
    expect(screen.getByText('aba-despesas-fixas')).toBeInTheDocument();
  });

  it('opens straight on the tab named in ?aba=', () => {
    renderPage('/financeiro?aba=despesas-fixas');
    expect(screen.getByText('aba-despesas-fixas')).toBeInTheDocument();
  });

  it('hides the fixed-expenses tab (and never mounts it) without HORA_TECNICA_GERENCIAR', () => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ'] });
    renderPage('/financeiro?aba=despesas-fixas');
    expect(screen.queryByRole('button', { name: 'Despesas Fixas' })).not.toBeInTheDocument();
    expect(screen.queryByText('aba-despesas-fixas')).not.toBeInTheDocument();
    expect(screen.getByText('aba-caixa')).toBeInTheDocument();
  });

  it('lets who only manages the technical hour reach the fixed expenses, hiding the tabs that would 403', () => {
    useAuthStore.setState({ permissoes: ['HORA_TECNICA_GERENCIAR'] });
    renderPage('/financeiro');
    expect(screen.getByText('aba-despesas-fixas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Caixa' })).not.toBeInTheDocument();
    expect(screen.queryByText('aba-caixa')).not.toBeInTheDocument();
  });
});
