import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { CarteiraPlacasTab } from './CarteiraPlacasTab';
import { useCarteiraPlacas, useExtratoPlacas } from '@/hooks/usePlacas';

vi.mock('@/hooks/usePlacas', () => ({
  placasKeys: { carteira: ['placas', 'carteira'] },
  useCarteiraPlacas: vi.fn(),
  useExtratoPlacas: vi.fn(),
  useCriarRecargaPlacas: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn() })),
  useRecargaPlacas: vi.fn(() => ({ data: undefined })),
}));

const render = (ui: ReactElement) => rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const base = {
  saldoCentavos: 300,
  estado: 'CRITICO',
  consultasRestantes: 30,
  precoConsultaCentavos: 10,
  precoChassiCentavos: 25,
  saldoCriticoCentavos: 500,
  recargaMinimaCentavos: 1000,
  recargaMaximaCentavos: 100000,
  consultaAutomaticaDisponivel: true,
};

describe('CarteiraPlacasTab', () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.stubEnv('VITE_PAGBANK_WEBHOOK_LIBERADO', 'true');
    vi.mocked(useExtratoPlacas).mockReturnValue({
      data: {
        content: [
          { id: 1, tipo: 'RECARGA', valorCentavos: 1000, saldoAposCentavos: 1000, data: '2026-11-24T10:00:00' },
          { id: 2, tipo: 'CONSUMO', valorCentavos: 10, saldoAposCentavos: 990, placa: 'ABC1D23', data: '2026-11-24T11:00:00' },
        ],
        totalPages: 1,
        totalElements: 2,
      },
      isLoading: false,
    } as never);
  });

  it('mostra saldo crítico com alerta e o extrato', () => {
    vi.mocked(useCarteiraPlacas).mockReturnValue({ data: base, isLoading: false } as never);
    render(<CarteiraPlacasTab />);
    expect(screen.getByText('Saldo crítico')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Saldo crítico');
    expect(screen.getByText('Recarga')).toBeInTheDocument();
    expect(screen.getByText('ABC1D23')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('sem alerta quando o saldo está ok', () => {
    vi.mocked(useCarteiraPlacas).mockReturnValue({ data: { ...base, estado: 'OK', saldoCentavos: 5000 }, isLoading: false } as never);
    render(<CarteiraPlacasTab />);
    expect(screen.getByText('Saldo ok')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('com a recarga bloqueada mostra o aviso de "em breve" e desabilita o botão', () => {
    vi.stubEnv('VITE_PAGBANK_WEBHOOK_LIBERADO', '');
    vi.mocked(useCarteiraPlacas).mockReturnValue({ data: base, isLoading: false } as never);
    render(<CarteiraPlacasTab />);
    expect(screen.getByRole('status')).toHaveTextContent('estará liberada em breve');
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeDisabled();
  });

  it('com a recarga liberada não mostra o aviso e habilita o botão', () => {
    vi.mocked(useCarteiraPlacas).mockReturnValue({ data: base, isLoading: false } as never);
    render(<CarteiraPlacasTab />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeEnabled();
  });
});
