import { useForm, FormProvider } from 'react-hook-form';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/test/queryClientWrapper';
import { useAuthStore } from '@/store/authStore';
import { useServicos } from '@/hooks/useServicos';
import { useProdutos } from '@/hooks/useProdutos';
import { useDescontosPorOrigem } from '@/hooks/useDescontos';
import { useCategoriasHoraTecnica } from '@/hooks/useHoraTecnica';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ItemsEditor,
  MENSAGEM_SERVICO_SEM_TEMPO,
  erroListaItens,
  itemParaPayload,
  temServicoPorHTSemTempo,
  valorPorCategoria,
  type ItemFormValue,
} from './ItemsEditor';

vi.mock('@/hooks/useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('@/hooks/useProdutos', () => ({ useProdutos: vi.fn() }));
vi.mock('@/hooks/useDescontos', () => ({ useDescontosPorOrigem: vi.fn() }));
vi.mock('@/hooks/useHoraTecnica', () => ({ useCategoriasHoraTecnica: vi.fn() }));

const VALOR_HORA_A = 102.98;
const VALOR_HORA_B = 200;
const ARREDONDAMENTO = 5;

// "Revisão Completa" é categoria A no catálogo — só referência/sugestão de
// preço (precoMinSugerido/Max), sem efeito no cálculo real (ver Atualização
// 29/09 da doc de Precificação por Categoria): quem decide o valorHora
// aplicado é a categoria do VEÍCULO do orçamento/OS, passada via prop.
const servicos = {
  content: [{ id: 1, nome: 'Revisão Completa', categoria: 'A', tempoMinHoras: 1.5, tempoMaxHoras: 2, precoMinSugerido: 200, precoMaxSugerido: 300 }],
};
const categoriasHT = [
  { categoria: 'A' as const, valorHora: VALOR_HORA_A, arredondamentoComercial: ARREDONDAMENTO },
  { categoria: 'B' as const, valorHora: VALOR_HORA_B, arredondamentoComercial: ARREDONDAMENTO },
];

let valoresAtuais: () => { itens: ItemFormValue[] };

// Sem valor default pro prop: um teste precisa conseguir passar
// `categoriaVeiculo={undefined}` de propósito (nenhum veículo selecionado
// ainda) sem cair de volta num default — todo outro chamador passa a
// categoria explicitamente.
function Harness({
  defaultItens = [],
  categoriaVeiculo,
}: {
  defaultItens?: ItemFormValue[];
  categoriaVeiculo: 'A' | 'B' | 'C' | undefined;
}) {
  const methods = useForm<{ itens: ItemFormValue[] }>({ defaultValues: { itens: defaultItens } });
  valoresAtuais = methods.getValues;
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <FormProvider {...methods}>
        <ItemsEditor name="itens" mostrarTempoVendido categoriaVeiculo={categoriaVeiculo} />
      </FormProvider>
    </QueryClientProvider>
  );
}

async function adicionarServico() {
  await userEvent.click(screen.getByRole('button', { name: /Adicionar serviço/ }));
  await userEvent.click(screen.getByRole('textbox'));
  await userEvent.click(await screen.findByRole('button', { name: /Revisão Completa/ }));
}

describe('ItemsEditor — serviço cobrado pela hora técnica por categoria', () => {
  beforeEach(() => {
    // Perfil Consultor: sem DESCONTO_APROVAR, não edita preço direto.
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ORCAMENTO_READ'] });
    vi.mocked(useServicos).mockReturnValue({ data: servicos } as never);
    vi.mocked(useProdutos).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useDescontosPorOrigem).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: categoriasHT } as never);
  });

  it('prices a new service as valorHora(categoria do veículo) × tempo mínimo, rounded up, never a fixed catalog price', async () => {
    render(<Harness categoriaVeiculo="A" />);
    await adicionarServico();

    const linha = screen.getByTestId('item-row-0');
    // 1h30 × R$ 102,98 = R$ 154,47 → arredonda pra cima em múltiplos de 5 → R$ 155.
    expect(within(linha).getByLabelText('Valor unitário')).toHaveValue(155);
    expect(within(linha).getByText('Hora técnica R$ 102,98/h (cat. A do veículo)')).toBeInTheDocument();
    expect(valoresAtuais().itens[0]).toMatchObject({ tempoVendidoMinutos: 90, precificadoPorHT: true });
  });

  it('prices by the VEHICLE category, not the catalog category of the chosen service', async () => {
    // "Revisão Completa" é categoria A no catálogo (só referência) — o
    // veículo deste orçamento/OS é categoria B, então o preço deve sair de
    // valorHora(B) = R$200, não de valorHora(A) = R$102,98.
    render(<Harness categoriaVeiculo="B" />);
    await adicionarServico();

    const linha = screen.getByTestId('item-row-0');
    // 1h30 × R$ 200 = R$ 300, já múltiplo exato de 5.
    expect(within(linha).getByLabelText('Valor unitário')).toHaveValue(300);
    expect(within(linha).getByText('Hora técnica R$ 200,00/h (cat. B do veículo)')).toBeInTheDocument();
  });

  it('reprices HT items when the vehicle changes to another category', async () => {
    const { rerender } = render(<Harness categoriaVeiculo="A" />);
    await adicionarServico();
    expect(screen.getByLabelText('Valor unitário')).toHaveValue(155);

    // Harness remonta o form ao trocar de props? Não — mesmo componente, só a prop muda.
    rerender(<Harness categoriaVeiculo="B" />);
    await waitFor(() => expect(screen.getByLabelText('Valor unitário')).toHaveValue(300));
  });

  it('treats a category with valorHora 0 as not configured (manual price)', async () => {
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({
      data: [{ categoria: 'A' as const, valorHora: 0, arredondamentoComercial: ARREDONDAMENTO }],
    } as never);
    render(<Harness categoriaVeiculo="A" />);
    await adicionarServico();

    expect(screen.getByLabelText('Valor unitário')).toHaveValue(200);
    expect(valoresAtuais().itens[0].precificadoPorHT).toBe(false);
  });

  it('falls back to manual pricing while no vehicle (and therefore no categoria) is selected yet', async () => {
    render(<Harness categoriaVeiculo={undefined} />);
    await adicionarServico();

    // Sem categoria de veículo pra resolver o valorHora: usa a faixa sugerida
    // mínima do catálogo como ponto de partida manual, igual a uma categoria
    // sem hora técnica configurada.
    expect(screen.getByLabelText('Valor unitário')).toHaveValue(200);
    expect(valoresAtuais().itens[0].precificadoPorHT).toBe(false);
  });

  it('recalculates the price whenever the sold time changes', async () => {
    render(<Harness categoriaVeiculo="A" />);
    await adicionarServico();
    await userEvent.click(screen.getByRole('button', { name: '+1:00' }));

    // 2h30 × 102,98 = 257,45 → arredonda pra cima em múltiplos de 5 → 260.
    expect(screen.getByLabelText('Valor unitário')).toHaveValue(260);
  });

  it('flags a service with no sold time instead of silently pricing it at zero', async () => {
    vi.mocked(useServicos).mockReturnValue({
      data: { content: [{ id: 1, nome: 'Revisão Completa', categoria: 'A' }] },
    } as never);
    render(<Harness categoriaVeiculo="A" />);
    await adicionarServico();

    expect(screen.getByText('Informe o tempo vendido')).toBeInTheDocument();
    expect(temServicoPorHTSemTempo(valoresAtuais().itens)).toBe(true);
  });

  it('requires manual pricing when the categoria has no hora técnica configured', async () => {
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: [] } as never);
    render(<Harness categoriaVeiculo="A" />);
    await adicionarServico();

    // Sem valorHora pra categoria A: usa a faixa sugerida mínima como ponto de partida manual.
    expect(screen.getByLabelText('Valor unitário')).toHaveValue(200);
    expect(valoresAtuais().itens[0].precificadoPorHT).toBe(false);
  });

  it('keeps a saved service linked to hora técnica when its stored value matches valorHora(categoria) × tempo', async () => {
    render(
      <Harness
        categoriaVeiculo="A"
        defaultItens={[
          { id: 7, tipoItem: 'SERVICO', servicoId: 1, descricao: 'Revisão Completa', quantidade: 1, valorUnitario: 155, tempoVendidoMinutos: 90 },
        ]}
      />,
    );
    await waitFor(() => expect(valoresAtuais().itens[0].precificadoPorHT).toBe(true));

    await userEvent.click(screen.getByRole('button', { name: '+1:00' }));
    expect(screen.getByLabelText('Valor unitário')).toHaveValue(260);
  });

  it('preserves a saved price that differs from valorHora(categoria) × tempo (approved discount or older valorHora)', async () => {
    render(
      <Harness
        categoriaVeiculo="A"
        defaultItens={[
          { id: 7, tipoItem: 'SERVICO', servicoId: 1, descricao: 'Revisão Completa', quantidade: 1, valorUnitario: 130, tempoVendidoMinutos: 90 },
        ]}
      />,
    );
    await waitFor(() => expect(valoresAtuais().itens[0].precificadoPorHT).toBe(false));

    await userEvent.click(screen.getByRole('button', { name: '+1:00' }));
    expect(screen.getByLabelText('Valor unitário')).toHaveValue(130);
    expect(screen.queryByText(/Hora técnica R\$/)).not.toBeInTheDocument();
  });

  it('an admin typing a price detaches the item from hora técnica', async () => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'DESCONTO_APROVAR'] });
    render(<Harness categoriaVeiculo="A" />);
    await adicionarServico();

    const valor = screen.getByLabelText('Valor unitário');
    await userEvent.clear(valor);
    await userEvent.type(valor, '200');

    expect(valoresAtuais().itens[0].precificadoPorHT).toBe(false);
  });
});

describe('erroListaItens with the real zod resolver', () => {
  const schema = z.object({
    itens: z
      .array(z.object({ descricao: z.string(), precificadoPorHT: z.boolean().optional(), tempoVendidoMinutos: z.number().optional() }))
      .refine((itens) => !temServicoPorHTSemTempo(itens), MENSAGEM_SERVICO_SEM_TEMPO),
  });

  function Form() {
    const {
      register,
      handleSubmit,
      formState: { errors },
    } = useForm<z.infer<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: { itens: [{ descricao: 'Revisão', precificadoPorHT: true }] },
    });
    return (
      <form onSubmit={handleSubmit(() => {})}>
        {/* Item registrado → o resolver joga o erro da lista em errors.itens.root. */}
        <input {...register('itens.0.descricao')} />
        {erroListaItens(errors.itens) && <p>{erroListaItens(errors.itens)}</p>}
        <button type="submit">Salvar</button>
      </form>
    );
  }

  it('shows the list-level message even when it lands under errors.itens.root', async () => {
    render(<Form />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(MENSAGEM_SERVICO_SEM_TEMPO)).toBeInTheDocument();
  });
});

describe('itemParaPayload', () => {
  const base: ItemFormValue = {
    id: 3,
    tipoItem: 'SERVICO',
    descricao: 'Revisão',
    quantidade: 1,
    valorUnitario: 155,
    tempoVendidoMinutos: 90,
  };

  it('sends an HT-priced service without valorUnitario so the backend prices it', () => {
    const payload = itemParaPayload({ ...base, precificadoPorHT: true });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('precificadoPorHT');
    expect(payload.valorUnitario).toBeUndefined();
    expect(payload.tempoVendidoMinutos).toBe(90);
  });

  it('sends the on-screen price for fixed-price items (keeps approved discounts)', () => {
    expect(itemParaPayload({ ...base, valorUnitario: 130, precificadoPorHT: false }).valorUnitario).toBe(130);
    expect(itemParaPayload({ ...base, precificadoPorHT: undefined }).valorUnitario).toBe(155);
  });
});

describe('valorPorCategoria', () => {
  it('rounds up to the nearest multiple of the arredondamento comercial', () => {
    expect(valorPorCategoria(102.98, 90, 5)).toBe(155);
    expect(valorPorCategoria(100, 30, 10)).toBe(50);
    expect(valorPorCategoria(33.33, 20, 1)).toBe(12);
  });

  it('does not round up a value that already lands on an exact multiple', () => {
    expect(valorPorCategoria(150, 60, 5)).toBe(150);
    expect(valorPorCategoria(100, 60, 10)).toBe(100);
  });

  it('returns the raw amount when there is no arredondamento (defensive, backend always sends one)', () => {
    expect(valorPorCategoria(102.98, 90, 0)).toBeCloseTo(154.47);
  });

  // Mesma classe de bug que a fórmula antiga (HALF_UP em cents) existia pra
  // evitar: ponto flutuante pode arredondar 1 passo errado perto de um
  // múltiplo exato do arredondamento. Referência em BigInt: bruto =
  // (centavos × minutos) / 6000 (reais exatos), e ceilDiv((a+b-1)/b) dá o
  // número de "degraus" de arredondamento sem nenhuma casa decimal flutuante.
  it('agrees with an exact ceil-to-multiple reference across a wide range of valorHora × minutos × arredondamento', () => {
    const minutos = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240];
    const arredondamentos = [1, 5, 10, 50];
    for (let centavos = 1000; centavos < 30000; centavos += 700) {
      for (const m of minutos) {
        for (const arred of arredondamentos) {
          const numerador = BigInt(centavos) * BigInt(m);
          const denominador = 6000n * BigInt(arred);
          const degraus = (numerador + denominador - 1n) / denominador;
          const esperado = Number(degraus * BigInt(arred));
          expect(valorPorCategoria(centavos / 100, m, arred)).toBe(esperado);
        }
      }
    }
  });
});
