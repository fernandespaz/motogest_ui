import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateVeiculo, useUpdateVeiculo } from '@/hooks/useVeiculos';
import { useClientes } from '@/hooks/useClientes';
import { useCarteiraPlacas, useConsultarChassi, useConsultarPlaca } from '@/hooks/usePlacas';
import { useAuthStore } from '@/store/authStore';
import { VeiculoFormModal } from './VeiculoFormModal';

vi.mock('@/hooks/usePlacas', () => ({
  useCarteiraPlacas: vi.fn(),
  useConsultarPlaca: vi.fn(),
  useConsultarChassi: vi.fn(),
}));
vi.mock('@/store/authStore', () => ({ useAuthStore: vi.fn() }));
vi.mock('@/hooks/useVeiculos', () => ({ useCreateVeiculo: vi.fn(), useUpdateVeiculo: vi.fn() }));
vi.mock('@/hooks/useClientes', () => ({ useClientes: vi.fn() }));
vi.mock('@/hooks/useModelosVeiculo', () => ({
  useModelosVeiculo: vi.fn(() => ({ data: { content: [] } })),
  useCreateModeloVeiculo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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

const consultaMutate = vi.fn();
const chassiMutate = vi.fn();
let consultaData: unknown;

function montar() {
  vi.mocked(useAuthStore).mockImplementation(((sel: (s: unknown) => unknown) =>
    sel({ hasPermission: () => true })) as never);
  vi.mocked(useCarteiraPlacas).mockReturnValue({ data: carteira } as never);
  vi.mocked(useConsultarPlaca).mockImplementation(
    () => ({ mutateAsync: consultaMutate, isPending: false, data: consultaData, reset: vi.fn() }) as never,
  );
  vi.mocked(useConsultarChassi).mockReturnValue({ mutateAsync: chassiMutate, isPending: false, data: undefined, reset: vi.fn() } as never);
  return render(
    <MemoryRouter>
      <VeiculoFormModal open onClose={vi.fn()} veiculo={null} defaultClienteId={1} />
    </MemoryRouter>,
  );
}

describe('VeiculoFormModal — consulta de placa (hero)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consultaData = undefined;
    vi.mocked(useClientes).mockReturnValue({ data: { content: [{ id: 1, nome: 'Carlos' }] } } as never);
    vi.mocked(useCreateVeiculo).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useUpdateVeiculo).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });

  it('mostra o campo de placa em destaque antes do proprietário e com a lupa', () => {
    montar();
    const placa = screen.getByLabelText('Placa');
    const proprietario = screen.getByText('Proprietário');
    expect(placa.compareDocumentPosition(proprietario) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: /Consultar placa/ })).toBeDisabled();
  });

  it('nunca consulta ao digitar nem ao apertar Enter — só no clique da lupa', async () => {
    montar();
    await userEvent.type(screen.getByLabelText('Placa'), 'abc1d23{Enter}');
    expect(consultaMutate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Placa')).toHaveValue('ABC1D23');

    consultaMutate.mockResolvedValue({ placa: 'ABC1D23', encontrada: false });
    await userEvent.click(screen.getByRole('button', { name: /Consultar placa/ }));
    expect(consultaMutate).toHaveBeenCalledTimes(1);
    expect(consultaMutate).toHaveBeenCalledWith('ABC1D23');
  });

  it('separa o que veio da consulta do que é complementar, com chassi mascarado e origem por campo', async () => {
    montar();
    consultaMutate.mockImplementation(async () => {
      consultaData = { placa: 'ABC1D23', encontrada: true };
      return {
        placa: 'ABC1D23',
        encontrada: true,
        marca: 'VW',
        modelo: 'Gol',
        anoFabricacao: 2020,
        anoModelo: 2021,
        cor: 'PRATA',
        chassi: '9BWZZZ377VT004251',
        placaJaCadastrada: false,
        valorCobradoCentavos: 10,
      };
    });
    await userEvent.type(screen.getByLabelText('Placa'), 'ABC1D23');
    await userEvent.click(screen.getByRole('button', { name: /Consultar placa/ }));

    expect(await screen.findByText('Informações encontradas na consulta da placa')).toBeInTheDocument();
    expect(screen.getByText('Informações complementares necessárias')).toBeInTheDocument();
    expect(screen.getByLabelText('Modelo')).toHaveValue('Gol');
    expect(screen.getByLabelText('Modelo')).toHaveAttribute('readonly');
    // chassi mascarado até o usuário pedir para mostrar
    expect(screen.getByLabelText('Chassi')).toHaveValue('9BW••••••••••4251');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar chassi' }));
    expect(screen.getByLabelText('Chassi')).toHaveValue('9BWZZZ377VT004251');
    // tudo veio da consulta: só categoria e km ficam como manuais
    expect(screen.getAllByText('Consulta').length).toBeGreaterThanOrEqual(6);
    expect(screen.getByLabelText('Categoria')).toBeInTheDocument();
    expect(screen.getByLabelText('KM atual')).toBeInTheDocument();
  });

  it('um dado da consulta corrigido pelo usuário passa a aparecer como Manual', async () => {
    montar();
    consultaMutate.mockImplementation(async () => {
      consultaData = { placa: 'ABC1D23', encontrada: true };
      return { placa: 'ABC1D23', encontrada: true, marca: 'VW', modelo: 'Gol', cor: 'PRATA', placaJaCadastrada: false, valorCobradoCentavos: 10 };
    });
    await userEvent.type(screen.getByLabelText('Placa'), 'ABC1D23');
    await userEvent.click(screen.getByRole('button', { name: /Consultar placa/ }));
    await screen.findByText('Informações encontradas na consulta da placa');

    await userEvent.click(screen.getByRole('button', { name: /Corrigir dados/ }));
    const cor = screen.getByLabelText('Cor');
    expect(cor).not.toHaveAttribute('readonly');
    await userEvent.clear(cor);
    await userEvent.type(cor, 'PRETA');
    await waitFor(() => expect(screen.getAllByText('Manual').length).toBeGreaterThan(3));
  });

  it('campos que a consulta não devolveu ficam livres para preenchimento manual', async () => {
    montar();
    consultaMutate.mockImplementation(async () => {
      consultaData = { placa: 'ABC1D23', encontrada: true };
      return { placa: 'ABC1D23', encontrada: true, marca: 'VW', modelo: 'Gol', placaJaCadastrada: false, valorCobradoCentavos: 10 };
    });
    await userEvent.type(screen.getByLabelText('Placa'), 'ABC1D23');
    await userEvent.click(screen.getByRole('button', { name: /Consultar placa/ }));
    await screen.findByText('Informações encontradas na consulta da placa');

    const cor = screen.getByLabelText('Cor');
    expect(cor).not.toHaveAttribute('readonly');
    await userEvent.type(cor, 'AZUL');
    expect(cor).toHaveValue('AZUL');
  });
});
