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
import { useHoraTecnica } from '@/hooks/useHoraTecnica';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ItemsEditor,
  MENSAGEM_SERVICO_SEM_TEMPO,
  erroListaItens,
  itemParaPayload,
  temServicoPorHTSemTempo,
  valorPorHoraTecnica,
  type ItemFormValue,
} from './ItemsEditor';

vi.mock('@/hooks/useServicos', () => ({ useServicos: vi.fn() }));
vi.mock('@/hooks/useProdutos', () => ({ useProdutos: vi.fn() }));
vi.mock('@/hooks/useDescontos', () => ({ useDescontosPorOrigem: vi.fn() }));
vi.mock('@/hooks/useHoraTecnica', () => ({ useHoraTecnica: vi.fn() }));

const PHT = 102.98;

// "Revisão Completa" do print: preço de catálogo R$ 250, duração padrão 1h30.
const servicos = { content: [{ id: 1, nome: 'Revisão Completa', preco: 250, duracaoMinutos: 90 }] };

let valoresAtuais: () => { itens: ItemFormValue[] };

function Harness({ defaultItens = [] }: { defaultItens?: ItemFormValue[] }) {
  const methods = useForm<{ itens: ItemFormValue[] }>({ defaultValues: { itens: defaultItens } });
  valoresAtuais = methods.getValues;
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <FormProvider {...methods}>
        <ItemsEditor name="itens" mostrarTempoVendido />
      </FormProvider>
    </QueryClientProvider>
  );
}

async function adicionarServico() {
  await userEvent.click(screen.getByRole('button', { name: /Adicionar serviço/ }));
  await userEvent.click(screen.getByRole('textbox'));
  await userEvent.click(await screen.findByRole('button', { name: /Revisão Completa/ }));
}

describe('ItemsEditor — serviço cobrado pela hora técnica', () => {
  beforeEach(() => {
    // Perfil Consultor: sem DESCONTO_APROVAR, não edita preço direto.
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'ORCAMENTO_READ'] });
    vi.mocked(useServicos).mockReturnValue({ data: servicos } as never);
    vi.mocked(useProdutos).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useDescontosPorOrigem).mockReturnValue({ data: { content: [] } } as never);
    vi.mocked(useHoraTecnica).mockReturnValue({ data: { configurado: true, precoHoraTecnica: PHT } } as never);
  });

  it('prices a new service as PHT × catalog duration, never the catalog price (reported bug)', async () => {
    render(<Harness />);
    await adicionarServico();

    const linha = screen.getByTestId('item-row-0');
    // 1h30 × R$ 102,98 = R$ 154,47 — e não os R$ 250 do catálogo.
    expect(within(linha).getByLabelText('Valor unitário')).toHaveValue(154.47);
    expect(within(linha).queryByText('R$ 250,00')).not.toBeInTheDocument();
    expect(within(linha).getByText('Hora técnica R$ 102,98/h')).toBeInTheDocument();
    expect(valoresAtuais().itens[0]).toMatchObject({ tempoVendidoMinutos: 90, precificadoPorHT: true });
  });

  it('recalculates the price whenever the sold time changes', async () => {
    render(<Harness />);
    await adicionarServico();
    await userEvent.click(screen.getByRole('button', { name: '+1:00' }));

    // 2h30 × 102,98 = 257,45
    expect(screen.getByLabelText('Valor unitário')).toHaveValue(257.45);
  });

  it('flags a service with no sold time instead of silently pricing it at zero', async () => {
    vi.mocked(useServicos).mockReturnValue({
      data: { content: [{ id: 1, nome: 'Revisão Completa', preco: 250 }] },
    } as never);
    render(<Harness />);
    await adicionarServico();

    expect(screen.getByText('Informe o tempo vendido')).toBeInTheDocument();
    expect(temServicoPorHTSemTempo(valoresAtuais().itens)).toBe(true);
  });

  it('keeps the catalog price when the oficina has no PHT configured', async () => {
    vi.mocked(useHoraTecnica).mockReturnValue({ data: { configurado: false } } as never);
    render(<Harness />);
    await adicionarServico();

    expect(screen.getByLabelText('Valor unitário')).toHaveValue(250);
    expect(valoresAtuais().itens[0].precificadoPorHT).toBe(false);
  });

  it('keeps a saved service linked to the PHT when its stored value matches PHT × time', async () => {
    render(
      <Harness
        defaultItens={[
          { id: 7, tipoItem: 'SERVICO', descricao: 'Revisão Completa', quantidade: 1, valorUnitario: 154.47, tempoVendidoMinutos: 90 },
        ]}
      />,
    );
    await waitFor(() => expect(valoresAtuais().itens[0].precificadoPorHT).toBe(true));

    await userEvent.click(screen.getByRole('button', { name: '+1:00' }));
    expect(screen.getByLabelText('Valor unitário')).toHaveValue(257.45);
  });

  it('preserves a saved price that differs from PHT × time (approved discount or older PHT)', async () => {
    render(
      <Harness
        defaultItens={[
          { id: 7, tipoItem: 'SERVICO', descricao: 'Revisão Completa', quantidade: 1, valorUnitario: 130, tempoVendidoMinutos: 90 },
        ]}
      />,
    );
    await waitFor(() => expect(valoresAtuais().itens[0].precificadoPorHT).toBe(false));

    await userEvent.click(screen.getByRole('button', { name: '+1:00' }));
    expect(screen.getByLabelText('Valor unitário')).toHaveValue(130);
    expect(screen.queryByText(/Hora técnica R\$/)).not.toBeInTheDocument();
  });

  it('an admin typing a price detaches the item from the PHT', async () => {
    useAuthStore.setState({ permissoes: ['SERVICO_READ', 'DESCONTO_APROVAR'] });
    render(<Harness />);
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
    valorUnitario: 154.47,
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
    expect(itemParaPayload({ ...base, precificadoPorHT: undefined }).valorUnitario).toBe(154.47);
  });

  it('matches the backend rounding (HALF_UP, 2 places)', () => {
    expect(valorPorHoraTecnica(102.98, 90)).toBe(154.47);
    expect(valorPorHoraTecnica(100, 20)).toBe(33.33);
    // Fronteira x,xx5 onde Math.round em ponto flutuante erra pra baixo.
    expect(valorPorHoraTecnica(50.19, 30)).toBe(25.1);
    expect(valorPorHoraTecnica(50.38, 45)).toBe(37.79);
  });

  it('agrees with an exact HALF_UP reference across a wide range of PHT × minutes', () => {
    const minutos = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240];
    for (let centavos = 1000; centavos < 30000; centavos += 7) {
      for (const m of minutos) {
        // Referência em BigInt: HALF_UP(centavos*m / 60).
        const n = BigInt(centavos) * BigInt(m);
        const esperado = Number((2n * n + 60n) / 120n) / 100;
        expect(valorPorHoraTecnica(centavos / 100, m)).toBe(esperado);
      }
    }
  });
});
