import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAtualizarParametrosHoraTecnica } from '@/hooks/useHoraTecnica';
import { toast } from '@/store/toastStore';
import { ParametrosHoraTecnicaForm } from './ParametrosHoraTecnicaForm';

vi.mock('@/hooks/useHoraTecnica', () => ({ useAtualizarParametrosHoraTecnica: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const configurado = {
  configurado: true,
  precoHoraTecnica: 100,
  composicao: {
    custosFixos: 8800,
    numeroMecanicos: 1,
    horasPorDia: 8,
    diasUteisMes: 22,
    eficienciaPercentual: 100,
    impostosPercentual: 10,
    margemLucroPercentual: 20,
  },
};

describe('ParametrosHoraTecnicaForm', () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useAtualizarParametrosHoraTecnica).mockReturnValue({ mutateAsync, isPending: false } as never);
  });

  it('loads the saved parameters and previews the PHT (8800 ÷ 176h ÷ 0,7 = R$ 71,43)', () => {
    render(<ParametrosHoraTecnicaForm horaTecnica={configurado} />);
    expect(screen.getByLabelText(/Mecânicos/)).toHaveValue(1);
    expect(screen.getByText('R$ 71,43/h')).toBeInTheDocument();
  });

  it('updates the preview live as parameters change', async () => {
    render(<ParametrosHoraTecnicaForm horaTecnica={configurado} />);
    const mecanicos = screen.getByLabelText(/Mecânicos/);
    await userEvent.clear(mecanicos);
    await userEvent.type(mecanicos, '2');
    expect(screen.getByText('R$ 35,71/h')).toBeInTheDocument();
  });

  it('blocks taxes + margin reaching 100% before hitting the backend', async () => {
    render(<ParametrosHoraTecnicaForm horaTecnica={configurado} />);
    const margem = screen.getByLabelText(/Margem de lucro/);
    await userEvent.clear(margem);
    await userEvent.type(margem, '90');
    await userEvent.click(screen.getByRole('button', { name: /Salvar parâmetros/ }));

    expect(await screen.findByText('Impostos + margem precisam somar menos de 100%')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('submits numeric parameters and confirms', async () => {
    render(<ParametrosHoraTecnicaForm horaTecnica={configurado} />);
    const horas = screen.getByLabelText(/Horas por dia/);
    await userEvent.clear(horas);
    await userEvent.type(horas, '9');
    await userEvent.click(screen.getByRole('button', { name: /Salvar parâmetros/ }));

    expect(mutateAsync).toHaveBeenCalledWith({
      numeroMecanicos: 1,
      horasPorDia: 9,
      diasUteisMes: 22,
      eficienciaPercentual: 100,
      impostosPercentual: 10,
      margemLucroPercentual: 20,
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it('keeps unsaved edits when a fixed-cost change refetches the PHT', async () => {
    const { rerender } = render(<ParametrosHoraTecnicaForm horaTecnica={configurado} />);
    const eficiencia = screen.getByLabelText(/Eficiência/);
    await userEvent.clear(eficiencia);
    await userEvent.type(eficiencia, '75');

    // Novo custo fixo → nova resposta, mesmos parâmetros, nova referência de objeto.
    rerender(
      <ParametrosHoraTecnicaForm
        horaTecnica={{ ...configurado, composicao: { ...configurado.composicao, custosFixos: 9500 } }}
      />,
    );

    expect(screen.getByLabelText(/Eficiência/)).toHaveValue(75);
  });

  it('suggests starting values and hints at registering fixed costs when never configured', () => {
    render(<ParametrosHoraTecnicaForm horaTecnica={{ configurado: false }} />);
    expect(screen.getByLabelText(/Horas por dia/)).toHaveValue(8);
    expect(screen.getByText(/Cadastre ao menos um custo fixo/)).toBeInTheDocument();
  });
});
