import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateVeiculo, useUpdateVeiculo } from '@/hooks/useVeiculos';
import { useClientes } from '@/hooks/useClientes';
import { useModelosVeiculo } from '@/hooks/useModelosVeiculo';
import { toast } from '@/store/toastStore';
import { VeiculoFormModal } from './VeiculoFormModal';

vi.mock('@/hooks/usePlacas', () => ({
  useCarteiraPlacas: () => ({ data: undefined }),
  useConsultarPlaca: () => ({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn() }),
  useConsultarChassi: () => ({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn() }),
}));
vi.mock('@/hooks/useVeiculos', () => ({
  useCreateVeiculo: vi.fn(),
  useUpdateVeiculo: vi.fn(),
}));
vi.mock('@/hooks/useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('@/hooks/useModelosVeiculo', () => ({
  useModelosVeiculo: vi.fn(() => ({ data: { content: [] } })),
  useCreateModeloVeiculo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const clientes = { content: [{ id: 1, nome: 'Carlos Eduardo' }] };

async function escolherCliente(nome: string) {
  await userEvent.click(screen.getByPlaceholderText('Buscar cliente pelo nome...'));
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(nome) }));
}

describe('VeiculoFormModal', () => {
  let createMutateAsync: ReturnType<typeof vi.fn>;
  let updateMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(useClientes).mockReturnValue({ data: clientes } as never);
    createMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    updateMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useCreateVeiculo).mockReturnValue({ mutateAsync: createMutateAsync, isPending: false } as never);
    vi.mocked(useUpdateVeiculo).mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false } as never);
  });

  it('renders empty for a new veículo, defaulting the cliente when given', () => {
    render(<VeiculoFormModal open onClose={vi.fn()} veiculo={null} defaultClienteId={1} />);
    expect(screen.getByText('Novo veículo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Carlos Eduardo')).toBeInTheDocument();
  });

  it('prefills the form when editing an existing veículo', () => {
    render(
      <VeiculoFormModal
        open
        onClose={vi.fn()}
        veiculo={{ id: 1, clienteId: 1, placa: 'MTG0001', modelo: 'Gol 1.6', cor: 'Preta', anoFabricacao: 2022, chassi: '123', categoria: 'B' } as never}
      />,
    );
    expect(screen.getByText('Editar veículo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MTG0001')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Categoria/ })).toHaveValue('B');
  });

  // Cadastro mínimo: cliente, placa, modelo e categoria (o que o backend exige + modelo). Cor, ano e chassi são
  // recomendados — avisam, mas não travam o balcão quando a consulta de placa falha.
  it('keeps Salvar disabled until cliente, placa, modelo and an explicitly chosen categoria; the rest is only recommended', async () => {
    render(<VeiculoFormModal open onClose={vi.fn()} veiculo={null} />);
    const salvar = screen.getByRole('button', { name: 'Salvar' });

    expect(salvar).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Para salvar, preencha: Cliente, Placa, Modelo, Categoria');
    // a categoria de um carro novo NÃO começa em "A": define o preço da hora técnica, então a escolha é explícita
    expect(screen.getByRole('combobox', { name: /Categoria/ })).toHaveValue('');
    expect(createMutateAsync).not.toHaveBeenCalled();

    await userEvent.click(screen.getByPlaceholderText('Buscar cliente pelo nome...'));
    await userEvent.click(await screen.findByRole('button', { name: /Carlos/ }));
    await userEvent.type(screen.getByLabelText(/^Placa/), 'MTG0009');
    await userEvent.type(screen.getByLabelText(/^Modelo/), 'Onix');
    expect(salvar).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Para salvar, preencha: Categoria');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Categoria/ }), 'B');
    await waitFor(() => expect(salvar).toBeEnabled());
    expect(screen.getByRole('status')).toHaveTextContent('Já dá para salvar. Recomendado completar depois: Ano de fabricação, Cor, Chassi');

    await userEvent.type(screen.getByLabelText(/^Cor/), 'Preta');
    await userEvent.type(screen.getByLabelText(/^Ano de fabricação/), '2022');
    await userEvent.type(screen.getByLabelText(/^Chassi/), '9BWZZZ377VT004251');
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(salvar).toBeEnabled();
  });

  it('saves with only the minimum fields (sem cor, ano nem chassi)', async () => {
    const onClose = vi.fn();
    render(<VeiculoFormModal open onClose={onClose} veiculo={null} />);

    await escolherCliente('Carlos Eduardo');
    await userEvent.type(screen.getByLabelText(/^Placa/), 'MTG0010');
    await userEvent.type(screen.getByLabelText(/^Modelo/), 'Gol');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Categoria/ }), 'C');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    const payload = createMutateAsync.mock.calls[0][0];
    expect(payload).toMatchObject({ clienteId: 1, placa: 'MTG0010', modelo: 'Gol', categoria: 'C' });
    expect(payload.anoFabricacao).toBeUndefined();
  });

  it('um ano de fabricação preenchido continua sendo validado', async () => {
    render(<VeiculoFormModal open onClose={vi.fn()} veiculo={null} />);
    await escolherCliente('Carlos Eduardo');
    await userEvent.type(screen.getByLabelText(/^Placa/), 'MTG0011');
    await userEvent.type(screen.getByLabelText(/^Modelo/), 'Gol');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Categoria/ }), 'A');
    await userEvent.type(screen.getByLabelText(/^Ano de fabricação/), '1800');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Ano inválido')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  // Bug real: ver/editar um veículo e depois clicar em "Novo veículo" abria o formulário preenchido com os dados
  // do anterior (o reset de um veículo novo era parcial e deixava os outros campos como estavam).
  it('"Novo veículo" depois de abrir um veículo existente vem em branco, sem os dados do anterior', async () => {
    const existente = {
      id: 1,
      clienteId: 1,
      placa: 'MTG0002',
      marca: 'Chevrolet',
      modelo: 'Onix',
      cor: 'Branco',
      anoFabricacao: 2022,
      anoModelo: 2022,
      kmAtual: 1250,
      chassi: '9BWZZZ377VT004251',
      categoria: 'B',
    } as never;
    const { rerender } = render(<VeiculoFormModal open onClose={vi.fn()} veiculo={existente} />);
    expect(screen.getByDisplayValue('MTG0002')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Onix')).toBeInTheDocument();

    rerender(<VeiculoFormModal open={false} onClose={vi.fn()} veiculo={undefined} />);
    rerender(<VeiculoFormModal open onClose={vi.fn()} veiculo={null} />);

    expect(screen.getByLabelText(/^Placa/)).toHaveValue('');
    expect(screen.getByLabelText(/^Modelo/)).toHaveValue('');
    expect(screen.getByLabelText(/^Cor/)).toHaveValue('');
    expect(screen.getByLabelText(/^Chassi/)).toHaveValue('');
    expect(screen.getByLabelText(/^Ano de fabricação/)).toHaveValue(null);
    expect(screen.getByLabelText(/^KM atual/)).toHaveValue(null);
    expect(screen.getByRole('combobox', { name: /Categoria/ })).toHaveValue('');
    expect(screen.queryByDisplayValue('Chevrolet')).not.toBeInTheDocument();
  });

  it('filters the cliente options as the user types a search term', async () => {
    render(<VeiculoFormModal open onClose={vi.fn()} veiculo={null} />);
    await userEvent.type(screen.getByPlaceholderText('Buscar cliente pelo nome...'), 'Carlos');

    expect(vi.mocked(useClientes).mock.calls.at(-1)?.[0]).toEqual({ size: 50, nome: 'Carlos' });
  });

  // Bug real: o modal nunca desmonta (só o prop `open` alterna), e a busca de
  // cliente é estado local separado do react-hook-form — reset() do form não
  // limpava esse campo. Fechar sem salvar e reabrir pra outro veículo deixava
  // o termo da busca anterior parado ali.
  it('clears the cliente search box on reopen, even after closing without saving', async () => {
    const { rerender } = render(<VeiculoFormModal open onClose={vi.fn()} veiculo={null} />);
    await userEvent.type(screen.getByPlaceholderText('Buscar cliente pelo nome...'), 'Carlos');
    expect(screen.getByPlaceholderText('Buscar cliente pelo nome...')).toHaveValue('Carlos');

    rerender(<VeiculoFormModal open={false} onClose={vi.fn()} veiculo={null} />);
    rerender(<VeiculoFormModal open onClose={vi.fn()} veiculo={null} />);

    expect(screen.getByPlaceholderText('Buscar cliente pelo nome...')).toHaveValue('');
  });

  it('creates a new veículo with the filled fields and the categoria chosen explicitly', async () => {
    const onClose = vi.fn();
    render(<VeiculoFormModal open onClose={onClose} veiculo={null} />);

    await escolherCliente('Carlos Eduardo');
    await userEvent.type(screen.getByLabelText('Placa', { exact: false }), 'MTG0002');
    await userEvent.type(screen.getByLabelText(/^Modelo/), 'Onix 1.0');
    await userEvent.type(screen.getByLabelText('Cor', { exact: false }), 'Vermelha');
    await userEvent.type(screen.getByLabelText('Ano de fabricação', { exact: false }), '2022');
    await userEvent.type(screen.getByLabelText('Chassi', { exact: false }), '9BWZZZ377VT004251');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Categoria/ }), 'A');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: 1, placa: 'MTG0002', modelo: 'Onix 1.0', categoria: 'A' }),
    );
    expect(toast.success).toHaveBeenCalledWith('Veículo cadastrado com sucesso.');
    expect(onClose).toHaveBeenCalled();
  });

  // A categoria do veículo é quem decide a hora técnica aplicada num
  // Orçamento/OS pra ele (não mais a categoria do serviço escolhido) — ver
  // doc de Precificação por Categoria, atualização 29/09.
  it('sends the chosen categoria when the user picks a different one', async () => {
    const onClose = vi.fn();
    render(<VeiculoFormModal open onClose={onClose} veiculo={null} />);

    await escolherCliente('Carlos Eduardo');
    await userEvent.type(screen.getByLabelText('Placa', { exact: false }), 'MTG0003');
    await userEvent.type(screen.getByLabelText(/^Modelo/), 'Hilux');
    await userEvent.type(screen.getByLabelText('Cor', { exact: false }), 'Prata');
    await userEvent.type(screen.getByLabelText('Ano de fabricação', { exact: false }), '2022');
    await userEvent.type(screen.getByLabelText('Chassi', { exact: false }), '9BWZZZ377VT004252');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Categoria/ }), 'C');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'C' }));
  });

  // Regressão: categoria decide preço real (hora técnica) — um veículo
  // cadastrado antes desta feature não tem categoria salva, e o <select>
  // não pode simplesmente assumir "A" nesse caso (ver ClienteFormModal.tsx e
  // VeiculoVinculadoRow.tsx pro mesmo cuidado na edição embutida no Cliente).
  it('blocks saving a legacy veículo with no categoria until one is explicitly chosen', async () => {
    render(
      <VeiculoFormModal
        open
        onClose={vi.fn()}
        veiculo={{ id: 1, clienteId: 1, placa: 'MTG0001', modelo: 'Gol 1.6', cor: 'Preta', anoFabricacao: 2022, chassi: '123' } as never}
      />,
    );
    expect(screen.getByRole('combobox', { name: /Categoria/ })).toHaveValue('');

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Para salvar, preencha: Categoria');
    expect(updateMutateAsync).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Categoria/ }), 'C');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ categoria: 'C' }) }),
    );
  });

  it('updates an existing veículo by id and toasts success', async () => {
    const onClose = vi.fn();
    render(
      <VeiculoFormModal
        open
        onClose={onClose}
        veiculo={{ id: 1, clienteId: 1, placa: 'MTG0001', modelo: 'Gol 1.6', cor: 'Preta', anoFabricacao: 2022, chassi: '123', categoria: 'A' } as never}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, payload: expect.objectContaining({ placa: 'MTG0001' }) }),
    );
    expect(toast.success).toHaveBeenCalledWith('Veículo atualizado com sucesso.');
    expect(onClose).toHaveBeenCalled();
  });

  it('toasts an error when saving fails', async () => {
    updateMutateAsync.mockRejectedValueOnce(new Error('placa duplicada'));
    const onClose = vi.fn();
    render(
      <VeiculoFormModal
        open
        onClose={onClose}
        veiculo={{ id: 1, clienteId: 1, placa: 'MTG0001', modelo: 'Gol 1.6', cor: 'Preta', anoFabricacao: 2022, chassi: '123', categoria: 'A' } as never}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('placa duplicada'));
    expect(onClose).not.toHaveBeenCalled();
  });
});


