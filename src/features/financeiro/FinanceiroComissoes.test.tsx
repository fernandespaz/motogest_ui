import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useComissoes, usePagarComissoes } from '@/hooks/useComissoes';
import { useFeriadosDosMeses } from '@/hooks/useDiasUteis';
import { useSituacaoFechamento } from '@/hooks/useFinanceiro';
import type { ComissaoResponse } from '@/api/types';
import { FinanceiroComissoes } from './FinanceiroComissoes';

vi.mock('@/hooks/useComissoes', () => ({
  useComissoes: vi.fn(),
  usePagarComissoes: vi.fn(),
}));
vi.mock('@/hooks/useDiasUteis', () => ({ useFeriadosDosMeses: vi.fn() }));
vi.mock('@/hooks/useFinanceiro', () => ({ useSituacaoFechamento: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const comissao = (over: Partial<ComissaoResponse>): ComissaoResponse => ({
  id: 1,
  ordemServicoId: 100,
  ordemServicoNumero: 'OS-0001',
  usuarioId: 12,
  usuarioNome: 'João Mecânico',
  papel: 'MECANICO',
  baseCalculo: 1000,
  percentual: 10,
  valor: 100,
  status: 'PENDENTE',
  dataGeracao: '2026-10-25T10:00:00',
  dataPagamento: null,
  contaPagarId: null,
  ...over,
});

const comissoes = [
  comissao({ id: 1, ordemServicoNumero: 'OS-0001', valor: 100 }),
  comissao({ id: 2, ordemServicoId: 101, ordemServicoNumero: 'OS-0002', valor: 100 }),
  comissao({ id: 3, ordemServicoId: 102, ordemServicoNumero: 'OS-0003', valor: 120, status: 'PAGA', dataPagamento: '2026-11-07' }),
  comissao({ id: 4, ordemServicoId: 103, usuarioId: 20, usuarioNome: 'Carla Consultora', papel: 'CONSULTOR', valor: 50, ordemServicoNumero: 'OS-0004' }),
];

function renderTela() {
  return render(
    <MemoryRouter>
      <FinanceiroComissoes />
    </MemoryRouter>,
  );
}

describe('FinanceiroComissoes', () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 29)); // 29/10/2026, depois do fechamento do dia 20
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ', 'FINANCEIRO_WRITE', 'ORDEM_SERVICO_READ'] } as never);
    vi.mocked(useSituacaoFechamento).mockReturnValue({ isLoading: false, data: { diaFechamento: 20 } } as never);
    vi.mocked(useFeriadosDosMeses).mockReturnValue({ feriados: new Set(), semUf: false });
    vi.mocked(useComissoes).mockReturnValue({ isLoading: false, data: comissoes } as never);
    mutateAsync.mockReset().mockResolvedValue({ valorTotal: 200, usuarioNome: 'João Mecânico' });
    vi.mocked(usePagarComissoes).mockReturnValue({ mutateAsync, isPending: false } as never);
  });
  afterEach(() => vi.useRealTimers());

  const user = () => userEvent.setup({ advanceTimers: () => {} });

  it('consulta o período do fechamento, mostra o previsto e os totais a pagar / pago / total', () => {
    renderTela();

    expect(useComissoes).toHaveBeenCalledWith({ inicio: '2026-10-21', fim: '2026-11-20' }, { enabled: true });
    expect(screen.getByText(/Pagamento previsto: 07\/12\/2026/)).toBeInTheDocument();
    expect(screen.getByText('A pagar', { selector: 'p' }).parentElement).toHaveTextContent('R$ 250,00');
    expect(screen.getByText('Já pago', { selector: 'p' }).parentElement).toHaveTextContent('R$ 120,00');
    expect(screen.getByText('Total do período', { selector: 'p' }).parentElement).toHaveTextContent('R$ 370,00');
  });

  it('o previsto de pagamento pula os feriados do mês (ex.: Finados em 02/11)', () => {
    vi.mocked(useFeriadosDosMeses).mockReturnValue({ feriados: new Set(['2026-11-02']), semUf: false });
    renderTela();

    // período atual paga em dezembro; o seletor do período anterior (paga em nov) também respeita o feriado
    expect(screen.getByRole('option', { name: '21/09/2026 a 20/10/2026 — paga em 09/11/2026' })).toBeInTheDocument();
  });

  it('avisa quando a oficina está sem UF', () => {
    vi.mocked(useFeriadosDosMeses).mockReturnValue({ feriados: new Set(), semUf: true });
    renderTela();

    expect(screen.getByText(/só os feriados nacionais entram no cálculo/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Informe a UF da oficina' })).toHaveAttribute('href', '/oficina');
  });

  it('lista o funcionário e só mostra as OS ao abrir', async () => {
    renderTela();

    const joao = screen.getByRole('button', { name: /João Mecânico/ });
    expect(joao).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('OS-0001')).not.toBeInTheDocument();

    await user().click(joao);

    expect(joao).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'OS-0001' })).toHaveAttribute('href', '/ordens-servico/100');
    expect(screen.queryByText('OS-0004')).not.toBeInTheDocument(); // a OS da Carla fica no cartão dela
  });

  it('filtra as OS do funcionário por situação', async () => {
    renderTela();
    const u = user();
    await u.click(screen.getByRole('button', { name: /João Mecânico/ }));

    await u.click(screen.getByRole('radio', { name: 'Pagas' }));

    expect(screen.queryByText('OS-0001')).not.toBeInTheDocument();
    expect(screen.getByText('OS-0003')).toBeInTheDocument();
  });

  it('paga só as comissões selecionadas depois de confirmar', async () => {
    renderTela();
    const u = user();
    await u.click(screen.getByRole('button', { name: /João Mecânico/ }));

    const botao = screen.getByRole('button', { name: /Pagar selecionadas/ });
    expect(botao).toBeDisabled();

    await u.click(screen.getByLabelText('Selecionar tudo que está a pagar (2)'));
    expect(botao).toHaveTextContent('R$ 200,00');
    await u.click(botao);
    await u.click(await screen.findByRole('button', { name: 'Confirmar pagamento' }));

    expect(mutateAsync).toHaveBeenCalledWith({ comissaoIds: [1, 2], formaPagamento: 'PIX' });
  });

  it('sem permissões extras não oferece pagamento nem link para a OS', async () => {
    useAuthStore.setState({ permissoes: ['FINANCEIRO_READ'] } as never);
    renderTela();
    await user().click(screen.getByRole('button', { name: /João Mecânico/ }));

    expect(screen.queryByRole('button', { name: /Pagar selecionadas/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Selecionar OS OS-0001')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'OS-0001' })).not.toBeInTheDocument();
    expect(screen.getByText('OS-0001')).toBeInTheDocument();
  });

  it('trocar o período refaz a consulta com as datas dele', async () => {
    renderTela();

    await user().selectOptions(screen.getByLabelText('Período'), '2026-10-20');

    expect(useComissoes).toHaveBeenLastCalledWith({ inicio: '2026-09-21', fim: '2026-10-20' }, { enabled: true });
  });

  it('intervalo personalizado consulta só com as duas datas e sem previsão de pagamento', async () => {
    renderTela();
    const u = user();

    await u.selectOptions(screen.getByLabelText('Período'), 'personalizado');
    expect(useComissoes).toHaveBeenLastCalledWith({ inicio: undefined, fim: undefined }, { enabled: false });
    expect(screen.getByText('Escolha o intervalo')).toBeInTheDocument();

    await u.type(screen.getByLabelText('De'), '2026-11-01');
    await u.type(screen.getByLabelText('Até'), '2026-11-15');

    expect(useComissoes).toHaveBeenLastCalledWith({ inicio: '2026-11-01', fim: '2026-11-15' }, { enabled: true });
    expect(screen.queryByText(/Pagamento previsto/)).not.toBeInTheDocument();
  });
});
