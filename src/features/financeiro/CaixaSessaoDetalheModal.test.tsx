import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCaixaSessaoEventos, useReabrirCaixaSessao } from '@/hooks/useFinanceiro';
import { caixaApi } from '@/api/endpoints/caixa';
import { baixarExportacaoCaixa } from './caixaExport';
import { CaixaSessaoDetalheModal } from './CaixaSessaoDetalheModal';
import type { CaixaSessaoResponse } from '@/api/types';

vi.mock('@/hooks/useFinanceiro', () => ({
  useCaixaSessaoEventos: vi.fn(),
  useReabrirCaixaSessao: vi.fn(),
}));
vi.mock('@/api/endpoints/caixa', () => ({ caixaApi: { sessoes: { exportar: vi.fn() } } }));
vi.mock('./caixaExport', () => ({ baixarExportacaoCaixa: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sessaoFechada: CaixaSessaoResponse = {
  id: 5,
  identificador: 'CX-0005',
  turno: 'Tarde',
  status: 'FECHADO',
  abertoPorUsuarioNome: 'Carla Caixa',
  abertoEm: '2026-01-15T13:00:00',
  fechadoPorUsuarioNome: 'Carla Caixa',
  fechadoEm: '2026-01-15T20:00:00',
  saldoInicial: { dinheiro: 100, cartao: 0, pix: 0, transferencia: 0, total: 100 },
  totalEntradas: { dinheiro: 200, cartao: 0, pix: 0, transferencia: 0, total: 200 },
  totalSaidas: { dinheiro: 0, cartao: 0, pix: 0, transferencia: 0, total: 0 },
  saldoAtual: { dinheiro: 300, cartao: 0, pix: 0, transferencia: 0, total: 300 },
  saldoFinalInformado: { dinheiro: 280, cartao: 0, pix: 0, transferencia: 0, total: 280 },
  divergencia: { dinheiro: -20, cartao: 0, pix: 0, transferencia: 0, total: -20 },
};

describe('CaixaSessaoDetalheModal', () => {
  beforeEach(() => {
    vi.mocked(useCaixaSessaoEventos).mockReturnValue({ data: [], isLoading: false } as never);
    vi.mocked(useReabrirCaixaSessao).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });

  it('renders null without a session', () => {
    const { container } = render(<CaixaSessaoDetalheModal sessao={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the per-forma breakdown including divergência for a closed session', () => {
    render(<CaixaSessaoDetalheModal sessao={sessaoFechada} onClose={vi.fn()} />);

    expect(screen.getByText('Caixa CX-0005', { selector: 'h2' })).toBeInTheDocument();
    const linhaTotal = screen.getByText('Total').closest('tr')!;
    expect(linhaTotal).toHaveTextContent('-R$ 20,00');
  });

  it('lets who manages caixa reabrir a closed session after providing a motivo', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 5, status: 'ABERTO' });
    vi.mocked(useReabrirCaixaSessao).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<CaixaSessaoDetalheModal sessao={sessaoFechada} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Reabrir/ }));
    await userEvent.type(screen.getByLabelText(/Motivo da reabertura/), 'Fechamento com valor errado');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar reabertura' }));

    expect(mutateAsync).toHaveBeenCalledWith({ id: 5, payload: { motivo: 'Fechamento com valor errado' } });
  });

  it('exports the session receipt as PDF via the shared export helper', async () => {
    render(<CaixaSessaoDetalheModal sessao={sessaoFechada} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /^PDF$/ }));

    expect(baixarExportacaoCaixa).toHaveBeenCalledWith(expect.any(Function), 'caixa-CX-0005', 'PDF');
  });
});
