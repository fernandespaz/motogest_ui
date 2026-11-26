import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/test/queryClientWrapper';
import { useAuthStore } from '@/store/authStore';
import { useServicos } from '@/hooks/useServicos';
import { useProdutos } from '@/hooks/useProdutos';
import { useDescontosPorOrigem } from '@/hooks/useDescontos';
import { useCategoriasHoraTecnica } from '@/hooks/useHoraTecnica';
import { ItemsEditor, type ItemFormValue } from './ItemsEditor';
import { ResumoOrcamentoPanel } from '@/features/orcamentos/ResumoOrcamentoPanel';

vi.mock('@/hooks/useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('@/hooks/useProdutos', () => ({ useProdutos: vi.fn() }));
vi.mock('@/hooks/useDescontos', () => ({ useDescontosPorOrigem: vi.fn() }));
vi.mock('@/hooks/useHoraTecnica', () => ({ useCategoriasHoraTecnica: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('./SolicitarDescontoModal', () => ({ SolicitarDescontoModal: () => null }));
vi.mock('./ReservarEstoqueModal', () => ({ ReservarEstoqueModal: () => null }));

// Igual à OrcamentoFormPage: o pai lê os itens com watch() e alimenta o resumo fixo.
function Pagina({ porHT = true, categoria = 'B' }: { porHT?: boolean; categoria?: 'A' | 'B' | 'C' | null } = {}) {
  const methods = useForm<{ itens: ItemFormValue[] }>({
    defaultValues: {
      itens: [
        { tipoItem: 'SERVICO', servicoId: 1, descricao: 'Revisão', quantidade: 1, tempoVendidoMinutos: 60, valorUnitario: 100, precificadoPorHT: porHT },
      ],
    },
  });
  const itens = methods.watch('itens') ?? [];
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <FormProvider {...methods}>
        <ItemsEditor name="itens" mostrarTempoVendido permitirItemLivre categoriaVeiculo={categoria ?? undefined} ocultarResumo />
        <ResumoOrcamentoPanel itens={itens} pendencias={[]} mostrarSalvar={false} saving={false} rotuloSalvar="x" />
      </FormProvider>
    </QueryClientProvider>
  );
}

describe('resumo fixo acompanha o ItemsEditor', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ', 'DESCONTO_APROVAR'] });
    vi.mocked(useServicos).mockReturnValue({ data: { content: [{ id: 1, nome: 'Revisão' }] } } as never);
    vi.mocked(useProdutos).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useDescontosPorOrigem).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({
      data: [{ categoria: 'B', valorHora: 100, arredondamentoComercial: 5 }],
    } as never);
  });

  it('mudar o tempo vendido de um serviço por hora técnica atualiza o total do resumo', async () => {
    render(<Pagina />);
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 100,00');

    await userEvent.click(screen.getByRole('button', { name: '+1:00' }));
    expect(screen.getByTestId('item-row-0')).toHaveTextContent('R$ 200,00');
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 200,00');
  });

  it('serviço de preço fixo: o tempo não muda o valor, a linha explica e oferece cobrar pela hora técnica', async () => {
    render(<Pagina porHT={false} />);
    await userEvent.click(screen.getByRole('button', { name: '+0:30' }));
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 100,00'); // preço fixo não se mexe
    expect(screen.getByTestId('item-preco-fixo-0')).toHaveTextContent('O tempo não altera este valor');

    await userEvent.click(screen.getByRole('button', { name: /Cobrar pela hora técnica/ }));
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 150,00'); // 1:30 × R$ 100/h
    expect(screen.queryByTestId('item-preco-fixo-0')).not.toBeInTheDocument();
  });

  it('quem não aprova desconto vê a explicação, mas não o botão de trocar o preço pela hora técnica', () => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ'].filter((p) => p !== 'DESCONTO_APROVAR') });
    render(<Pagina porHT={false} />);
    expect(screen.getByTestId('item-preco-fixo-0')).toHaveTextContent('O tempo não altera este valor');
    expect(screen.queryByRole('button', { name: /Cobrar pela hora técnica/ })).not.toBeInTheDocument();
  });

  it('sem veículo (categoria desconhecida) a linha diz que é preciso escolher o veículo', () => {
    render(<Pagina porHT={false} categoria={null} />);
    expect(screen.getByTestId('item-preco-fixo-0')).toHaveTextContent('escolha o veículo');
  });

  it('digitar o tempo atualiza o total do resumo na hora, sem precisar sair do campo', async () => {
    render(<Pagina />);
    const campo = screen.getByLabelText('Tempo vendido');
    await userEvent.clear(campo);
    await userEvent.type(campo, '0300');
    // ainda com o foco no campo
    expect(campo).toHaveFocus();
    expect(campo).toHaveValue('03:00');
    expect(screen.getByTestId('item-row-0')).toHaveTextContent('R$ 300,00');
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 300,00');
    await userEvent.tab();
    expect(screen.getByTestId('item-row-0')).toHaveTextContent('R$ 300,00');
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 300,00');
  });

  it('serviço do catálogo recém-adicionado: mudar o tempo atualiza o total do resumo', async () => {
    render(<Pagina />);
    await userEvent.click(screen.getByRole('button', { name: 'Serviço' }));
    await userEvent.click(screen.getByPlaceholderText('Pesquisar serviço...'));
    await userEvent.click(await screen.findByRole('button', { name: /Revisão/ }));
    await userEvent.click(screen.getByRole('button', { name: /Adicionar$/ }));
    const botoes = screen.getAllByRole('button', { name: '+1:00' });
    await userEvent.click(botoes[botoes.length - 1]);
    // 100 do item original + 100 (1h × R$ 100/h) do novo; o tempo total do resumo soma as duas horas.
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 200,00');
    expect(screen.getByText('Tempo total').nextElementSibling).toHaveTextContent('02:00');
  });
});

// Veículo escolhido DEPOIS do serviço: o botão simula a escolha (a categoria do veículo passa a existir).
function PaginaVeiculoDepois({ valor, id }: { valor: number; id?: number }) {
  const [categoria, setCategoria] = useState<'B' | undefined>(undefined);
  const methods = useForm<{ itens: ItemFormValue[] }>({
    defaultValues: {
      itens: [
        { id, tipoItem: 'SERVICO', servicoId: 1, descricao: 'Revisão', quantidade: 1, tempoVendidoMinutos: 90, valorUnitario: valor, precificadoPorHT: false },
      ],
    },
  });
  const itens = methods.watch('itens') ?? [];
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <FormProvider {...methods}>
        <button type="button" onClick={() => setCategoria('B')}>escolher veículo</button>
        <ItemsEditor name="itens" mostrarTempoVendido permitirItemLivre categoriaVeiculo={categoria} ocultarResumo />
        <ResumoOrcamentoPanel itens={itens} pendencias={[]} mostrarSalvar={false} saving={false} rotuloSalvar="x" />
      </FormProvider>
    </QueryClientProvider>
  );
}

describe('reprecificação ao escolher o veículo depois do serviço', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ'] });
    vi.mocked(useServicos).mockReturnValue({ data: { content: [{ id: 1, nome: 'Revisão', precoMinSugerido: 100 }] } } as never);
    vi.mocked(useProdutos).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useDescontosPorOrigem).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({
      data: [{ categoria: 'B', valorHora: 100, arredondamentoComercial: 5 }],
    } as never);
  });

  it('serviço ainda com o preço sugerido passa a cobrar pela hora técnica (1:30 × R$ 100/h)', async () => {
    render(<PaginaVeiculoDepois valor={100} />);
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 100,00');
    await userEvent.click(screen.getByRole('button', { name: 'escolher veículo' }));
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 150,00');
    expect(screen.getByTestId('item-origem-0')).toHaveTextContent('Hora técnica');
  });

  it('preço digitado pelo consultor (diferente do sugerido) nunca é sobrescrito', async () => {
    render(<PaginaVeiculoDepois valor={80} />);
    await userEvent.click(screen.getByRole('button', { name: 'escolher veículo' }));
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 80,00');
  });

  it('item já salvo (com id) nunca é reprecificado ao carregar o veículo', async () => {
    render(<PaginaVeiculoDepois valor={100} id={7} />);
    await userEvent.click(screen.getByRole('button', { name: 'escolher veículo' }));
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 100,00');
  });
});
