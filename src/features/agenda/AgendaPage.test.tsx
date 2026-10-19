import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgendamentosPeriodo, useAtualizarStatusAgendamento } from '@/hooks/useAgenda';
import { useCriarOSAPartirDeOrcamento, useOrdensServico } from '@/hooks/useOrdensServico';
import { useTodosOrcamentos } from '@/hooks/useOrcamentos';
import { useAuthStore } from '@/store/authStore';
import { AgendaPage } from './AgendaPage';

vi.mock('@/hooks/useAgenda', () => ({
  useAgendamentosPeriodo: vi.fn(),
  useAtualizarStatusAgendamento: vi.fn(),
}));
vi.mock('@/hooks/useOrdensServico', () => ({ useOrdensServico: vi.fn(), useCriarOSAPartirDeOrcamento: vi.fn() }));
vi.mock('@/hooks/useOrcamentos', () => ({ useTodosOrcamentos: vi.fn() }));
vi.mock('./AgendamentoFormModal', () => ({ AgendamentoFormModal: () => null }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mutateAsync = vi.fn();
const criarOs = vi.fn();
const hoje = new Date();
hoje.setHours(10, 0, 0, 0);
const HOJE = hoje.toISOString();

const agendamentos = [
  // Sem orçamento → próximo passo: criar orçamento
  { id: 1, clienteNome: 'Ana', veiculoId: 10, veiculoPlaca: 'ABC1D23', dataHora: HOJE, status: 'AGENDADO', servicos: [{ id: 1, nome: 'Troca de óleo' }] },
  // Orçamento → OS aguardando peça (técnico já pediu peça)
  { id: 2, clienteNome: 'Beto', veiculoId: 11, veiculoPlaca: 'XYZ9K88', dataHora: HOJE, status: 'AGENDADO', servicos: [] },
  // Orçamento aprovado, OS ainda não gerada → próximo passo: gerar OS
  { id: 3, clienteNome: 'Caio', veiculoId: 12, veiculoPlaca: 'KLM4N55', dataHora: HOJE, status: 'CONFIRMADO', servicos: [] },
];
const orcamentos = [
  { id: 20, agendamentoId: 2, status: 'CONVERTIDO' },
  { id: 30, agendamentoId: 3, status: 'APROVADO' },
];
const ordens = [
  { id: 9, numero: 'OS-9', orcamentoId: 20, veiculoId: 11, status: 'AGUARDANDO_PECA', usuarioResponsavelId: 7, usuarioResponsavelNome: 'Zé Mecânico', dataAbertura: HOJE },
  // Cliente que chegou sem agendar
  { id: 10, numero: 'OS-10', veiculoId: 99, veiculoPlaca: 'WLK0A00', clienteNome: 'Dora', status: 'APROVADA', dataAbertura: HOJE },
];

const TODAS = ['AGENDA_READ', 'AGENDA_WRITE', 'ORCAMENTO_READ', 'ORCAMENTO_WRITE', 'ORDEM_SERVICO_READ'];

function renderPage(permissoes: string[]) {
  useAuthStore.setState({ hasPermission: (c: string) => permissoes.includes(c) } as never);
  return render(
    <MemoryRouter>
      <AgendaPage />
    </MemoryRouter>,
  );
}

async function abrirQuadro() {
  await userEvent.click(screen.getByRole('button', { name: /Quadro/ }));
}

describe('AgendaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue({});
    criarOs.mockResolvedValue({ id: 55, numero: 'OS-55', status: 'APROVADA' });
    vi.mocked(useAgendamentosPeriodo).mockReturnValue({ data: agendamentos, isLoading: false } as never);
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: ordens } } as never);
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: orcamentos } as never);
    vi.mocked(useAtualizarStatusAgendamento).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useCriarOSAPartirDeOrcamento).mockReturnValue({ mutateAsync: criarOs, isPending: false } as never);
  });

  it('mostra o calendário com a contagem do dia e abas Calendário/Quadro', () => {
    renderPage(TODAS);
    expect(screen.getByRole('button', { name: 'Calendário' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3 agendamentos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo agendamento/ })).toBeInTheDocument();
  });

  it('quadro: Agendado, Na fila (inclui cliente sem agendamento), Aguardando peças — somente leitura', async () => {
    renderPage(TODAS);
    await abrirQuadro();
    expect(within(screen.getByRole('region', { name: 'Agendado' })).getByText('ABC1D23')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Agendado' })).getByText('KLM4N55')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Na fila' })).getByText('WLK0A00')).toBeInTheDocument();
    const pecas = screen.getByRole('region', { name: 'Aguardando peças' });
    expect(within(pecas).getByText('XYZ9K88')).toBeInTheDocument();
    expect(within(pecas).getByText('Zé Mecânico')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mover/)).not.toBeInTheDocument();
    expect(document.querySelector('[draggable="true"]')).toBeNull();
  });

  it('agendamento sem orçamento: "Criar orçamento" leva ao orçamento já vinculado ao agendamento', async () => {
    renderPage(TODAS);
    await abrirQuadro();
    await userEvent.click(within(screen.getByRole('region', { name: 'Agendado' })).getByText('ABC1D23'));
    expect(screen.queryByRole('button', { name: 'Iniciar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Criar orçamento' }));
    expect(mockNavigate).toHaveBeenCalledWith('/orcamentos/novo?agendamentoId=1');
  });

  it('orçamento aprovado sem OS: "Gerar OS" converte o orçamento (OS entra na fila do técnico)', async () => {
    renderPage(TODAS);
    await abrirQuadro();
    await userEvent.click(within(screen.getByRole('region', { name: 'Agendado' })).getByText('KLM4N55'));
    await userEvent.click(screen.getByRole('button', { name: 'Gerar OS' }));
    expect(criarOs).toHaveBeenCalledWith({ orcamentoId: 30 });
  });

  it('com OS o próximo passo é abrir a OS', async () => {
    renderPage(TODAS);
    await abrirQuadro();
    await userEvent.click(within(screen.getByRole('region', { name: 'Aguardando peças' })).getByText('XYZ9K88'));
    await userEvent.click(screen.getByRole('button', { name: 'Abrir OS' }));
    expect(mockNavigate).toHaveBeenCalledWith('/ordens-servico/9');
  });

  it('confirmar chama o PATCH de status; sem AGENDA_WRITE não há Editar/Confirmar/Cancelar', async () => {
    renderPage(TODAS);
    await abrirQuadro();
    await userEvent.click(within(screen.getByRole('region', { name: 'Agendado' })).getByText('ABC1D23'));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(mutateAsync).toHaveBeenCalledWith({ id: 1, status: 'CONFIRMADO' });
  });

  it('sem AGENDA_WRITE nem ORCAMENTO_WRITE: só leitura, sem ações de fluxo', async () => {
    renderPage(['AGENDA_READ']);
    expect(screen.queryByRole('button', { name: /Novo agendamento/ })).not.toBeInTheDocument();
    await abrirQuadro();
    await userEvent.click(within(screen.getByRole('region', { name: 'Agendado' })).getByText('ABC1D23'));
    for (const nome of ['Confirmar', 'Editar', 'Cancelar', 'Criar orçamento']) {
      expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument();
    }
  });

  it('sem ORDEM_SERVICO_READ / ORCAMENTO_READ as consultas ficam desligadas', () => {
    renderPage(['AGENDA_READ']);
    expect(useOrdensServico).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: false }));
    expect(useTodosOrcamentos).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false }));
  });
});
