import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHoraTecnica } from '@/hooks/useHoraTecnica';
import { HoraTecnicaPage } from './HoraTecnicaPage';

vi.mock('@/hooks/useHoraTecnica', () => ({ useHoraTecnica: vi.fn() }));
vi.mock('./ParametrosHoraTecnicaForm', () => ({ ParametrosHoraTecnicaForm: () => <p>form-parametros</p> }));
vi.mock('./CustosFixosCard', () => ({ CustosFixosCard: () => <p>custos-fixos</p> }));
vi.mock('./AuditoriaHoraTecnicaCard', () => ({ AuditoriaHoraTecnicaCard: () => <p>historico</p> }));

describe('HoraTecnicaPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks the parameters form when the current values failed to load', async () => {
    const refetch = vi.fn();
    vi.mocked(useHoraTecnica).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never);
    render(<HoraTecnicaPage />);

    expect(screen.getByText('Não foi possível carregar a hora técnica')).toBeInTheDocument();
    expect(screen.queryByText('form-parametros')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the full composition pipeline for who manages it', () => {
    vi.mocked(useHoraTecnica).mockReturnValue({
      data: {
        configurado: true,
        precoHoraTecnica: 71.43,
        composicao: { custosFixos: 8800, horasProdutivas: 176, custoPorHora: 50, numeroMecanicos: 1 },
      },
      isLoading: false,
      isError: false,
    } as never);
    render(<HoraTecnicaPage />);

    expect(screen.getByText('R$ 8.800,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 50,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 71,43')).toBeInTheDocument();
    expect(screen.getByText('form-parametros')).toBeInTheDocument();
  });

  it('guides the first setup instead of showing zeros', () => {
    vi.mocked(useHoraTecnica).mockReturnValue({ data: { configurado: false }, isLoading: false } as never);
    render(<HoraTecnicaPage />);
    expect(screen.getByText('Hora técnica ainda não configurada')).toBeInTheDocument();
  });
});
