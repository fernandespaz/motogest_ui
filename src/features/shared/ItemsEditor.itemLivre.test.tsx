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
import { ItemsEditor, itemParaPayload, type ItemFormValue } from './ItemsEditor';

vi.mock('@/hooks/useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('@/hooks/useProdutos', () => ({ useProdutos: vi.fn() }));
vi.mock('@/hooks/useDescontos', () => ({ useDescontosPorOrigem: vi.fn() }));
vi.mock('@/hooks/useHoraTecnica', () => ({ useCategoriasHoraTecnica: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('./SolicitarDescontoModal', () => ({ SolicitarDescontoModal: () => null }));
vi.mock('./ReservarEstoqueModal', () => ({ ReservarEstoqueModal: () => null }));

let valores: ItemFormValue[] = [];

function Harness() {
  const methods = useForm<{ itens: ItemFormValue[] }>({ defaultValues: { itens: [] } });
  valores = methods.watch('itens');
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <FormProvider {...methods}>
        <ItemsEditor name="itens" permitirItemLivre />
      </FormProvider>
    </QueryClientProvider>
  );
}

async function adicionarItemLivre() {
  await userEvent.click(screen.getByRole('button', { name: /Item livre/ }));
  await userEvent.click(screen.getByRole('button', { name: /Adicionar$/ }));
}

describe('ItemsEditor — item livre: valor + % = preço final', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ'] });
    vi.mocked(useServicos).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useProdutos).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useDescontosPorOrigem).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: undefined } as never);
  });

  it('o valor é digitado uma vez só: a linha não tem campo de preço nem repete o preço unitário', async () => {
    render(<Harness />);
    await adicionarItemLivre();

    expect(screen.queryByLabelText('Valor unitário')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Valor da peça')).toBeInTheDocument();
    expect(screen.queryByLabelText('Preço unitário ao cliente')).not.toBeInTheDocument();
    expect(screen.getByTestId('preco-ao-cliente')).toHaveTextContent('R$ 0,00');
  });

  it('valor 150 + 25% = R$ 187,50 ao cliente; o payload leva o preço final e o valor da peça, nunca o %', async () => {
    render(<Harness />);
    await adicionarItemLivre();

    await userEvent.type(screen.getByLabelText('Valor da peça'), '150');
    // sem % o preço é o próprio valor
    expect(screen.getByTestId('preco-ao-cliente')).toHaveTextContent('150,00');

    await userEvent.type(screen.getByLabelText('Acréscimo (%)'), '25');
    expect(screen.getByTestId('preco-ao-cliente')).toHaveTextContent('187,50');
    // na linha, só o total (qtd 1): o valor unitário não é repetido ali
    expect(screen.getAllByText('R$ 187,50').length).toBeGreaterThanOrEqual(1);

    const payload = itemParaPayload(valores[0]);
    expect(payload.valorUnitario).toBe(187.5);
    expect(payload.custoUnitario).toBe(150);
    expect(payload).not.toHaveProperty('acrescimoPercentual');
  });

  it('apagar o valor da peça zera o preço', async () => {
    render(<Harness />);
    await adicionarItemLivre();
    await userEvent.type(screen.getByLabelText('Valor da peça'), '80');
    await userEvent.clear(screen.getByLabelText('Valor da peça'));
    expect(screen.getByTestId('preco-ao-cliente')).toHaveTextContent('R$ 0,00');
  });

  it('a área de adicionar fica ACIMA da lista de itens incluídos', async () => {
    render(<Harness />);
    const adicionar = screen.getByRole('region', { name: 'Adicionar item' });
    const incluidos = screen.getByRole('region', { name: 'Itens incluídos' });
    expect(adicionar.compareDocumentPosition(incluidos) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Nenhum item incluído ainda/)).toBeInTheDocument();
  });

  it('serviço do catálogo: pesquisa, escolhe e só entra na lista ao clicar em Adicionar', async () => {
    vi.mocked(useServicos).mockReturnValue({ data: { content: [{ id: 1, nome: 'Troca de Óleo', precoMinSugerido: 120 }] } } as never);
    render(<Harness />);
    const botao = screen.getByRole('button', { name: /Adicionar$/ });
    expect(botao).toBeDisabled(); // nada escolhido ainda

    await userEvent.click(screen.getByPlaceholderText('Pesquisar serviço...'));
    await userEvent.click(await screen.findByRole('button', { name: /Troca de Óleo/ }));
    expect(screen.queryByTestId('item-row-0')).not.toBeInTheDocument(); // escolher não inclui
    expect(botao).toBeEnabled();

    await userEvent.click(botao);
    expect(screen.getByTestId('item-row-0')).toHaveTextContent('Troca de Óleo');
    expect(botao).toBeDisabled(); // pronto para a próxima busca
  });

  it('trocar o tipo muda a busca (peça) e o item livre não pede pesquisa', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /Peça \/ produto/ }));
    expect(screen.getByPlaceholderText('Pesquisar peça ou produto...')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Item livre/ }));
    expect(screen.queryByPlaceholderText(/Pesquisar/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adicionar$/ })).toBeEnabled();
  });

  it('item livre nasce como peça e pode virar serviço na própria linha: rótulo e tipo acompanham, sem tempo vendido', async () => {
    render(<Harness />);
    await adicionarItemLivre();
    expect(valores[0].tipoItem).toBe('PRODUTO');
    expect(screen.getByLabelText('Valor da peça')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Serviço' }));
    expect(valores[0].tipoItem).toBe('SERVICO');
    expect(screen.getByLabelText('Valor do serviço')).toBeInTheDocument();
    expect(screen.queryByLabelText('Tempo vendido')).not.toBeInTheDocument();
  });

  it('o bloco de preço abre no item novo e recolhe numa linha de resumo; a linha mostra o unitário só para leitura', async () => {
    render(<Harness />);
    await adicionarItemLivre();
    await userEvent.type(screen.getByLabelText('Valor da peça'), '100');
    await userEvent.type(screen.getByLabelText('Acréscimo (%)'), '20');
    expect(screen.getByTestId('item-unitario-0')).toHaveTextContent('R$ 120,00');

    const alternar = screen.getByRole('button', { name: /Como formar o preço/ });
    expect(alternar).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(alternar);
    expect(alternar).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Valor da peça')).not.toBeInTheDocument();
    expect(alternar).toHaveTextContent('Peça R$ 100,00 + 20% · lucro R$ 20,00');
    expect(valores[0].custoUnitario).toBe(100); // recolher não perde o que foi digitado
  });

  it('a lista tem cabeçalho de colunas (Qtd, Unitário, Total) só depois do primeiro item', async () => {
    render(<Harness />);
    expect(screen.queryByText('Unitário')).not.toBeInTheDocument();
    await adicionarItemLivre();
    expect(screen.getByText('Unitário')).toBeInTheDocument();
  });

  it('com itens na lista há botões de adicionar junto dela; "outro item livre" inclui mais uma linha', async () => {
    render(<Harness />);
    expect(screen.queryByRole('button', { name: /Adicionar outro item livre/ })).not.toBeInTheDocument();
    await adicionarItemLivre();

    await userEvent.click(screen.getByRole('button', { name: /Adicionar outro item livre/ }));
    expect(screen.getByTestId('item-row-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adicionar do catálogo/ })).toBeInTheDocument();
  });
});
