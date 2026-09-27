import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { FinanceiroPage } from './FinanceiroPage';

vi.mock('./CaixaAdminTab', () => ({ CaixaAdminTab: () => <p>aba-caixa</p> }));
vi.mock('./ContasPagarTab', () => ({ ContasPagarTab: () => <p>aba-pagar</p> }));
vi.mock('./ContasReceberTab', () => ({ ContasReceberTab: () => <p>aba-receber</p> }));

function renderPage(url = '/financeiro') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <FinanceiroPage />
    </MemoryRouter>,
  );
}

describe('FinanceiroPage', () => {
  beforeEach(() => useAuthStore.setState({ permissoes: ['FINANCEIRO_READ', 'CAIXA_GERENCIAR'] }));

  it('opens straight on the tab named in ?aba=', () => {
    renderPage('/financeiro?aba=receber');
    expect(screen.getByText('aba-receber')).toBeInTheDocument();
  });

  // CAIXA_GERENCIAR é um código próprio, separado de FINANCEIRO_READ — o
  // Perfil Caixa (CAIXA_OPERAR) opera pela tela "Meu Caixa" (/caixa), nunca
  // por aqui, e quem só tem FINANCEIRO_READ não deveria ver todos os turnos.
  it('hides the caixa tab (and never mounts it) without CAIXA_GERENCIAR, even with FINANCEIRO_READ', () => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ'] });
    renderPage('/financeiro?aba=caixa');
    expect(screen.queryByRole('button', { name: 'Caixa' })).not.toBeInTheDocument();
    expect(screen.queryByText('aba-caixa')).not.toBeInTheDocument();
    expect(screen.getByText('aba-pagar')).toBeInTheDocument();
  });

  it('shows the caixa tab for who has CAIXA_GERENCIAR without FINANCEIRO_READ, hiding contas a pagar/receber', () => {
    useAuthStore.setState({ permissoes: ['CAIXA_GERENCIAR'] });
    renderPage('/financeiro');
    expect(screen.getByText('aba-caixa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Contas a Pagar' })).not.toBeInTheDocument();
  });
});
