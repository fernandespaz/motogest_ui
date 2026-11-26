import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgendamentosPeriodo, useAtualizarStatusAgendamento } from '@/hooks/useAgenda';
import { useCriarOSAPartirDeOrcamento, useOrdensServico } from '@/hooks/useOrdensServico';
import { useTodosOrcamentos } from '@/hooks/useOrcamentos';
import { useAuthStore } from '@/store/authStore';
import { AgendaPage, horaSugerida } from './AgendaPage';

vi.mock('@/hooks/useAgenda', () => ({
  useAgendamentosPeriodo: vi.fn(),
  useAtualizarStatusAgendamento: vi.fn(),
}));
vi.mock('@/hooks/useOrdensServico', () => ({ useOrdensServico: vi.fn(), useCriarOSAPartirDeOrcamento: vi.fn() }));
vi.mock('@/hooks/useOrcamentos', () => ({ useTodosOrcamentos: vi.fn() }));
const formModal = vi.fn((_props: unknown) => null);
vi.mock('./AgendamentoFormModal', () => ({ AgendamentoFormModal: (props: unknown) => formModal(props) }));
vi.mock('@/hooks/useClientes', () => ({ useCliente: vi.fn(() => ({ data: { id: 2, nome: 'Fernanda Souza Alves' } })) }));

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

function renderPage(permissoes: string[], url = '/agenda') {
  useAuthStore.setState({ hasPermission: (c: string) => permissoes.includes(c) } as never);
  return render(
    <MemoryRouter initialEntries={[url]}>
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

  it('abre no dia de hoje (com os cards do dia) e o mês, com a contagem, fica a um clique', async () => {
    renderPage(TODAS);
    expect(screen.getByRole('button', { name: 'Calendário' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dia' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ABC1D23')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Novo agendamento/ }).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Mês' }));
    expect(screen.getByRole('button', { name: /3 agendamentos/ })).toBeInTheDocument();
  });

  it('faixa de atrasados: lista quem passou do horário sem chegar e abre o detalhe; quem já virou OS não conta', async () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    ontem.setHours(9, 0, 0, 0);
    const atrasado = { id: 40, clienteNome: 'Eva', veiculoId: 40, veiculoPlaca: 'LATE111', dataHora: ontem.toISOString(), status: 'AGENDADO', servicos: [] };
    vi.mocked(useAgendamentosPeriodo).mockReturnValue({ data: [atrasado, ...agendamentos.slice(1)], isLoading: false } as never);
    renderPage(TODAS);

    const faixa = screen.getByRole('status');
    expect(faixa).toHaveTextContent(/atrasad/);
    expect(faixa).toHaveTextContent('LATE111 · ontem 09:00');
    // XYZ9K88 (id 2) tem OS: já chegou, não é atraso
    expect(faixa).not.toHaveTextContent('XYZ9K88');

    await userEvent.click(within(faixa).getByRole('button', { name: /LATE111/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('LATE111');
  });

  it('vindo do perfil do cliente (?novoParaCliente=), abre o novo agendamento já com o cliente escolhido', async () => {
    renderPage(TODAS, '/agenda?novoParaCliente=2');
    await waitFor(() => {
      const ultimo = formModal.mock.calls.at(-1)?.[0] as { open: boolean; clientePreSelecionado?: { nome?: string } };
      expect(ultimo.open).toBe(true);
      expect(ultimo.clientePreSelecionado?.nome).toBe('Fernanda Souza Alves');
    });
  });

  it('sem AGENDA_WRITE o parâmetro ?novoParaCliente= é ignorado: o formulário não abre', () => {
    renderPage(['AGENDA_READ'], '/agenda?novoParaCliente=2');
    const ultimo = formModal.mock.calls.at(-1)?.[0] as { open: boolean };
    expect(ultimo.open).toBe(false);
  });

  it('hora sugerida: 09:00 de manhã cedo; depois das 9h, a próxima meia hora cheia', () => {
    expect(horaSugerida(new Date(2026, 10, 26, 7, 12))).toBe('09:00');
    expect(horaSugerida(new Date(2026, 10, 26, 14, 10))).toBe('14:30');
    expect(horaSugerida(new Date(2026, 10, 26, 14, 40))).toBe('15:00');
  });

  it('sem o parâmetro, a agenda não abre o formulário nem consulta cliente', () => {
    renderPage(TODAS);
    const ultimo = formModal.mock.calls.at(-1)?.[0] as { open: boolean };
    expect(ultimo.open).toBe(false);
  });

  it('sem ninguém atrasado, a faixa não aparece', () => {
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 2);
    vi.mocked(useAgendamentosPeriodo).mockReturnValue({
      data: [{ id: 50, clienteNome: 'Fê', veiculoId: 50, veiculoPlaca: 'FUT0000', dataHora: futuro.toISOString(), status: 'AGENDADO', servicos: [] }],
      isLoading: false,
    } as never);
    renderPage(TODAS);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
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
