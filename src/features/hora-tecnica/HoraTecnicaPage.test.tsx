import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditoriaHoraTecnica, useCategoriasHoraTecnica } from '@/hooks/useHoraTecnica';
import { HoraTecnicaPage } from './HoraTecnicaPage';

vi.mock('@/hooks/useHoraTecnica', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useHoraTecnica')>('@/hooks/useHoraTecnica');
  return { ...actual, useCategoriasHoraTecnica: vi.fn(), useAuditoriaHoraTecnica: vi.fn() };
});
vi.mock('./CategoriaHoraTecnicaForm', () => ({ CategoriaHoraTecnicaForm: () => <p>form-categorias</p> }));
vi.mock('@/features/shared/AuditoriaFinanceiraCard', () => ({ AuditoriaFinanceiraCard: () => <p>historico</p> }));

describe('HoraTecnicaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuditoriaHoraTecnica).mockReturnValue({ data: undefined, isLoading: false } as never);
  });

  it('blocks the form when the current values failed to load', async () => {
    const refetch = vi.fn();
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never);
    render(<HoraTecnicaPage />);

    expect(screen.getByText('Não foi possível carregar a hora técnica')).toBeInTheDocument();
    expect(screen.queryByText('form-categorias')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the categories form once the current values loaded, even when empty (not configured yet)', () => {
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({ data: [], isLoading: false, isError: false } as never);
    render(<HoraTecnicaPage />);

    expect(screen.getByText('form-categorias')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar a hora técnica')).not.toBeInTheDocument();
  });

  it('shows the history tab when switched to it', async () => {
    vi.mocked(useCategoriasHoraTecnica).mockReturnValue({
      data: [{ categoria: 'A', valorHora: 80, arredondamentoComercial: 5 }],
      isLoading: false,
      isError: false,
    } as never);
    render(<HoraTecnicaPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Histórico' }));
    expect(screen.getByText('historico')).toBeInTheDocument();
  });
});
