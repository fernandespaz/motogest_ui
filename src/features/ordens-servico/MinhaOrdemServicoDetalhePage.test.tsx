import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useOrdemServico,
  useTimerStartOS,
  useTimerPauseOS,
  useTimerResumeOS,
  useAtualizarStatusOS,
} from '@/hooks/useOrdensServico';
import { useAuthStore } from '@/store/authStore';
import { MinhaOrdemServicoDetalhePage } from './MinhaOrdemServicoDetalhePage';

vi.mock('@/hooks/useOrdensServico', () => ({
  useOrdemServico: vi.fn(),
  useTimerStartOS: vi.fn(),
  useTimerPauseOS: vi.fn(),
  useTimerResumeOS: vi.fn(),
  useAtualizarStatusOS: vi.fn(),
}));
vi.mock('@/hooks/useVeiculos', () => ({ useVeiculo: vi.fn(() => ({ data: undefined })) }));
vi.mock('@/hooks/useModelosVeiculo', () => ({
  useModelosVeiculo: vi.fn(() => ({ data: { content: [] } })),
  useCreateModeloVeiculo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

// ChecklistTab/FotosTab têm suas próprias suítes — aqui só confirmamos que
// esta tela renderiza os dois, sem duplicar a lógica interna deles.
vi.mock('./ChecklistTab', () => ({ ChecklistTab: () => <div data-testid="checklist-tab" /> }));
vi.mock('./FotosTab', () => ({ FotosTab: () => <div data-testid="fotos-tab" /> }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: '7' }) };
});

const os = {
  id: 7,
  numero: 'OS-000007',
  status: 'APROVADA',
  clienteNome: 'Frota Rápida Logística Ltda',
  veiculoPlaca: 'MTG0019',
  usuarioResponsavelId: 3,
  usuarioResponsavelNome: 'Marcos Mecânico',
  observacoes: 'Barulho estranho no motor ao acelerar',
  kmEntrada: 15000,
  dataAbertura: '2026-09-10T10:00:00Z',
  dataPrevisao: '2026-09-12T18:00:00Z',
  tempoVendidoMinutos: 30,
  tempoConsumidoMinutos: 0,
  itens: [
    { id: 1, tipoItem: 'SERVICO', descricao: 'Troca de óleo', quantidade: 1, valorUnitario: 80, valorTotal: 80 },
    { id: 2, tipoItem: 'PRODUTO', descricao: 'Óleo 10W30', quantidade: 2, valorUnitario: 30, valorTotal: 60 },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <MinhaOrdemServicoDetalhePage />
    </MemoryRouter>,
  );
}

describe('MinhaOrdemServicoDetalhePage', () => {
  let timerStartMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(useOrdemServico).mockReturnValue({ data: os, isLoading: false } as never);
    timerStartMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useTimerStartOS).mockReturnValue({ mutateAsync: timerStartMutateAsync, isPending: false } as never);
    vi.mocked(useTimerPauseOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useTimerResumeOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useAtualizarStatusOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    useAuthStore.setState({ usuarioId: 3 });
  });

  it('shows the client-reported problem and the itemized services/parts as plain text', () => {
    renderPage();
    expect(screen.getByText('Barulho estranho no motor ao acelerar')).toBeInTheDocument();
    expect(screen.getByText(/Troca de óleo/)).toBeInTheDocument();
    expect(screen.getByText(/Óleo 10W30/)).toBeInTheDocument();
  });

  // O ponto de segurança central desta tela: nenhum caminho aqui deixa o
  // Mecânico alterar cliente/veículo/técnico/itens — só ChecklistTab/FotosTab
  // (que têm seus próprios inputs, legítimos) ficam interativos.
  it('never renders a control to edit cliente/veículo/técnico responsável/itens or a save action', () => {
    renderPage();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('checklist-tab')).toBeInTheDocument();
  });

  it('shows Iniciar for the assigned technician when the OS is Aprovada, and calls the timer mutation', async () => {
    renderPage();
    const botao = screen.getByRole('button', { name: /iniciar/i });
    await userEvent.click(botao);
    expect(timerStartMutateAsync).toHaveBeenCalledWith(7);
  });

  it('hides Iniciar when the OS is assigned to a different technician', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { ...os, usuarioResponsavelId: 99 },
      isLoading: false,
    } as never);
    renderPage();
    expect(screen.queryByRole('button', { name: /iniciar/i })).not.toBeInTheDocument();
  });
});
