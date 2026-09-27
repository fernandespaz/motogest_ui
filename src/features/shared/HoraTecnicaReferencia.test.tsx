import { useForm, FormProvider } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCategoriasHoraTecnica } from '@/hooks/useHoraTecnica';
import { HoraTecnicaReferencia } from './HoraTecnicaReferencia';
import type { ItemFormValue } from './ItemsEditor';

vi.mock('@/hooks/useHoraTecnica', () => ({ useCategoriasHoraTecnica: vi.fn() }));

const CATEGORIAS = [
  { categoria: 'A' as const, valorHora: 120, arredondamentoComercial: 5 },
  { categoria: 'B' as const, valorHora: 150, arredondamentoComercial: 5 },
];

function Harness({ itens }: { itens: Partial<ItemFormValue>[] }) {
  const methods = useForm({ defaultValues: { itens } });
  return (
    <FormProvider {...methods}>
      <HoraTecnicaReferencia name="itens" />
    </FormProvider>
  );
}

describe('HoraTecnicaReferencia', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sums up the already-computed price of items priced by hora técnica, regardless of category mix', () => {
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: CATEGORIAS } as never);
    render(
      <Harness
        itens={[
          { tipoItem: 'SERVICO', precificadoPorHT: true, tempoVendidoMinutos: 60, quantidade: 1, valorUnitario: 120 },
          { tipoItem: 'SERVICO', precificadoPorHT: true, tempoVendidoMinutos: 30, quantidade: 1, valorUnitario: 75 },
        ]}
      />,
    );

    // 60min@A(120/h) = R$120 + 30min@B(150/h) = R$75 → R$195, mesmo com categorias diferentes.
    expect(screen.getByText('R$ 195,00')).toBeInTheDocument();
    expect(screen.getByText(/01:30/)).toBeInTheDocument();
  });

  it('ignores items priced manually (not by hora técnica) even with time sold', () => {
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: CATEGORIAS } as never);
    render(
      <Harness
        itens={[{ tipoItem: 'SERVICO', precificadoPorHT: false, tempoVendidoMinutos: 60, quantidade: 1, valorUnitario: 999 }]}
      />,
    );
    expect(screen.queryByText(/Mão de obra/)).not.toBeInTheDocument();
  });

  it('hides the labor line when no item priced by hora técnica has time sold yet', () => {
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: CATEGORIAS } as never);
    render(<Harness itens={[{ tipoItem: 'SERVICO', precificadoPorHT: true, tempoVendidoMinutos: undefined }]} />);
    expect(screen.queryByText(/Mão de obra/)).not.toBeInTheDocument();
  });

  it('renders nothing when no category is configured (or the profile cannot read it)', () => {
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: [] } as never);
    const { container } = render(<Harness itens={[]} />);
    expect(container).toBeEmptyDOMElement();

    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: undefined } as never);
    const { container: semDados } = render(<Harness itens={[]} />);
    expect(semDados).toBeEmptyDOMElement();
  });
});
