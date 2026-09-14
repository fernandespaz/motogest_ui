import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestQueryClient } from '@/test/queryClientWrapper';
import { useAuthStore } from '@/store/authStore';
import { useServicos } from '@/hooks/useServicos';
import { useProdutos } from '@/hooks/useProdutos';
import { useDescontosPorOrigem } from '@/hooks/useDescontos';
import { toast } from '@/store/toastStore';
import { ItemsEditor, type ItemFormValue } from './ItemsEditor';

vi.mock('@/hooks/useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('@/hooks/useProdutos', () => ({ useProdutos: vi.fn() }));
vi.mock('@/hooks/useDescontos', () => ({ useDescontosPorOrigem: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('./SolicitarDescontoModal', () => ({
  SolicitarDescontoModal: (props: { itemDescricao: string; onClose: () => void }) => (
    <div>
      SolicitarDescontoModal:{props.itemDescricao}
      <button onClick={props.onClose}>Fechar desconto</button>
    </div>
  ),
}));
vi.mock('./ReservarEstoqueModal', () => ({
  ReservarEstoqueModal: (props: { produtoNome: string; onClose: () => void }) => (
    <div>
      ReservarEstoqueModal:{props.produtoNome}
      <button onClick={props.onClose}>Fechar reserva</button>
    </div>
  ),
}));

const servicos = {
  content: [{ id: 1, nome: 'Troca de Óleo', preco: 120 }],
};
const produtos = {
  content: [
    { id: 1, nome: 'Óleo Motor 10W30', precoVenda: 32, quantidadeDisponivel: 40 },
    { id: 2, nome: 'Pneu Traseiro Aro 15', precoVenda: 450, quantidadeDisponivel: 8 },
  ],
};

function Harness({
  defaultItens = [],
  ...props
}: Partial<React.ComponentProps<typeof ItemsEditor>> & { defaultItens?: ItemFormValue[] }) {
  const methods = useForm<{ itens: ItemFormValue[] }>({ defaultValues: { itens: defaultItens } });
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <FormProvider {...methods}>
        <ItemsEditor name="itens" {...props} />
      </FormProvider>
    </QueryClientProvider>
  );
}

describe('ItemsEditor', () => {
  beforeEach(() => {
    useAuthStore.setState({
      permissoes: ['SERVICO_READ', 'ESTOQUE_READ', 'DESCONTO_APROVAR', 'ESTOQUE_RESERVAR'],
    });
    vi.mocked(useServicos).mockReturnValue({ data: servicos } as never);
    vi.mocked(useProdutos).mockReturnValue({ data: produtos } as never);
    vi.mocked(useDescontosPorOrigem).mockReturnValue({ data: { content: [] } } as never);
  });

  it('shows the empty state and adds a default Serviço row on "Adicionar item"', async () => {
    render(<Harness />);
    expect(screen.getByText('Nenhum item adicionado ainda.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Adicionar item/ }));

    expect(screen.queryByText('Nenhum item adicionado ainda.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('SERVICO');
  });

  it('gates the catalogs behind SERVICO_READ/ESTOQUE_READ', () => {
    useAuthStore.setState({ permissoes: [] });
    render(<Harness />);

    expect(vi.mocked(useServicos).mock.calls[0][1]).toEqual({ enabled: false });
    expect(vi.mocked(useProdutos).mock.calls[0][1]).toEqual({ enabled: false });
  });

  it('filling a Serviço select auto-fills descrição and valor unitário', async () => {
    render(<Harness defaultItens={[{ tipoItem: 'SERVICO', descricao: '', quantidade: 1, valorUnitario: 0 }]} />);

    const row = screen.getAllByRole('row')[1];
    const servicoSelect = within(row).getAllByRole('combobox')[1];
    await userEvent.selectOptions(servicoSelect, 'Troca de Óleo');

    expect(within(row).getByDisplayValue('120')).toBeInTheDocument();
  });

  it('shows the stock hint after picking a Produto', async () => {
    render(<Harness defaultItens={[{ tipoItem: 'PRODUTO', descricao: '', quantidade: 1, valorUnitario: 0 }]} />);

    const row = screen.getAllByRole('row')[1];
    const produtoSelect = within(row).getAllByRole('combobox')[1];
    await userEvent.selectOptions(produtoSelect, 'Óleo Motor 10W30 (40 disp.)');

    expect(screen.getByText('Estoque disponível: 40')).toBeInTheDocument();
  });

  it('clamps quantity to available stock only when limitarQuantidadeAoEstoque is set', async () => {
    render(
      <Harness
        defaultItens={[
          { tipoItem: 'PRODUTO', produtoId: 2, descricao: 'Pneu Traseiro Aro 15', quantidade: 1, valorUnitario: 450 },
        ]}
        limitarQuantidadeAoEstoque
      />,
    );

    const qtdInput = screen.getByDisplayValue('1');
    await userEvent.clear(qtdInput);
    await userEvent.type(qtdInput, '20');

    expect(qtdInput).toHaveValue(8);
  });

  it('does not clamp quantity by default (Orçamento use case)', async () => {
    render(
      <Harness
        defaultItens={[
          { tipoItem: 'PRODUTO', produtoId: 2, descricao: 'Pneu Traseiro Aro 15', quantidade: 1, valorUnitario: 450 },
        ]}
      />,
    );

    const qtdInput = screen.getByDisplayValue('1');
    await userEvent.clear(qtdInput);
    await userEvent.type(qtdInput, '20');

    expect(qtdInput).toHaveValue(20);
  });

  it('truncates a fractional quantity to a whole number', async () => {
    render(<Harness defaultItens={[{ tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]} />);
    const qtdInput = screen.getByDisplayValue('1');

    await userEvent.clear(qtdInput);
    await userEvent.type(qtdInput, '1.5');

    expect(qtdInput).toHaveValue(1);
  });

  it('computes the subtotal and total from quantidade × valorUnitario', () => {
    render(
      <Harness
        defaultItens={[
          { tipoItem: 'SERVICO', descricao: 'A', quantidade: 2, valorUnitario: 50 },
          { tipoItem: 'SERVICO', descricao: 'B', quantidade: 1, valorUnitario: 30 },
        ]}
      />,
    );

    expect(screen.getByText('R$ 130,00')).toBeInTheDocument(); // total: 2*50 + 1*30
  });

  it('removes a row when its trash button is clicked', async () => {
    render(<Harness defaultItens={[{ tipoItem: 'SERVICO', descricao: 'Único item', quantidade: 1, valorUnitario: 10 }]} />);
    expect(screen.getAllByRole('row')).toHaveLength(3); // thead + 1 item + tfoot

    await userEvent.click(screen.getByRole('button', { name: 'Remover item' }));

    expect(screen.getByText('Nenhum item adicionado ainda.')).toBeInTheDocument();
  });

  it('disables valorUnitario for a profile without DESCONTO_APROVAR, offers "Solicitar desconto", and closes the modal', async () => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ'] });
    render(
      <Harness
        defaultItens={[{ id: 9, tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]}
        origem={{ tipo: 'ORCAMENTO', id: 1 }}
      />,
    );

    expect(screen.getByDisplayValue('10')).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Solicitar desconto/ }));
    expect(screen.getByText('SolicitarDescontoModal:X')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Fechar desconto' }));
    expect(screen.queryByText('SolicitarDescontoModal:X')).not.toBeInTheDocument();
  });

  it('shows a pending-discount badge instead of the request button when one is already pending', () => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ'] });
    vi.mocked(useDescontosPorOrigem).mockReturnValue({
      data: { content: [{ id: 1, itemId: 9, status: 'PENDENTE' }] },
    } as never);

    render(
      <Harness
        defaultItens={[{ id: 9, tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]}
        origem={{ tipo: 'ORCAMENTO', id: 1 }}
      />,
    );

    expect(screen.getByText('Desconto pendente')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Solicitar desconto/ })).not.toBeInTheDocument();
  });

  it('offers "Reservar" for a Produto with stock when the session can reserve, and closes the modal', async () => {
    render(
      <Harness
        defaultItens={[
          { id: 9, tipoItem: 'PRODUTO', produtoId: 1, descricao: 'Óleo Motor 10W30', quantidade: 1, valorUnitario: 32 },
        ]}
        origem={{ tipo: 'ORDEM_SERVICO', id: 1 }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Reservar/ }));
    expect(screen.getByText('ReservarEstoqueModal:Óleo Motor 10W30')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Fechar reserva' }));
    expect(screen.queryByText('ReservarEstoqueModal:Óleo Motor 10W30')).not.toBeInTheDocument();
  });

  it('blocks acting on an item without a saved id, telling the user to save first', async () => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ'] });
    render(
      <Harness
        defaultItens={[{ tipoItem: 'SERVICO', descricao: 'Item novo', quantidade: 1, valorUnitario: 10 }]}
        origem={{ tipo: 'ORCAMENTO', id: 1 }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Solicitar desconto/ }));

    expect(toast.error).toHaveBeenCalledWith('Salve as alterações antes de agir neste item.');
    expect(screen.queryByText(/SolicitarDescontoModal/)).not.toBeInTheDocument();
  });

  it('auto-saves a draft via onGarantirOrigem, then opens the modal once the parent re-renders with an origem', async () => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ'] });
    const onGarantirOrigem = vi.fn().mockResolvedValue({ tipo: 'ORCAMENTO' as const, id: 5 });

    function HarnessComOrigemDinamica() {
      const [origem, setOrigem] = useState<{ tipo: 'ORCAMENTO' | 'ORDEM_SERVICO'; id: number } | undefined>();
      const methods = useForm<{ itens: ItemFormValue[] }>({
        defaultValues: { itens: [{ tipoItem: 'SERVICO', descricao: 'Item novo', quantidade: 1, valorUnitario: 10 }] },
      });
      return (
        <QueryClientProvider client={createTestQueryClient()}>
          <FormProvider {...methods}>
            <ItemsEditor
              name="itens"
              origem={origem}
              onGarantirOrigem={async () => {
                const resolved = await onGarantirOrigem();
                if (resolved) setOrigem(resolved);
                return resolved;
              }}
            />
          </FormProvider>
        </QueryClientProvider>
      );
    }

    render(<HarnessComOrigemDinamica />);

    await userEvent.click(screen.getByRole('button', { name: /Solicitar desconto/ }));

    expect(onGarantirOrigem).toHaveBeenCalled();
    expect(await screen.findByText('SolicitarDescontoModal:Item novo')).toBeInTheDocument();
  });

  it('renders the tempo vendido column, its presets, and total only when mostrarTempoVendido is set', async () => {
    render(
      <Harness
        defaultItens={[{ tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10, tempoVendidoMinutos: 30 }]}
        mostrarTempoVendido
      />,
    );

    expect(screen.getByDisplayValue('00:30')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '1:00' }));
    expect(screen.getByDisplayValue('01:00')).toBeInTheDocument();
  });

  it('parses a manually typed tempo vendido on blur', async () => {
    render(
      <Harness
        defaultItens={[{ tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]}
        mostrarTempoVendido
      />,
    );

    const tempoInput = screen.getByPlaceholderText('00:00');
    await userEvent.type(tempoInput, '130');
    await userEvent.tab();

    expect(tempoInput).toHaveValue('01:30');
  });

  it('picks the most recent pending desconto when an item has more than one request on record', () => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ'] });
    vi.mocked(useDescontosPorOrigem).mockReturnValue({
      data: {
        content: [
          { id: 1, itemId: 9, status: 'REJEITADO' },
          { id: 2, itemId: 9, status: 'PENDENTE' },
        ],
      },
    } as never);

    render(
      <Harness
        defaultItens={[{ id: 9, tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]}
        origem={{ tipo: 'ORCAMENTO', id: 1 }}
      />,
    );

    expect(screen.getByText('Desconto pendente')).toBeInTheDocument();
  });

  it('clamps the already-typed quantidade down when switching to a lower-stock produto', async () => {
    render(
      <Harness
        defaultItens={[
          { tipoItem: 'PRODUTO', produtoId: 1, descricao: 'Óleo Motor 10W30', quantidade: 20, valorUnitario: 32 },
        ]}
        limitarQuantidadeAoEstoque
      />,
    );

    const row = screen.getAllByRole('row')[1];
    const produtoSelect = within(row).getAllByRole('combobox')[1];
    await userEvent.selectOptions(produtoSelect, 'Pneu Traseiro Aro 15 (8 disp.)');

    expect(within(row).getByDisplayValue('8')).toBeInTheDocument();
  });

  it('disables every control when disabled is set', () => {
    render(
      <Harness
        defaultItens={[{ tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]}
        disabled
      />,
    );

    expect(screen.getByRole('button', { name: /Adicionar item/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remover item' })).toBeDisabled();
  });
});
