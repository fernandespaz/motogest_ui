import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAtualizarCapacidadeProdutiva } from '@/hooks/useCapacidadeProdutiva';
import { useDiasUteis } from '@/hooks/useDiasUteis';
import { toast } from '@/store/toastStore';
import { CapacidadeProdutivaForm } from './CapacidadeProdutivaForm';

vi.mock('@/hooks/useCapacidadeProdutiva', () => ({ useAtualizarCapacidadeProdutiva: vi.fn() }));
vi.mock('@/hooks/useDiasUteis', () => ({ useDiasUteis: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('CapacidadeProdutivaForm', () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mutateAsync = vi.fn().mockResolvedValue({ configurado: true });
    vi.mocked(useAtualizarCapacidadeProdutiva).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useDiasUteis).mockReturnValue({ data: undefined } as never);
  });

  it('sugere os dias trabalhados do mês e preenche o campo ao clicar em Usar', async () => {
    vi.mocked(useDiasUteis).mockReturnValue({ data: { mes: '2026-11', uf: 'SP', diasTrabalhados: 20 } } as never);
    render(<CapacidadeProdutivaForm capacidade={undefined} />);

    expect(screen.getByText(/20 dias trabalhados/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Usar 20' }));

    expect(screen.getByLabelText('Dias úteis no mês', { exact: false })).toHaveValue(20);
  });

  it('avisa que falta a UF da oficina quando a sugestão veio só com feriados nacionais', () => {
    vi.mocked(useDiasUteis).mockReturnValue({ data: { mes: '2026-11', uf: null, diasTrabalhados: 20 } } as never);
    render(<CapacidadeProdutivaForm capacidade={undefined} />);

    expect(screen.getByText(/Informe a UF da oficina/)).toBeInTheDocument();
  });

  it('shows a first-setup hint and starting values when nothing is configured yet', () => {
    render(<CapacidadeProdutivaForm capacidade={undefined} />);
    expect(screen.getByText('Nenhuma capacidade configurada ainda — informe os valores abaixo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Mecânicos', { exact: false })).toHaveValue(1);
    expect(screen.getByLabelText('Horas por dia', { exact: false })).toHaveValue(8);
  });

  it('prefills and shows the saved capacidade, without the first-setup hint', () => {
    render(
      <CapacidadeProdutivaForm
        capacidade={{ configurado: true, numeroMecanicos: 3, horasPorDia: 8, diasUteisMes: 22, eficienciaPercentual: 85, horasProdutivas: 448.8 }}
      />,
    );
    expect(screen.queryByText('Nenhuma capacidade configurada ainda — informe os valores abaixo.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mecânicos', { exact: false })).toHaveValue(3);
    expect(screen.getByText(/Capacidade atual/)).toBeInTheDocument();
    expect(screen.getByText('448,8 h')).toBeInTheDocument();
  });

  it('submits the form values', async () => {
    render(<CapacidadeProdutivaForm capacidade={undefined} />);
    await userEvent.click(screen.getByRole('button', { name: /Salvar capacidade/ }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ numeroMecanicos: 1, horasPorDia: 8, diasUteisMes: 22, eficienciaPercentual: 80 }),
    );
    expect(toast.success).toHaveBeenCalledWith('Capacidade produtiva salva.');
  });

  it('toasts an error when saving fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('falhou'));
    render(<CapacidadeProdutivaForm capacidade={undefined} />);
    await userEvent.click(screen.getByRole('button', { name: /Salvar capacidade/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('falhou'));
  });
});
