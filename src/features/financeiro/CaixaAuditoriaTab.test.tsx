import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditoriaCaixa } from '@/hooks/useFinanceiro';
import { baixarCsv } from '@/lib/csv';
import { CaixaAuditoriaTab } from './CaixaAuditoriaTab';

vi.mock('@/hooks/useFinanceiro', () => ({ useAuditoriaCaixa: vi.fn() }));
vi.mock('@/lib/csv', () => ({ baixarCsv: vi.fn() }));

const auditoria = {
  totais: { sessoes: 2, sessoesComDivergencia: 1, divergenciaLiquida: -5, divergenciaAbsoluta: 15, reaberturas: 1 },
  sessoes: [
    {
      id: 1,
      identificador: 'CAIXA_20261005_TURNO1',
      status: 'FECHADO',
      abertoPorNome: 'Ana',
      abertoEm: '2026-10-05T08:00:00',
      entradas: 100,
      saidas: 20,
      divergencia: -5,
      justificativaDivergencia: 'Troco errado',
      reaberturas: 1,
    },
    { id: 2, identificador: 'CAIXA_20261006_TURNO1', status: 'FECHADO', abertoPorNome: 'Beto', abertoEm: '2026-10-06T08:00:00', entradas: 50, saidas: 0, divergencia: 0, reaberturas: 0 },
  ],
  reaberturas: [{ sessaoId: 1, identificador: 'CAIXA_20261005_TURNO1', usuarioNome: 'Chefe', ocorridoEm: '2026-10-06T09:00:00', motivo: 'Esqueci uma venda' }],
  semSessao: { quantidade: 3, entradas: 80, saidas: 300 },
};

describe('CaixaAuditoriaTab', () => {
  beforeEach(() => {
    vi.mocked(useAuditoriaCaixa).mockReturnValue({ data: auditoria, isLoading: false, isError: false } as never);
    vi.mocked(baixarCsv).mockClear();
  });

  it('summarises the period: boxes, divergences, reopenings and movements outside any shift', () => {
    render(<CaixaAuditoriaTab />);
    expect(screen.getByText('Caixas no período')).toBeInTheDocument();
    expect(screen.getByText('Com divergência')).toBeInTheDocument();
    expect(screen.getByText('faltou dinheiro')).toBeInTheDocument();
    expect(screen.getByText('R$ 15,00 de diferença no total')).toBeInTheDocument();

    const linha1 = screen.getByText('CAIXA_20261005_TURNO1', { selector: 'span' }).closest('tr')!;
    expect(within(linha1).getByText('Faltou R$ 5,00')).toBeInTheDocument();
    expect(within(linha1).getByText(/Troco errado/)).toBeInTheDocument();
    expect(within(linha1).getByText('Reaberto 1x')).toBeInTheDocument();
    const linha2 = screen.getByText('CAIXA_20261006_TURNO1').closest('tr')!;
    expect(within(linha2).getByText('Sem divergência')).toBeInTheDocument();

    expect(screen.getByText(/“Esqueci uma venda”/)).toBeInTheDocument();
    expect(screen.getByText('R$ 80,00 recebidos · R$ 300,00 pagos')).toBeInTheDocument();
  });

  it('exports the audited boxes as CSV', async () => {
    render(<CaixaAuditoriaTab />);
    await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(baixarCsv).toHaveBeenCalledTimes(1);
    const [nome, linhas] = vi.mocked(baixarCsv).mock.calls[0];
    expect(nome).toMatch(/^auditoria-caixa-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}$/);
    expect(linhas).toHaveLength(3); // cabeçalho + 2 caixas
    expect(linhas[1]).toContain('CAIXA_20261005_TURNO1');
    expect(linhas[1]).toContain(-5);
  });

  it('says so when nothing happened in the period', () => {
    vi.mocked(useAuditoriaCaixa).mockReturnValue({
      data: { totais: { sessoes: 0, sessoesComDivergencia: 0, divergenciaLiquida: 0, divergenciaAbsoluta: 0, reaberturas: 0 }, sessoes: [], reaberturas: [], semSessao: { quantidade: 0, entradas: 0, saidas: 0 } },
      isLoading: false,
      isError: false,
    } as never);
    render(<CaixaAuditoriaTab />);
    expect(screen.getByText('Nenhum caixa aberto neste período')).toBeInTheDocument();
    expect(screen.getByText('Nenhum caixa foi reaberto neste período.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma baixa de conta fora de um turno neste período.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  });

  it('shows an error instead of an empty report when the request fails', () => {
    vi.mocked(useAuditoriaCaixa).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);
    render(<CaixaAuditoriaTab />);
    expect(screen.getByText('Não foi possível carregar a auditoria deste período.')).toBeInTheDocument();
  });
});
