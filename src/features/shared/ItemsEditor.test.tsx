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
import { useHoraTecnica } from '@/hooks/useHoraTecnica';
import { toast } from '@/store/toastStore';
import { ItemsEditor, type ItemFormValue } from './ItemsEditor';

vi.mock('@/hooks/useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('@/hooks/useProdutos', () => ({ useProdutos: vi.fn() }));
vi.mock('@/hooks/useDescontos', () => ({ useDescontosPorOrigem: vi.fn() }));
vi.mock('@/hooks/useHoraTecnica', () => ({ useHoraTecnica: vi.fn() }));
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
  content: [{ id: 1, nome: 'Troca de Óleo', preco: 120, duracaoMinutos: 90 }],
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

// Clica no botão de "Adicionar X" (que também muda pra aba certa), abre a
// busca inline, e escolhe a opção pelo texto — a busca some depois de escolher.
async function adicionarViaBusca(botaoLabel: RegExp, opcaoLabel: string) {
  await userEvent.click(screen.getByRole('button', { name: botaoLabel }));
  await userEvent.click(screen.getByRole('textbox'));
  const opcao = await screen.findByRole('button', { name: new RegExp(opcaoLabel) });
  await userEvent.click(opcao);
}

describe('ItemsEditor', () => {
  beforeEach(() => {
    useAuthStore.setState({
      permissoes: ['SERVICO_READ', 'ESTOQUE_READ', 'DESCONTO_APROVAR', 'ESTOQUE_RESERVAR'],
    });
    vi.mocked(useServicos).mockReturnValue({ data: servicos } as never);
    vi.mocked(useProdutos).mockReturnValue({ data: produtos } as never);
    vi.mocked(useDescontosPorOrigem).mockReturnValue({ data: { content: [] } } as never);
    // Sem hora técnica configurada por padrão — preço de catálogo, comportamento anterior.
    vi.mocked(useHoraTecnica).mockReturnValue({ data: undefined } as never);
  });

  it('starts on the Serviços tab, and picking from the search adds a compact line', async () => {
    render(<Harness />);
    expect(screen.getByText('Nenhum serviço adicionado ainda.')).toBeInTheDocument();

    await adicionarViaBusca(/Adicionar serviço/, 'Troca de Óleo');
    expect(screen.queryByText('Nenhum serviço adicionado ainda.')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('item-row-0')).getByText('Troca de Óleo')).toBeInTheDocument();
    // A busca fecha sozinha depois de escolher.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('adding a Produto switches to the Peças tab automatically', async () => {
    render(<Harness />);

    await adicionarViaBusca(/Adicionar peça\/produto/, 'Óleo Motor 10W30');

    expect(within(screen.getByTestId('item-row-0')).getByText('Óleo Motor 10W30')).toBeInTheDocument();
    // A aba de Serviços não é mais a ativa — seu vazio não deveria estar visível.
    expect(screen.queryByText('Nenhum serviço adicionado ainda.')).not.toBeInTheDocument();
  });

  it('switching tabs shows each type in isolation', async () => {
    render(
      <Harness
        defaultItens={[
          { tipoItem: 'SERVICO', descricao: 'Troca de Óleo', quantidade: 1, valorUnitario: 120 },
          { tipoItem: 'PRODUTO', produtoId: 1, descricao: 'Óleo Motor 10W30', quantidade: 1, valorUnitario: 32 },
        ]}
      />,
    );

    expect(screen.getByText('Troca de Óleo')).toBeInTheDocument();
    expect(screen.queryByText('Óleo Motor 10W30')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Peças/ }));

    expect(screen.getByText('Óleo Motor 10W30')).toBeInTheDocument();
    expect(screen.queryByText('Troca de Óleo')).not.toBeInTheDocument();
  });

  it('gates the catalogs behind SERVICO_READ/ESTOQUE_READ', () => {
    useAuthStore.setState({ permissoes: [] });
    render(<Harness />);

    expect(vi.mocked(useServicos).mock.calls[0][1]).toEqual({ enabled: false });
    expect(vi.mocked(useProdutos).mock.calls[0][1]).toEqual({ enabled: false });
  });

  it('picking a Serviço from the search fills descrição and valor unitário', async () => {
    render(<Harness />);
    await adicionarViaBusca(/Adicionar serviço/, 'Troca de Óleo');

    const row = screen.getByTestId('item-row-0');
    expect(within(row).getByText('Troca de Óleo')).toBeInTheDocument();
    expect(within(row).getByLabelText('Valor unitário')).toHaveValue(120);
  });

  it('shows the stock hint after picking a Produto from the search', async () => {
    render(<Harness />);
    await adicionarViaBusca(/Adicionar peça\/produto/, 'Óleo Motor 10W30');

    expect(screen.getByText('Estoque: 40')).toBeInTheDocument();
  });

  it('filters catalog options as the user types in the search', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /Adicionar peça\/produto/ }));
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.type(input, 'pneu');

    expect(screen.getByRole('button', { name: /Pneu Traseiro Aro 15/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Óleo Motor 10W30/ })).not.toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /Peças/ }));

    const qtdInput = screen.getByLabelText('Quantidade');
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
    await userEvent.click(screen.getByRole('button', { name: /Peças/ }));

    const qtdInput = screen.getByLabelText('Quantidade');
    await userEvent.clear(qtdInput);
    await userEvent.type(qtdInput, '20');

    expect(qtdInput).toHaveValue(20);
  });

  it('truncates a fractional quantity to a whole number', async () => {
    render(<Harness defaultItens={[{ tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]} />);
    const qtdInput = screen.getByLabelText('Quantidade');

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
    expect(screen.getByTestId('item-row-0')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remover item' }));

    expect(screen.queryByTestId('item-row-0')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhum serviço adicionado ainda.')).toBeInTheDocument();
  });

  it('disables valorUnitario for a profile without DESCONTO_APROVAR, offers "Solicitar desconto", and closes the modal', async () => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ'] });
    render(
      <Harness
        defaultItens={[{ id: 9, tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]}
        origem={{ tipo: 'ORCAMENTO', id: 1 }}
      />,
    );

    expect(screen.getByLabelText('Valor unitário')).toBeDisabled();
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
    await userEvent.click(screen.getByRole('button', { name: /Peças/ }));

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

  it('renders the tempo vendido controls, and the total, only when mostrarTempoVendido is set', async () => {
    render(
      <Harness
        defaultItens={[{ tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10, tempoVendidoMinutos: 30 }]}
        mostrarTempoVendido
      />,
    );

    expect(screen.getByDisplayValue('00:30')).toBeInTheDocument();
    // +1:00 SOMA ao que já estava lá (00:30), não substitui — 00:30 + 1:00 = 01:30.
    await userEvent.click(screen.getByRole('button', { name: '+1:00' }));
    expect(screen.getByDisplayValue('01:30')).toBeInTheDocument();
  });

  it('a Produto item never shows the tempo vendido controls, even with mostrarTempoVendido set', async () => {
    render(
      <Harness
        defaultItens={[
          { tipoItem: 'PRODUTO', produtoId: 1, descricao: 'Óleo Motor 10W30', quantidade: 1, valorUnitario: 32 },
        ]}
        mostrarTempoVendido
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Peças/ }));

    expect(screen.queryByLabelText('Tempo vendido')).not.toBeInTheDocument();
  });

  it('sums repeated preset clicks instead of overwriting the previous value', async () => {
    render(
      <Harness
        defaultItens={[{ tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]}
        mostrarTempoVendido
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '+0:30' }));
    await userEvent.click(screen.getByRole('button', { name: '+0:30' }));

    expect(screen.getByDisplayValue('01:00')).toBeInTheDocument();
  });

  it('parses a manually typed tempo vendido on blur', async () => {
    render(
      <Harness
        defaultItens={[{ tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]}
        mostrarTempoVendido
      />,
    );

    const tempoInput = screen.getByLabelText('Tempo vendido');
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

  it('disables every control when disabled is set', () => {
    render(
      <Harness
        defaultItens={[{ tipoItem: 'SERVICO', descricao: 'X', quantidade: 1, valorUnitario: 10 }]}
        disabled
      />,
    );

    expect(screen.getByRole('button', { name: /Adicionar serviço/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Adicionar peça\/produto/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remover item' })).toBeDisabled();
    expect(screen.getByLabelText('Quantidade')).toBeDisabled();
  });
});
