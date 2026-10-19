import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCancelarContaPagar,
  useCancelarContaReceber,
  useCategoriasFinanceiras,
  usePagarConta,
  useReceberConta,
  useSituacaoFechamento,
  useTodasContasPagar,
  useTodasContasReceber,
} from '@/hooks/useFinanceiro';
import { toast } from '@/store/toastStore';
import { ContasTab } from './ContasTab';

vi.mock('@/hooks/useFinanceiro', () => ({
  useTodasContasPagar: vi.fn(),
  useTodasContasReceber: vi.fn(),
  usePagarConta: vi.fn(),
  useReceberConta: vi.fn(),
  useCancelarContaPagar: vi.fn(),
  useCancelarContaReceber: vi.fn(),
  useCategoriasFinanceiras: vi.fn(),
  useSituacaoFechamento: vi.fn(),
}));
vi.mock('./ContaFormModal', () => ({
  ContaFormModal: ({ open, conta }: { open: boolean; conta?: { descricao?: string } | null }) =>
    open ? <p>form-aberto:{conta?.descricao ?? 'nova'}</p> : null,
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const dia = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');

const pagar = [
  { id: 1, descricao: 'Aluguel', fornecedor: 'Imobiliária Sol', valor: 900, dataVencimento: dia(-4), status: 'PENDENTE', categoriaId: 3, categoriaNome: 'Despesas do imóvel' },
  { id: 2, descricao: 'Peças Veloz', fornecedor: 'Auto Peças Veloz', valor: 350, dataVencimento: dia(10), status: 'PENDENTE', parcelaNumero: 2, parcelaTotal: 6 },
  { id: 3, descricao: 'Energia', fornecedor: 'Enel', valor: 200, dataVencimento: dia(-20), status: 'PAGO' },
];
const receber = [
  { id: 10, descricao: 'Serviço OS #1', clienteNome: 'Carlos', ordemServicoId: 1, valor: 150, dataVencimento: dia(5), status: 'PENDENTE' },
  { id: 11, descricao: 'Venda avulsa', clienteNome: 'Rodrigo', valor: 80, dataVencimento: dia(7), status: 'PENDENTE' },
];

describe('ContasTab', () => {
  let pagarMutate: ReturnType<typeof vi.fn>;
  let cancelarMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(useSituacaoFechamento).mockReturnValue({ data: { dataMuro: undefined } } as never);
    pagarMutate = vi.fn().mockResolvedValue({});
    cancelarMutate = vi.fn().mockResolvedValue({});
    vi.mocked(useTodasContasPagar).mockReturnValue({ data: pagar, isLoading: false } as never);
    vi.mocked(useTodasContasReceber).mockReturnValue({ data: receber, isLoading: false } as never);
    vi.mocked(usePagarConta).mockReturnValue({ mutateAsync: pagarMutate, isPending: false } as never);
    vi.mocked(useReceberConta).mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false } as never);
    vi.mocked(useCancelarContaPagar).mockReturnValue({ mutateAsync: cancelarMutate, isPending: false } as never);
    vi.mocked(useCancelarContaReceber).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCategoriasFinanceiras).mockReturnValue({
      data: [
        { id: 3, nome: 'Despesas do imóvel', tipo: 'DESPESA', fixa: true, ativo: true },
        { id: 4, nome: 'Peças e insumos', tipo: 'DESPESA', fixa: false, ativo: true },
      ],
    } as never);
    vi.mocked(toast.success).mockClear();
  });

  it('shows every account with a count on each situation chip', () => {
    render(<ContasTab tipo="pagar" />);
    expect(screen.getByRole('button', { name: 'Todas (3)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vencidas (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A vencer (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pagas (1)' })).toBeInTheDocument();
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    expect(screen.getByText('Peças Veloz')).toBeInTheDocument();
  });

  it('narrows to the chosen situation and sums only what is listed', async () => {
    render(<ContasTab tipo="pagar" />);
    await userEvent.click(screen.getByRole('button', { name: /^Vencidas/ }));

    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    expect(screen.queryByText('Peças Veloz')).not.toBeInTheDocument();
    expect(screen.getByText(/1 conta ·/)).toHaveTextContent('R$ 900,00');
  });

  it('can start already filtered (coming from the overdue strip)', () => {
    render(<ContasTab tipo="pagar" situacaoInicial="vencida" />);
    expect(screen.getByRole('button', { name: /^Vencidas/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Peças Veloz')).not.toBeInTheDocument();
  });

  it('searches by description or counterpart', async () => {
    render(<ContasTab tipo="pagar" />);
    await userEvent.type(screen.getByPlaceholderText(/Buscar por descrição ou fornecedor/), 'enel');

    expect(screen.getByText('Energia')).toBeInTheDocument();
    expect(screen.queryByText('Aluguel')).not.toBeInTheDocument();
  });

  it('opens the payment form (date, method, amount) before paying, then pays with what was filled in', async () => {
    render(<ContasTab tipo="pagar" />);
    const linha = screen.getByText('Aluguel', { selector: 'p' }).closest('tr')!;
    await userEvent.click(within(linha).getByRole('button', { name: 'Pagar' }));

    expect(pagarMutate).not.toHaveBeenCalled();
    expect(screen.getByText('Registrar pagamento')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Valor pago/)).toHaveValue(900);

    await userEvent.selectOptions(screen.getByLabelText('Forma de pagamento'), 'PIX');
    await userEvent.clear(screen.getByLabelText(/^Valor pago/));
    await userEvent.type(screen.getByLabelText(/^Valor pago/), '930');
    expect(screen.getByText(/acima do valor da conta/)).toBeInTheDocument();

    const botoesPagar = screen.getAllByRole('button', { name: 'Pagar' });
    await userEvent.click(botoesPagar[botoesPagar.length - 1]);

    await waitFor(() => expect(pagarMutate).toHaveBeenCalled());
    expect(pagarMutate).toHaveBeenCalledWith({
      id: 1,
      baixa: { data: format(new Date(), 'yyyy-MM-dd'), formaPagamento: 'PIX', valorEfetivo: 930 },
    });
    expect(toast.success).toHaveBeenCalledWith('Conta marcada como paga.');
  });

  it('shows the category of each account, flags the unclassified ones and filters by category', async () => {
    render(<ContasTab tipo="pagar" />);
    const aluguel = screen.getByText('Aluguel', { selector: 'p' }).closest('tr')!;
    expect(within(aluguel).getByText('Despesas do imóvel')).toBeInTheDocument();
    const veloz = screen.getByText('parcela 2/6').closest('tr')!;
    expect(within(veloz).getByText('Sem categoria')).toBeInTheDocument();
    expect(within(veloz).getByText('parcela 2/6')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'sem');
    expect(screen.queryByText('Aluguel', { selector: 'p' })).not.toBeInTheDocument();
    expect(screen.getByText('parcela 2/6')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Categoria'), '3');
    expect(screen.getByText('Aluguel', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByText('parcela 2/6')).not.toBeInTheDocument();
  });

  it('offers actions only on open accounts, never on a settled one', () => {
    render(<ContasTab tipo="pagar" />);
    const quitada = screen.getByText('Energia').closest('tr')!;
    expect(within(quitada).queryByRole('button')).not.toBeInTheDocument();
  });

  it('locks edit and cancel for accounts due inside a closed period, but still lets them be paid', () => {
    vi.mocked(useSituacaoFechamento).mockReturnValue({ data: { dataMuro: dia(-2) } } as never);
    render(<ContasTab tipo="pagar" />);

    const fechada = screen.getByText('Aluguel').closest('tr')!; // vence há 4 dias, antes da data muro
    expect(within(fechada).getByLabelText('Período fechado')).toBeInTheDocument();
    expect(within(fechada).getByRole('button', { name: 'Pagar' })).toBeInTheDocument();
    expect(within(fechada).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(within(fechada).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();

    const aberta = screen.getByText('Peças Veloz').closest('tr')!;
    expect(within(aberta).getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(within(aberta).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('opens the edit form for an account, but not for one that came from an OS billing', async () => {
    render(<ContasTab tipo="receber" />);

    const deOs = screen.getByText('Serviço OS #1').closest('tr')!;
    expect(within(deOs).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();

    const avulsa = screen.getByText('Venda avulsa').closest('tr')!;
    await userEvent.click(within(avulsa).getByRole('button', { name: 'Editar' }));
    expect(screen.getByText('form-aberto:Venda avulsa')).toBeInTheDocument();
  });

  it('opens an empty form from the "Nova conta" button, with the right wording per type', async () => {
    render(<ContasTab tipo="receber" />);
    await userEvent.click(screen.getByRole('button', { name: /Nova conta a receber/ }));
    expect(screen.getByText('form-aberto:nova')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Recebidas/ })).toBeInTheDocument();
  });

  it('cancels after confirming', async () => {
    render(<ContasTab tipo="pagar" />);
    const linha = screen.getByText('Aluguel').closest('tr')!;
    await userEvent.click(within(linha).getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar conta' }));

    expect(cancelarMutate).toHaveBeenCalledWith(1);
  });
});

