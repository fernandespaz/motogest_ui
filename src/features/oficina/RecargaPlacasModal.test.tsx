import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecargaPlacasModal, reaisParaCentavos } from './RecargaPlacasModal';
import { useCriarRecargaPlacas, useRecargaPlacas } from '@/hooks/usePlacas';

vi.mock('@/hooks/usePlacas', () => ({
  placasKeys: { carteira: ['placas', 'carteira'] },
  useCriarRecargaPlacas: vi.fn(),
  useRecargaPlacas: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const carteira = {
  saldoCentavos: 0,
  estado: 'ESGOTADO',
  consultasRestantes: 0,
  precoConsultaCentavos: 10,
  precoChassiCentavos: 25,
  saldoCriticoCentavos: 500,
  recargaMinimaCentavos: 1000,
  recargaMaximaCentavos: 100000,
  consultaAutomaticaDisponivel: true,
} as never;

const mutateAsync = vi.fn();

describe('reaisParaCentavos', () => {
  it('converte texto em reais para centavos', () => {
    expect(reaisParaCentavos('12,50')).toBe(1250);
    expect(reaisParaCentavos('1.000,00')).toBe(100000);
    expect(reaisParaCentavos('')).toBe(0);
  });
});

describe('RecargaPlacasModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCriarRecargaPlacas).mockReturnValue({ mutateAsync, isPending: false, reset: vi.fn(), data: undefined } as never);
    vi.mocked(useRecargaPlacas).mockReturnValue({ data: undefined } as never);
  });

  it('só habilita "Gerar Pix" dentro dos limites da carteira', async () => {
    render(<QueryClientProvider client={new QueryClient()}><RecargaPlacasModal open onClose={vi.fn()} carteira={carteira} /></QueryClientProvider>);
    expect(screen.getByRole('button', { name: 'Gerar Pix' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Outro valor/), '5');
    expect(screen.getByRole('button', { name: 'Gerar Pix' })).toBeDisabled();
    expect(screen.getByText('Valor fora do permitido.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/Outro valor/));
    await userEvent.type(screen.getByLabelText(/Outro valor/), '20');
    expect(screen.getByRole('button', { name: 'Gerar Pix' })).toBeEnabled();
  });

  it('gera a recarga com o valor em centavos', async () => {
    mutateAsync.mockResolvedValue({ id: 9, valorCentavos: 2000, status: 'PENDENTE' });
    render(<QueryClientProvider client={new QueryClient()}><RecargaPlacasModal open onClose={vi.fn()} carteira={carteira} /></QueryClientProvider>);
    await userEvent.click(screen.getByRole('button', { name: /20,00/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Gerar Pix' }));
    expect(mutateAsync).toHaveBeenCalledWith(2000);
  });

  it('mostra QR e copia-e-cola enquanto pendente e confirma quando paga', () => {
    vi.mocked(useRecargaPlacas).mockReturnValue({
      data: { id: 9, valorCentavos: 2000, status: 'PENDENTE', qrCodeText: '000201pix', qrCodeImageUrl: 'http://qr/png' },
    } as never);
    const { rerender } = render(<QueryClientProvider client={new QueryClient()}><RecargaPlacasModal open onClose={vi.fn()} carteira={carteira} /></QueryClientProvider>);
    // sem recargaId no estado local o modal ainda mostra o formulário; o resultado vem do hook
    expect(screen.getByText('000201pix')).toBeInTheDocument();
    expect(screen.getByAltText('QR Code para recarga via Pix')).toBeInTheDocument();

    vi.mocked(useRecargaPlacas).mockReturnValue({ data: { id: 9, valorCentavos: 2000, status: 'PAGA' } } as never);
    rerender(<QueryClientProvider client={new QueryClient()}><RecargaPlacasModal open onClose={vi.fn()} carteira={carteira} /></QueryClientProvider>);
    expect(screen.getByText(/Pagamento confirmado/)).toBeInTheDocument();
  });
});
