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
import { ItemsEditor, emBlocosDe30, itemParaPayload, type ItemFormValue } from './ItemsEditor';

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
        <ItemsEditor name="itens" mostrarTempoVendido permitirItemLivre />
      </FormProvider>
    </QueryClientProvider>
  );
}

async function adicionarRevisao() {
  await userEvent.click(screen.getByPlaceholderText('Pesquisar serviço...'));
  await userEvent.click(await screen.findByRole('button', { name: /Revisão/ }));
  await userEvent.click(screen.getByRole('button', { name: /Adicionar$/ }));
}

describe('emBlocosDe30', () => {
  it('sobe qualquer tempo para o próximo bloco de 30 min (nunca 15)', () => {
    expect([0, 15, 30, 31, 45, 60, 75, 90].map(emBlocosDe30)).toEqual([0, 30, 30, 60, 60, 60, 90, 90]);
  });
});

describe('serviço sem hora técnica da categoria: valor da hora vem do catálogo', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ESTOQUE_READ', 'DESCONTO_APROVAR'] });
    // R$ 450 por 1h de tempo mínimo → R$ 450/h
    vi.mocked(useServicos).mockReturnValue({
      data: { content: [{ id: 1, nome: 'Revisão', precoMinSugerido: 450, tempoMinHoras: 1 }] },
    } as never);
    vi.mocked(useProdutos).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useDescontosPorOrigem).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: undefined } as never);
  });

  it('1h = R$ 450; 1:30 = R$ 675 (a hora + metade do valor da hora), mostrado na linha', async () => {
    render(<Harness />);
    await adicionarRevisao();
    expect(valores[0].valorUnitario).toBe(450);
    expect(valores[0].tempoVendidoMinutos).toBe(60);

    await userEvent.click(screen.getByRole('button', { name: '+0:30' }));
    expect(valores[0].valorUnitario).toBe(675);
    expect(screen.getByTestId('item-row-0')).toHaveTextContent('R$ 675,00');
    expect(screen.getByTestId('item-hora-catalogo-0')).toHaveTextContent('R$ 450,00/h');
    expect(screen.getByTestId('item-origem-0')).toHaveTextContent('Valor da hora do catálogo');
  });

  it('tempo digitado quebrado (0:45) é cobrado em bloco de 30 min: 1:00 = R$ 450', async () => {
    render(<Harness />);
    await adicionarRevisao();
    const campo = screen.getByLabelText('Tempo vendido');
    await userEvent.clear(campo);
    await userEvent.type(campo, '0045');
    await userEvent.tab();
    expect(valores[0].tempoVendidoMinutos).toBe(60);
    expect(valores[0].valorUnitario).toBe(450);
  });

  it('o valor da hora é só do form: não vai no payload', async () => {
    render(<Harness />);
    await adicionarRevisao();
    expect(itemParaPayload(valores[0])).not.toHaveProperty('precoPorHoraCatalogo');
    expect(itemParaPayload(valores[0]).valorUnitario).toBe(450);
  });
});
