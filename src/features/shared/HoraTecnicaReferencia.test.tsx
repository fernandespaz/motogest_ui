import { useForm, FormProvider } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHoraTecnica } from '@/hooks/useHoraTecnica';
import { HoraTecnicaReferencia } from './HoraTecnicaReferencia';
import type { ItemFormValue } from './ItemsEditor';

vi.mock('@/hooks/useHoraTecnica', () => ({ useHoraTecnica: vi.fn() }));

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

  it('shows only the final PHT and the labor it represents for the sold time', () => {
    vi.mocked(useHoraTecnica).mockReturnValue({ data: { configurado: true, precoHoraTecnica: 120 } } as never);
    render(<Harness itens={[{ tempoVendidoMinutos: 60 }, { tempoVendidoMinutos: 30 }]} />);

    expect(screen.getByText('R$ 120,00/h')).toBeInTheDocument();
    // 1h30 × R$ 120 = R$ 180
    expect(screen.getByText('R$ 180,00')).toBeInTheDocument();
    expect(screen.getByText(/01:30/)).toBeInTheDocument();
  });

  it('never renders cost components, even if the payload somehow carried them', () => {
    vi.mocked(useHoraTecnica).mockReturnValue({
      data: { configurado: true, precoHoraTecnica: 120, composicao: { custosFixos: 9999, margemLucroPercentual: 30 } },
    } as never);
    render(<Harness itens={[]} />);

    expect(screen.queryByText(/9\.999/)).not.toBeInTheDocument();
    expect(screen.queryByText(/margem/i)).not.toBeInTheDocument();
  });

  it('hides the labor line when no time was sold yet', () => {
    vi.mocked(useHoraTecnica).mockReturnValue({ data: { configurado: true, precoHoraTecnica: 120 } } as never);
    render(<Harness itens={[{ tempoVendidoMinutos: undefined }]} />);

    expect(screen.queryByText(/Mão de obra/)).not.toBeInTheDocument();
  });

  it('renders nothing when the oficina has not configured the PHT (or the profile cannot read it)', () => {
    vi.mocked(useHoraTecnica).mockReturnValue({ data: { configurado: false } } as never);
    const { container } = render(<Harness itens={[]} />);
    expect(container).toBeEmptyDOMElement();

    vi.mocked(useHoraTecnica).mockReturnValue({ data: undefined } as never);
    const { container: semDados } = render(<Harness itens={[]} />);
    expect(semDados).toBeEmptyDOMElement();
  });
});
