import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useTodasContasPagar, useTodasContasReceber } from '@/hooks/useFinanceiro';
import { VencidasDialog } from './VencidasDialog';

vi.mock('@/hooks/useFinanceiro', () => ({ useTodasContasPagar: vi.fn(), useTodasContasReceber: vi.fn() }));

const dia = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');
let sessao = 0;

function Local() {
  const l = useLocation();
  return <p>local:{l.pathname + l.search}</p>;
}

function renderDialog() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <VencidasDialog />
      <Routes>
        <Route path="*" element={<Local />} />
      </Routes>
    </MemoryRouter>,
  );
}

function contas(pagarVencidas: number, receberVencidas = 0) {
  const vencida = (id: number, valor: number) => ({ id, descricao: `Conta ${id}`, valor, dataVencimento: dia(-2), status: 'PENDENTE' });
  vi.mocked(useTodasContasPagar).mockReturnValue({
    isSuccess: true,
    data: Array.from({ length: pagarVencidas }, (_, i) => vencida(i + 1, 100)),
  } as never);
  vi.mocked(useTodasContasReceber).mockReturnValue({
    isSuccess: true,
    data: Array.from({ length: receberVencidas }, (_, i) => vencida(100 + i, 50)),
  } as never);
}

describe('VencidasDialog', () => {
  beforeEach(() => {
    // Cada teste é uma "sessão" nova (o aviso é uma vez por token).
    sessao += 1;
    useAuthStore.setState({ token: `token-${sessao}`, permissoes: ['FINANCEIRO_READ'] } as never);
  });

  it('warns about overdue accounts, summarised per side, when entering the system', () => {
    contas(2, 1);
    renderDialog();

    expect(screen.getByText('Você tem 3 contas vencidas')).toBeInTheDocument();
    expect(screen.getByText('A pagar vencidas')).toBeInTheDocument();
    expect(screen.getByText('A receber vencidas')).toBeInTheDocument();
  });

  it('stays quiet when nothing is overdue', () => {
    contas(0, 0);
    renderDialog();
    expect(screen.queryByText(/contas? vencidas?/)).not.toBeInTheDocument();
  });

  it('stays quiet for a profile without FINANCEIRO_READ, and does not even fetch', () => {
    useAuthStore.setState({ permissoes: [] } as never);
    contas(2);
    renderDialog();
    expect(screen.queryByText(/Você tem/)).not.toBeInTheDocument();
    expect(vi.mocked(useTodasContasPagar)).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('"Lembrar depois" closes it and it does not come back in the same session', async () => {
    contas(1);
    const { unmount } = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Lembrar depois' }));
    await waitFor(() => expect(screen.queryByText('Você tem 1 conta vencida')).not.toBeInTheDocument());
    unmount();

    renderDialog();
    expect(screen.queryByText('Você tem 1 conta vencida')).not.toBeInTheDocument();
  });

  it('leads to the overdue accounts to pay', async () => {
    contas(1, 1);
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Ver contas vencidas' }));
    expect(screen.getByText('local:/financeiro?aba=pagar&situacao=vencida')).toBeInTheDocument();
  });

  it('leads to the overdue accounts to receive when there are none to pay', async () => {
    contas(0, 2);
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Ver contas vencidas' }));
    expect(screen.getByText('local:/financeiro?aba=receber&situacao=vencida')).toBeInTheDocument();
  });
});

