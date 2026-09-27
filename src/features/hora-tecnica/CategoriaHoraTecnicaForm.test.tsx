import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAtualizarHoraTecnica } from '@/hooks/useHoraTecnica';
import { toast } from '@/store/toastStore';
import { CategoriaHoraTecnicaForm } from './CategoriaHoraTecnicaForm';

vi.mock('@/hooks/useHoraTecnica', () => ({ useAtualizarHoraTecnica: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('CategoriaHoraTecnicaForm', () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mutateAsync = vi.fn().mockResolvedValue([]);
    vi.mocked(useAtualizarHoraTecnica).mockReturnValue({ mutateAsync, isPending: false } as never);
  });

  it('shows a first-setup hint and starting values when nothing is configured yet', () => {
    render(<CategoriaHoraTecnicaForm categorias={[]} />);
    expect(screen.getByText(/Nenhuma categoria configurada ainda/)).toBeInTheDocument();
    expect(screen.getByLabelText('Categoria A (R$/h)', { exact: false })).toHaveValue(0);
    expect(screen.getByLabelText('Arredondamento comercial (R$)', { exact: false })).toHaveValue(5);
  });

  it('prefills the saved values for each category, without the first-setup hint', () => {
    render(
      <CategoriaHoraTecnicaForm
        categorias={[
          { categoria: 'A', valorHora: 80, arredondamentoComercial: 10 },
          { categoria: 'B', valorHora: 100, arredondamentoComercial: 10 },
          { categoria: 'C', valorHora: 130, arredondamentoComercial: 10 },
        ]}
      />,
    );
    expect(screen.queryByText(/Nenhuma categoria configurada ainda/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Categoria A (R$/h)', { exact: false })).toHaveValue(80);
    expect(screen.getByLabelText('Categoria B (R$/h)', { exact: false })).toHaveValue(100);
    expect(screen.getByLabelText('Categoria C (R$/h)', { exact: false })).toHaveValue(130);
    expect(screen.getByLabelText('Arredondamento comercial (R$)', { exact: false })).toHaveValue(10);
  });

  it('submits all 3 categories plus the arredondamento in one PUT', async () => {
    render(<CategoriaHoraTecnicaForm categorias={[]} />);

    await userEvent.type(screen.getByLabelText('Categoria A (R$/h)', { exact: false }), '80');
    await userEvent.type(screen.getByLabelText('Categoria B (R$/h)', { exact: false }), '100');
    await userEvent.type(screen.getByLabelText('Categoria C (R$/h)', { exact: false }), '130');
    await userEvent.click(screen.getByRole('button', { name: /Salvar hora técnica/ }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        categorias: [
          { categoria: 'A', valorHora: 80 },
          { categoria: 'B', valorHora: 100 },
          { categoria: 'C', valorHora: 130 },
        ],
        arredondamentoComercial: 5,
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Hora técnica salva. Os novos valores já valem para os consultores.');
  });

  it('toasts an error when saving fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('falhou'));
    render(<CategoriaHoraTecnicaForm categorias={[]} />);

    await userEvent.type(screen.getByLabelText('Categoria A (R$/h)', { exact: false }), '80');
    await userEvent.type(screen.getByLabelText('Categoria B (R$/h)', { exact: false }), '100');
    await userEvent.type(screen.getByLabelText('Categoria C (R$/h)', { exact: false }), '130');
    await userEvent.click(screen.getByRole('button', { name: /Salvar hora técnica/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('falhou'));
  });
});
