import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditoriaCapacidadeProdutiva, useCapacidadeProdutiva } from '@/hooks/useCapacidadeProdutiva';
import { CapacidadeProdutivaPage } from './CapacidadeProdutivaPage';

vi.mock('@/hooks/useCapacidadeProdutiva', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useCapacidadeProdutiva')>('@/hooks/useCapacidadeProdutiva');
  return { ...actual, useCapacidadeProdutiva: vi.fn(), useAuditoriaCapacidadeProdutiva: vi.fn() };
});
vi.mock('./CapacidadeProdutivaForm', () => ({ CapacidadeProdutivaForm: () => <p>form-capacidade</p> }));
vi.mock('@/features/shared/AuditoriaFinanceiraCard', () => ({ AuditoriaFinanceiraCard: () => <p>historico</p> }));

describe('CapacidadeProdutivaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuditoriaCapacidadeProdutiva).mockReturnValue({ data: undefined, isLoading: false } as never);
  });

  it('blocks the form when the current values failed to load', async () => {
    const refetch = vi.fn();
    vi.mocked(useCapacidadeProdutiva).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never);
    render(<CapacidadeProdutivaPage />);

    expect(screen.getByText('Não foi possível carregar a capacidade produtiva')).toBeInTheDocument();
    expect(screen.queryByText('form-capacidade')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the form once the current values loaded', () => {
    vi.mocked(useCapacidadeProdutiva).mockReturnValue({ data: { configurado: false }, isLoading: false, isError: false } as never);
    render(<CapacidadeProdutivaPage />);

    expect(screen.getByText('form-capacidade')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar a capacidade produtiva')).not.toBeInTheDocument();
  });

  it('shows the history tab when switched to it', async () => {
    vi.mocked(useCapacidadeProdutiva).mockReturnValue({ data: { configurado: true }, isLoading: false, isError: false } as never);
    render(<CapacidadeProdutivaPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Histórico' }));
    expect(screen.getByText('historico')).toBeInTheDocument();
  });
});
