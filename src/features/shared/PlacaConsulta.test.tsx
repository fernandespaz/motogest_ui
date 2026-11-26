import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PlacaConsulta } from './PlacaConsulta';
import { useCarteiraPlacas, useConsultarChassi, useConsultarPlaca } from '@/hooks/usePlacas';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

vi.mock('@/hooks/usePlacas', () => ({
  useCarteiraPlacas: vi.fn(),
  useConsultarPlaca: vi.fn(),
  useConsultarChassi: vi.fn(),
}));
vi.mock('@/store/authStore', () => ({ useAuthStore: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const carteira = {
  saldoCentavos: 1000,
  estado: 'OK',
  consultasRestantes: 100,
  precoConsultaCentavos: 10,
  precoChassiCentavos: 25,
  saldoCriticoCentavos: 500,
  recargaMinimaCentavos: 1000,
  recargaMaximaCentavos: 100000,
  consultaAutomaticaDisponivel: true,
};

const mutateConsulta = vi.fn();
const mutateChassi = vi.fn();

function setup(permissoes: string[] = ['VEICULO_WRITE'], cart: object | undefined = carteira) {
  vi.mocked(useAuthStore).mockImplementation(((sel: (s: unknown) => unknown) =>
    sel({ hasPermission: (p: string) => permissoes.includes(p) })) as never);
  vi.mocked(useCarteiraPlacas).mockReturnValue({ data: cart } as never);
  vi.mocked(useConsultarPlaca).mockReturnValue({ mutateAsync: mutateConsulta, isPending: false, data: undefined } as never);
  vi.mocked(useConsultarChassi).mockReturnValue({ mutateAsync: mutateChassi, isPending: false } as never);
}

function renderar(placa: string, onDados = vi.fn(), chassiPreenchido = false) {
  render(
    <MemoryRouter>
      <PlacaConsulta placa={placa} onDados={onDados} chassiPreenchido={chassiPreenchido} />
    </MemoryRouter>,
  );
  return onDados;
}

describe('PlacaConsulta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_PAGBANK_WEBHOOK_LIBERADO', 'true');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('não aparece com a feature desligada ou sem permissão de cadastrar', () => {
    setup(['VEICULO_WRITE'], { ...carteira, consultaAutomaticaDisponivel: false });
    renderar('ABC1D23');
    expect(screen.queryByTestId('placa-consulta')).not.toBeInTheDocument();
  });

  it('não aparece para quem não tem VEICULO_WRITE', () => {
    setup([]);
    renderar('ABC1D23');
    expect(screen.queryByTestId('placa-consulta')).not.toBeInTheDocument();
  });

  it('mantém o botão desabilitado para placa inválida', () => {
    setup();
    renderar('AB12');
    expect(screen.getByRole('button', { name: /Buscar dados da placa/ })).toBeDisabled();
  });

  it('consulta só ao clicar e entrega os dados encontrados', async () => {
    setup();
    mutateConsulta.mockResolvedValue({ placa: 'ABC1D23', encontrada: true, marca: 'VW', modelo: 'Gol' });
    const onDados = renderar('abc-1d23');
    expect(mutateConsulta).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Buscar dados da placa/ }));
    expect(mutateConsulta).toHaveBeenCalledWith('ABC1D23');
    expect(onDados).toHaveBeenCalledWith(expect.objectContaining({ marca: 'VW', modelo: 'Gol' }));
  });

  it('não preenche nada quando a placa não é encontrada', async () => {
    setup();
    mutateConsulta.mockResolvedValue({ placa: 'ABC1D23', encontrada: false });
    const onDados = renderar('ABC1D23');
    await userEvent.click(screen.getByRole('button', { name: /Buscar dados da placa/ }));
    expect(onDados).not.toHaveBeenCalled();
  });

  it('avisa e cai para o manual quando o saldo é insuficiente (402)', async () => {
    setup();
    mutateConsulta.mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 402, data: { codigo: 'SALDO_PLACAS_INSUFICIENTE' } },
      }),
    );
    renderar('ABC1D23');
    await userEvent.click(screen.getByRole('button', { name: /Buscar dados da placa/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Saldo de consultas insuficiente')));
  });

  it('com saldo esgotado desabilita a consulta e oferece recarga a quem pode', () => {
    setup(['VEICULO_WRITE', 'PLACAS_CARTEIRA'], { ...carteira, estado: 'ESGOTADO' });
    renderar('ABC1D23');
    expect(screen.getByRole('button', { name: /Buscar dados da placa/ })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Recarregar' })).toHaveAttribute('href', '/oficina/placas');
  });

  it('não oferece o link de recarga sem PLACAS_CARTEIRA', () => {
    setup(['VEICULO_WRITE'], { ...carteira, estado: 'ESGOTADO' });
    renderar('ABC1D23');
    expect(screen.queryByRole('link', { name: 'Recarregar' })).not.toBeInTheDocument();
  });

  it('não oferece o link de recarga enquanto a recarga não estiver liberada', () => {
    vi.stubEnv('VITE_PAGBANK_WEBHOOK_LIBERADO', '');
    setup(['VEICULO_WRITE', 'PLACAS_CARTEIRA'], { ...carteira, estado: 'ESGOTADO' });
    renderar('ABC1D23');
    expect(screen.queryByRole('link', { name: 'Recarregar' })).not.toBeInTheDocument();
  });
});
