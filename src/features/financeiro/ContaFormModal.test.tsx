import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCategoriasFinanceiras,
  useCreateContaPagar,
  useCreateContaReceber,
  useCriarContasPagarEmLote,
  useCriarContasReceberEmLote,
  useUpdateContaPagar,
  useUpdateContaReceber,
} from '@/hooks/useFinanceiro';
import { useClientes } from '@/hooks/useClientes';
import { toast } from '@/store/toastStore';
import { ContaFormModal } from './ContaFormModal';

vi.mock('@/hooks/useFinanceiro', () => ({
  useCategoriasFinanceiras: vi.fn(),
  useCreateContaPagar: vi.fn(),
  useCreateContaReceber: vi.fn(),
  useCriarContasPagarEmLote: vi.fn(),
  useCriarContasReceberEmLote: vi.fn(),
  useUpdateContaPagar: vi.fn(),
  useUpdateContaReceber: vi.fn(),
}));
vi.mock('@/hooks/useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const categoriasDespesa = [
  { id: 1, nome: 'Aluguel', tipo: 'DESPESA', fixa: true, ativo: true },
  { id: 2, nome: 'Peças e insumos', tipo: 'DESPESA', fixa: false, ativo: true },
];
const categoriasReceita = [{ id: 10, nome: 'Venda de peças', tipo: 'RECEITA', fixa: false, ativo: true }];

describe('ContaFormModal', () => {
  let criarPagar: ReturnType<typeof vi.fn>;
  let criarReceber: ReturnType<typeof vi.fn>;
  let lotePagar: ReturnType<typeof vi.fn>;
  let loteReceber: ReturnType<typeof vi.fn>;
  let atualizarPagar: ReturnType<typeof vi.fn>;
  let atualizarReceber: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    criarPagar = vi.fn().mockResolvedValue({});
    criarReceber = vi.fn().mockResolvedValue({});
    lotePagar = vi.fn().mockResolvedValue([{}, {}, {}]);
    loteReceber = vi.fn().mockResolvedValue([{}, {}]);
    atualizarPagar = vi.fn().mockResolvedValue({});
    atualizarReceber = vi.fn().mockResolvedValue({});
    const mutacao = (fn: ReturnType<typeof vi.fn>) => ({ mutateAsync: fn, isPending: false }) as never;
    vi.mocked(useCreateContaPagar).mockReturnValue(mutacao(criarPagar));
    vi.mocked(useCreateContaReceber).mockReturnValue(mutacao(criarReceber));
    vi.mocked(useCriarContasPagarEmLote).mockReturnValue(mutacao(lotePagar));
    vi.mocked(useCriarContasReceberEmLote).mockReturnValue(mutacao(loteReceber));
    vi.mocked(useUpdateContaPagar).mockReturnValue(mutacao(atualizarPagar));
    vi.mocked(useUpdateContaReceber).mockReturnValue(mutacao(atualizarReceber));
    vi.mocked(useCategoriasFinanceiras).mockImplementation(
      ((params?: { tipo?: string }) => ({ data: params?.tipo === 'RECEITA' ? categoriasReceita : categoriasDespesa })) as never,
    );
    vi.mocked(useClientes).mockReturnValue({ data: { content: [{ id: 5, nome: 'Carlos Eduardo' }] } } as never);
    vi.mocked(toast.success).mockClear();
  });

  async function preencherContaPagar(descricao = 'Aluguel de novembro') {
    await userEvent.type(screen.getByLabelText(/^Descrição/), descricao);
    await userEvent.selectOptions(screen.getByLabelText(/^Categoria/), '1');
    await userEvent.type(screen.getByLabelText(/^Valor/), '900');
    await userEvent.type(screen.getByLabelText(/^(Primeiro )?[Vv]encimento/), '2026-11-05');
  }

  it('requires description, category, a positive value and a due date', async () => {
    render(<ContaFormModal tipo="pagar" open onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe a descrição')).toBeInTheDocument();
    expect(screen.getByText('Selecione a categoria', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Informe um valor válido')).toBeInTheDocument();
    expect(screen.getByText('Informe o vencimento')).toBeInTheDocument();
    expect(criarPagar).not.toHaveBeenCalled();
  });

  it('groups the expense categories into fixed and variable ones', () => {
    render(<ContaFormModal tipo="pagar" open onClose={vi.fn()} />);
    const select = screen.getByLabelText(/^Categoria/);
    expect(select.querySelector('optgroup[label="Despesas fixas"]')).toHaveTextContent('Aluguel');
    expect(select.querySelector('optgroup[label="Despesas variáveis"]')).toHaveTextContent('Peças e insumos');
  });

  it('creates a single account to pay with category, document and notes', async () => {
    const onClose = vi.fn();
    render(<ContaFormModal tipo="pagar" open onClose={onClose} />);

    await preencherContaPagar();
    await userEvent.type(screen.getByLabelText(/^Fornecedor/), 'Imobiliária Sol');
    await userEvent.type(screen.getByLabelText(/^Nº do documento/), 'NF-12');
    await userEvent.type(screen.getByLabelText(/^Observações/), 'Contrato anual');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(criarPagar).toHaveBeenCalled());
    expect(criarPagar).toHaveBeenCalledWith({
      descricao: 'Aluguel de novembro',
      categoriaId: 1,
      fornecedor: 'Imobiliária Sol',
      valor: 900,
      dataVencimento: '2026-11-05',
      documento: 'NF-12',
      observacao: 'Contrato anual',
    });
    expect(lotePagar).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Conta a pagar cadastrada.');
    expect(onClose).toHaveBeenCalled();
  });

  it('previews and creates a monthly repetition as a batch', async () => {
    render(<ContaFormModal tipo="pagar" open onClose={vi.fn()} />);
    await preencherContaPagar('Internet');

    await userEvent.click(screen.getByRole('radio', { name: 'Repetir todo mês' }));
    expect(screen.getByLabelText('Por quantos meses?')).toHaveValue(3);
    expect(screen.getByText('3 contas').closest('p')).toHaveTextContent('R$ 900,00');
    expect(screen.getByRole('button', { name: 'Cadastrar 3 contas' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar 3 contas' }));

    await waitFor(() => expect(lotePagar).toHaveBeenCalled());
    expect(lotePagar).toHaveBeenCalledWith({
      conta: expect.objectContaining({ descricao: 'Internet', categoriaId: 1, valor: 900, dataVencimento: '2026-11-05' }),
      repeticao: { tipo: 'MENSAL', quantidade: 3 },
    });
    expect(criarPagar).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('3 contas a pagar cadastradas.');
  });

  it('treats the value as the total when splitting into installments, and shows the installment amounts', async () => {
    render(<ContaFormModal tipo="pagar" open onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^Descrição/), 'Compressor');
    await userEvent.selectOptions(screen.getByLabelText(/^Categoria/), '2');
    await userEvent.type(screen.getByLabelText(/^Valor/), '100');
    await userEvent.type(screen.getByLabelText(/^(Primeiro )?[Vv]encimento/), '2026-11-05');

    await userEvent.click(screen.getByRole('radio', { name: 'Parcelar' }));

    expect(screen.getByLabelText(/^Valor total/)).toBeInTheDocument();
    const previa = screen.getByText('3 parcelas').closest('p');
    expect(previa).toHaveTextContent('R$ 33,33');
    expect(previa).toHaveTextContent('a última de R$ 33,34');

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar 3 contas' }));
    await waitFor(() =>
      expect(lotePagar).toHaveBeenCalledWith(expect.objectContaining({ repeticao: { tipo: 'PARCELADO', quantidade: 3 } })),
    );
  });

  it('creates an account to receive with an income category and a client picked from the search', async () => {
    render(<ContaFormModal tipo="receber" open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/^Descrição/), 'Venda avulsa');
    await userEvent.selectOptions(screen.getByLabelText(/^Categoria/), '10');
    await userEvent.click(screen.getByPlaceholderText('Buscar cliente pelo nome...'));
    await userEvent.click(await screen.findByRole('button', { name: /Carlos Eduardo/ }));
    await userEvent.type(screen.getByLabelText(/^Valor/), '120.5');
    await userEvent.type(screen.getByLabelText(/^Vencimento/), '2026-11-10');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(criarReceber).toHaveBeenCalled());
    expect(criarReceber).toHaveBeenCalledWith(
      expect.objectContaining({ descricao: 'Venda avulsa', categoriaId: 10, clienteId: 5, valor: 120.5 }),
    );
  });

  it('prefills and updates an existing account by id, without offering repetition', async () => {
    render(
      <ContaFormModal
        tipo="pagar"
        open
        onClose={vi.fn()}
        conta={{ id: 7, descricao: 'Energia', fornecedor: 'Enel', valor: 200, dataVencimento: '2026-11-01', categoriaId: 2, parcelaNumero: 2, parcelaTotal: 6 }}
      />,
    );
    expect(screen.getByText('Editar conta a pagar · parcela 2/6')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Descrição/)).toHaveValue('Energia');
    expect(screen.getByLabelText(/^Categoria/)).toHaveValue('2');
    expect(screen.queryByRole('radio', { name: 'Parcelar' })).not.toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/^Valor/));
    await userEvent.type(screen.getByLabelText(/^Valor/), '250');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(atualizarPagar).toHaveBeenCalled());
    expect(atualizarPagar).toHaveBeenCalledWith({
      id: 7,
      payload: expect.objectContaining({ descricao: 'Energia', fornecedor: 'Enel', valor: 250, categoriaId: 2 }),
    });
    expect(toast.success).toHaveBeenCalledWith('Conta atualizada.');
  });

  it('forces an old, unclassified account to be given a category before saving', async () => {
    render(
      <ContaFormModal tipo="pagar" open onClose={vi.fn()} conta={{ id: 8, descricao: 'Antiga', valor: 50, dataVencimento: '2026-11-01' }} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Selecione a categoria', { selector: 'p' })).toBeInTheDocument();
    expect(atualizarPagar).not.toHaveBeenCalled();
  });

  it('keeps the account’s current category in the list even after it was deactivated', () => {
    render(
      <ContaFormModal
        tipo="pagar"
        open
        onClose={vi.fn()}
        conta={{ id: 9, descricao: 'X', valor: 50, dataVencimento: '2026-11-01', categoriaId: 99, categoriaNome: 'Antiga categoria' }}
      />,
    );
    expect(screen.getByRole('option', { name: 'Antiga categoria (inativa)' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Categoria/)).toHaveValue('99');
  });

  it('keeps the OS link when editing an account to receive', async () => {
    render(
      <ContaFormModal
        tipo="receber"
        open
        onClose={vi.fn()}
        conta={{ id: 9, descricao: 'OS #1', clienteId: 5, ordemServicoId: 33, valor: 150, dataVencimento: '2026-11-01', categoriaId: 10 }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(atualizarReceber).toHaveBeenCalled());
    expect(atualizarReceber).toHaveBeenCalledWith({
      id: 9,
      payload: expect.objectContaining({ ordemServicoId: 33, clienteId: 5, categoriaId: 10 }),
    });
  });

  it('toasts an error when saving fails and keeps the modal open', async () => {
    criarPagar.mockRejectedValueOnce(new Error('valor inválido'));
    const onClose = vi.fn();
    render(<ContaFormModal tipo="pagar" open onClose={onClose} />);

    await preencherContaPagar('X');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('valor inválido'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
