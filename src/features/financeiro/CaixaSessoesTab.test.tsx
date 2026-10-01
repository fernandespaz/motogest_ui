import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCaixaSessoes, useCaixaSessaoEventos, useReabrirCaixaSessao } from '@/hooks/useFinanceiro';
import { CaixaSessoesTab } from './CaixaSessoesTab';

vi.mock('@/hooks/useFinanceiro', () => ({
  useCaixaSessoes: vi.fn(),
  useCaixaSessaoEventos: vi.fn(),
  useReabrirCaixaSessao: vi.fn(),
}));

const sessoes = [
  {
    id: 1,
    identificador: 'CX-0001',
    turno: 'Manhã',
    status: 'ABERTO' as const,
    abertoPorUsuarioNome: 'Carla Caixa',
    abertoEm: '2026-01-15T08:00:00',
    saldoAtual: { dinheiro: 100, cartao: 0, pix: 0, transferencia: 0, total: 100 },
  },
];

describe('CaixaSessoesTab', () => {
  beforeEach(() => {
    vi.mocked(useCaixaSessaoEventos).mockReturnValue({ data: [], isLoading: false } as never);
    vi.mocked(useReabrirCaixaSessao).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });

  it('lists caixa sessions with status and current balance', () => {
    vi.mocked(useCaixaSessoes).mockReturnValue({
      data: { content: sessoes, pageNumber: 0, totalPages: 1, totalElements: 1 },
      isLoading: false,
    } as never);
    render(<CaixaSessoesTab />);

    expect(screen.getByText('CX-0001')).toBeInTheDocument();
    expect(screen.getByText('Carla Caixa')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
  });

  it('opens the session detail modal on row click', async () => {
    vi.mocked(useCaixaSessoes).mockReturnValue({
      data: { content: sessoes, pageNumber: 0, totalPages: 1, totalElements: 1 },
      isLoading: false,
    } as never);
    vi.mocked(useCaixaSessaoEventos).mockReturnValue({ data: [], isLoading: false } as never);
    vi.mocked(useReabrirCaixaSessao).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<CaixaSessoesTab />);

    await userEvent.click(screen.getByText('CX-0001'));

    expect(screen.getByText('Caixa CX-0001', { selector: 'h2' })).toBeInTheDocument();
  });

  it('shows the empty state when there are no sessions', () => {
    vi.mocked(useCaixaSessoes).mockReturnValue({
      data: { content: [], pageNumber: 0, totalPages: 0, totalElements: 0 },
      isLoading: false,
    } as never);
    render(<CaixaSessoesTab />);

    expect(screen.getByText('Nenhuma sessão de caixa registrada')).toBeInTheDocument();
  });
});
