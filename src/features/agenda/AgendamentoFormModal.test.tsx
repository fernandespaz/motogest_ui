import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useClientes, useVeiculosDoCliente } from '@/hooks/useClientes';
import { useCreateAgendamento, useUpdateAgendamento } from '@/hooks/useAgenda';
import { useTodosServicos } from '@/hooks/useServicos';
import { toast } from '@/store/toastStore';
import { AgendamentoFormModal } from './AgendamentoFormModal';

vi.mock('@/hooks/useAgenda', () => ({ useCreateAgendamento: vi.fn(), useUpdateAgendamento: vi.fn() }));
vi.mock('@/hooks/useClientes', () => ({ useClientes: vi.fn(), useVeiculosDoCliente: vi.fn() }));
vi.mock('@/hooks/useServicos', () => ({ useTodosServicos: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
// O cadastro de cliente tem teste próprio — aqui só importa como o agendamento o abre e reage ao cliente criado.
vi.mock('@/features/clientes/ClienteFormModal', () => ({
  ClienteFormModal: ({ open, onCriado }: { open: boolean; onCriado?: (c: unknown) => void }) =>
    open ? (
      <div>
        Cadastro de cliente
        <button onClick={() => onCriado?.({ id: 9, nome: 'Cliente Recém Criado', veiculos: [{ id: 90 }] })}>
          Simular cadastro
        </button>
      </div>
    ) : null,
}));

const servicos = [
  { id: 1, nome: 'Troca de óleo do motor', sistema: 'Revisões', categoria: 'A', tempoMinHoras: 0.5, tempoMaxHoras: 0.5, ativo: true },
  { id: 2, nome: 'Troca pastilhas dianteiras', sistema: 'Freios', categoria: 'A', tempoMinHoras: 1, tempoMaxHoras: 1, ativo: true },
  { id: 3, nome: 'Serviço desativado', sistema: 'Motor', categoria: 'B', tempoMinHoras: 1, tempoMaxHoras: 1, ativo: false },
  { id: 4, nome: 'Troca kit correia dentada', sistema: 'Motor', categoria: 'B', tempoMinHoras: 2, tempoMaxHoras: 3, ativo: true },
  { id: 5, nome: 'Troca óleo câmbio automático', sistema: 'Transmissão', categoria: 'B', tempoMinHoras: 1, tempoMaxHoras: 1, ativo: true },
];
const veiculoA = { id: 50, placa: 'AAA1A11', marca: 'VW', modelo: 'Gol', categoria: 'A' };
const veiculoB = { id: 51, placa: 'BBB2B22', marca: 'Jeep', modelo: 'Compass', categoria: 'B' };

async function escolherCliente() {
  await userEvent.click(screen.getByPlaceholderText('Buscar cliente pelo nome...'));
  await userEvent.click(await screen.findByRole('button', { name: /Carlos Eduardo/ }));
}

let veiculosDoCliente: (typeof veiculoA)[] = [];

describe('AgendamentoFormModal', () => {
  beforeEach(() => {
    useAuthStore.setState({ hasPermission: () => false } as never);
    vi.mocked(useClientes).mockReturnValue({ data: { content: [{ id: 1, nome: 'Carlos Eduardo' }] } } as never);
    veiculosDoCliente = [veiculoB];
    vi.mocked(useVeiculosDoCliente).mockImplementation(((id?: number) => ({ data: id ? veiculosDoCliente : undefined })) as never);
    vi.mocked(useTodosServicos).mockReturnValue({ data: servicos, isLoading: false } as never);
    vi.mocked(useCreateAgendamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useUpdateAgendamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(toast.info).mockClear();
  });

  it('offers "Novo cliente" only to profiles that can register clients', () => {
    const { rerender } = render(<AgendamentoFormModal open onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Novo cliente/ })).not.toBeInTheDocument();

    useAuthStore.setState({ hasPermission: (c: string) => c === 'CLIENTE_WRITE' } as never);
    rerender(<AgendamentoFormModal open onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Novo cliente/ })).toBeInTheDocument();
  });

  it('opens the client registration and selects the new client afterwards, even if the search list lacks it', async () => {
    useAuthStore.setState({ hasPermission: (c: string) => c === 'CLIENTE_WRITE' } as never);
    render(<AgendamentoFormModal open onClose={vi.fn()} />);

    expect(screen.queryByText('Cadastro de cliente')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Novo cliente/ }));
    expect(screen.getByText('Cadastro de cliente')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Simular cadastro' }));

    expect(screen.getByDisplayValue('Cliente Recém Criado')).toBeInTheDocument();
  });

  it('asks for the vehicle before listing any service', () => {
    render(<AgendamentoFormModal open onClose={vi.fn()} />);
    expect(screen.getByText('Escolha o veículo para ver os serviços')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('lists only the active services of the vehicle’s category, with a way to see them all', async () => {
    render(<AgendamentoFormModal open onClose={vi.fn()} />);
    await escolherCliente();

    // Um único veículo (categoria B) já vem selecionado.
    expect(screen.getByRole('checkbox', { name: /kit correia dentada/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /óleo câmbio automático/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /óleo do motor/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Serviço desativado')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver todas as categorias' }));
    expect(screen.getByRole('checkbox', { name: /óleo do motor/ })).toBeInTheDocument();
  });

  it('drops already chosen services of another category when the vehicle changes, and says so', async () => {
    veiculosDoCliente = [veiculoA, veiculoB];
    render(<AgendamentoFormModal open onClose={vi.fn()} />);
    await escolherCliente();

    await userEvent.selectOptions(screen.getByLabelText(/^Veículo/), '50');
    await userEvent.click(screen.getByRole('checkbox', { name: /óleo do motor/ }));
    expect(screen.getByRole('button', { name: 'Remover Troca de óleo do motor' })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/^Veículo/), '51');

    expect(screen.queryByRole('button', { name: 'Remover Troca de óleo do motor' })).not.toBeInTheDocument();
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('categoria B'));
  });

  it('requires a client, a vehicle, a date and at least one service before saving', async () => {
    render(<AgendamentoFormModal open onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Selecione o cliente')).toBeInTheDocument();
    expect(screen.getByText('Selecione o veículo')).toBeInTheDocument();
    expect(screen.getByText('Informe a data e a hora')).toBeInTheDocument();
    expect(screen.getByText('Selecione ao menos um serviço')).toBeInTheDocument();
  });

  it('fills the date with the "Hoje" shortcut, keeping the default time', async () => {
    render(<AgendamentoFormModal open onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Hoje' }));

    expect(screen.getByLabelText(/^Hora/)).toHaveValue('08:00');
    expect(screen.getByRole('button', { name: 'Hoje' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the observation behind a link until the user asks for it', async () => {
    render(<AgendamentoFormModal open onClose={vi.fn()} />);
    expect(screen.queryByLabelText('Observações')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Adicionar observação/ }));
    expect(screen.getByLabelText('Observações')).toBeInTheDocument();
  });
});

