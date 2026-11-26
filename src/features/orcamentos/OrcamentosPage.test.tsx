import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useTodosOrcamentos,
  useDeleteOrcamento,
  useEnviarOrcamento,
  useAprovarOrcamento,
  useRejeitarOrcamento,
} from '@/hooks/useOrcamentos';
import { useCriarOSAPartirDeOrcamento } from '@/hooks/useOrdensServico';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { OrcamentosPage } from './OrcamentosPage';

vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks/useOrcamentos', () => ({
  useTodosOrcamentos: vi.fn(),
  useDeleteOrcamento: vi.fn(),
  useEnviarOrcamento: vi.fn(),
  useAprovarOrcamento: vi.fn(),
  useRejeitarOrcamento: vi.fn(),
}));
vi.mock('@/hooks/useOrdensServico', () => ({ useCriarOSAPartirDeOrcamento: vi.fn() }));
vi.mock('@/features/shared/ModeloVeiculoField', () => ({
  ModeloVeiculoThumb: () => null,
  useImagensPorVeiculoId: () => new Map(),
}));

const orcamentos = [
  { id: 1, clienteNome: 'Cliente da Ana', veiculoPlaca: 'MTG0001', status: 'RASCUNHO', consultorId: 10, consultorNome: 'Ana Consultora' },
  { id: 2, clienteNome: 'Cliente do Bruno', veiculoPlaca: 'MTG0002', status: 'RASCUNHO', consultorId: 20, consultorNome: 'Bruno Consultor' },
  { id: 3, clienteNome: 'Cliente já convertido', veiculoPlaca: 'MTG0003', status: 'CONVERTIDO', consultorId: 10, consultorNome: 'Ana Consultora' },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <OrcamentosPage />
    </MemoryRouter>,
  );
}

describe('OrcamentosPage — carteira do consultor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: orcamentos, isLoading: false } as never);
    vi.mocked(useDeleteOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useEnviarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useAprovarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useRejeitarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCriarOSAPartirDeOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });

  // O ponto central: evitar que um consultor veja (e tente puxar) a carteira
  // de outro. Só um recorte de UX — GET /orcamentos não tem filtro de
  // consultor no backend, ver comentário no componente — mas já impede o
  // caso comum de simplesmente abrir a lista e ver tudo.
  it('shows a Consultor only their own orçamentos, never a colleague’s', () => {
    useAuthStore.setState({ perfil: 'Consultor Técnico', usuarioId: 10 });
    renderPage();

    expect(screen.getByText(/Cliente da Ana/)).toBeInTheDocument();
    expect(screen.queryByText(/Cliente do Bruno/)).not.toBeInTheDocument();
  });

  it('shows an Administrador every consultor’s orçamentos', () => {
    useAuthStore.setState({ perfil: 'Administrador', usuarioId: 99 });
    renderPage();

    expect(screen.getByText(/Cliente da Ana/)).toBeInTheDocument();
    expect(screen.getByText(/Cliente do Bruno/)).toBeInTheDocument();
  });

  it('still hides converted orçamentos regardless of profile', () => {
    useAuthStore.setState({ perfil: 'Administrador', usuarioId: 99 });
    renderPage();

    expect(screen.queryByText(/Cliente já convertido/)).not.toBeInTheDocument();
  });
});

describe('OrcamentosPage — aprovação direta no balcão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ perfil: 'Consultor Técnico', usuarioId: 10 });
  });

  // Todo orçamento é feito com o cliente já no balcão — pedir aprovação via
  // WhatsApp com o cliente presencial é inviável. O consultor precisa
  // aprovar direto por aqui, sem abrir o compartilhamento do link. O backend
  // só aceita aprovar a partir de ENVIADO (não existe RASCUNHO -> APROVADO
  // direto, ver openapi.json), então o botão passa por "enviar" como
  // transição interna antes de aprovar — sem chamar window.open.
  it('sends then approves a RASCUNHO in one click, without opening WhatsApp', async () => {
    const rascunho = {
      id: 1,
      clienteId: 1,
      veiculoId: 1,
      clienteNome: 'Cliente da Ana',
      veiculoPlaca: 'MTG0001',
      status: 'RASCUNHO',
      consultorId: 10,
      consultorNome: 'Ana Consultora',
    };
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: [rascunho], isLoading: false } as never);
    vi.mocked(useDeleteOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    const enviarMock = vi.fn().mockResolvedValue({ ...rascunho, id: 1, status: 'ENVIADO' });
    const aprovarMock = vi.fn().mockResolvedValue({ ...rascunho, id: 1, status: 'APROVADO' });
    vi.mocked(useEnviarOrcamento).mockReturnValue({ mutateAsync: enviarMock, isPending: false } as never);
    vi.mocked(useAprovarOrcamento).mockReturnValue({ mutateAsync: aprovarMock, isPending: false } as never);
    vi.mocked(useRejeitarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCriarOSAPartirDeOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderPage();
    await userEvent.click(screen.getByTitle('Aprovar (cliente no balcão)'));

    expect(enviarMock).toHaveBeenCalledWith(1);
    await waitFor(() => expect(aprovarMock).toHaveBeenCalledWith(1));
    expect(openSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Orçamento aprovado.'));

    openSpy.mockRestore();
  });

  const rascunho = {
    id: 1,
    clienteId: 1,
    veiculoId: 1,
    clienteNome: 'Cliente da Ana',
    veiculoPlaca: 'MTG0001',
    status: 'RASCUNHO',
    consultorId: 10,
    consultorNome: 'Ana Consultora',
  };

  it('shows a plain send error and never calls aprovar when enviar itself fails', async () => {
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: [rascunho], isLoading: false } as never);
    vi.mocked(useDeleteOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    const enviarMock = vi.fn().mockRejectedValue(new Error());
    const aprovarMock = vi.fn();
    vi.mocked(useEnviarOrcamento).mockReturnValue({ mutateAsync: enviarMock, isPending: false } as never);
    vi.mocked(useAprovarOrcamento).mockReturnValue({ mutateAsync: aprovarMock, isPending: false } as never);
    vi.mocked(useRejeitarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCriarOSAPartirDeOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    renderPage();
    await userEvent.click(screen.getByTitle('Aprovar (cliente no balcão)'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não foi possível aprovar o orçamento.'));
    expect(aprovarMock).not.toHaveBeenCalled();
  });

  // O envio já comprometeu a transição de estado no backend (a linha vira
  // ENVIADO de verdade) antes de aprovar falhar — repetir a mesma mensagem
  // genérica de "não foi possível" esconderia que só falta um segundo clique
  // (agora nos botões de Aprovar/Rejeitar do próprio ENVIADO), não que nada
  // aconteceu.
  it('tells the consultant the orçamento was already sent when only the approve step fails', async () => {
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: [rascunho], isLoading: false } as never);
    vi.mocked(useDeleteOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    const enviarMock = vi.fn().mockResolvedValue({ ...rascunho, id: 1, status: 'ENVIADO' });
    const aprovarMock = vi.fn().mockRejectedValue(new Error());
    vi.mocked(useEnviarOrcamento).mockReturnValue({ mutateAsync: enviarMock, isPending: false } as never);
    vi.mocked(useAprovarOrcamento).mockReturnValue({ mutateAsync: aprovarMock, isPending: false } as never);
    vi.mocked(useRejeitarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCriarOSAPartirDeOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    renderPage();
    await userEvent.click(screen.getByTitle('Aprovar (cliente no balcão)'));

    await waitFor(() => expect(aprovarMock).toHaveBeenCalledWith(1));
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Orçamento enviado, mas não foi possível aprovar automaticamente'),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  // Orçamento criado "ainda não cadastrado" (sem clienteId/veiculoId): o backend recusa enviar/aprovar com 422.
  // A tela explica e leva direto pro orçamento em vez de disparar a chamada que vai falhar.
  it('does not call enviar for a rascunho without registered client, and explains how to proceed', async () => {
    const semCadastro = { id: 5, clienteNome: 'Maria', veiculoPlaca: 'ABC1D23', status: 'RASCUNHO', consultorId: 10, consultorNome: 'Ana' };
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: [semCadastro], isLoading: false } as never);
    vi.mocked(useDeleteOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    const enviarMock = vi.fn();
    vi.mocked(useEnviarOrcamento).mockReturnValue({ mutateAsync: enviarMock, isPending: false } as never);
    vi.mocked(useAprovarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useRejeitarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCriarOSAPartirDeOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    renderPage();
    expect(screen.getByText('Sem cadastro')).toBeInTheDocument();
    await userEvent.click(screen.getByTitle('Aprovar (cliente no balcão)'));

    expect(enviarMock).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Vincule um cliente'));
  });

  // Ações de linha (Aprovar/Rejeitar/PDF/etc.) usam o mesmo padrão de ícone
  // do resto do app (IconActionButton) — Button fica reservado só para ações
  // definitivas de página/formulário (Salvar, Concluir, Cancelar).
  it('renders the Aprovar action as an accessible icon button with the success tone', () => {
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: [rascunho], isLoading: false } as never);
    vi.mocked(useDeleteOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useEnviarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useAprovarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useRejeitarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCriarOSAPartirDeOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    renderPage();

    const botaoAprovar = screen.getByTitle('Aprovar (cliente no balcão)');
    expect(botaoAprovar.tagName).toBe('BUTTON');
    expect(botaoAprovar.className).toContain('bg-success');
  });
});

describe('OrcamentosPage — paginação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDeleteOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useEnviarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useAprovarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useRejeitarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCriarOSAPartirDeOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    useAuthStore.setState({ perfil: 'Administrador', usuarioId: 99 });
  });

  // Bug real reportado: filtrar (convertido + carteira do consultor) DEPOIS
  // de o backend já ter paginado quebrava a contagem por página — uma
  // sobrava com 2 itens, a seguinte com 5. useTodosOrcamentos busca tudo de
  // uma vez, então a paginação abaixo é local e sempre entrega páginas
  // cheias (exceto a última).
  it('fills each page with a full 20 items, computed after filtering out convertidos', () => {
    const muitos = Array.from({ length: 45 }, (_, i) => ({
      id: i + 1,
      clienteNome: `Cliente ${i + 1}`,
      veiculoPlaca: 'MTG0001',
      status: i % 5 === 0 ? 'CONVERTIDO' : 'RASCUNHO', // 9 convertidos, 36 válidos
      consultorId: 99,
      consultorNome: 'Admin',
    }));
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: muitos, isLoading: false } as never);
    renderPage();

    // 36 orçamentos válidos / 20 por página = página cheia de 20, não uma
    // contagem arbitrária vinda de uma página do servidor já filtrada.
    expect(screen.getByText('36 registros')).toBeInTheDocument();
    expect(screen.getAllByText(/^Cliente \d+ —/)).toHaveLength(20);
  });

  it('clamps back to the last valid page when the filtered list shrinks under the stored page', async () => {
    const vinteECinco = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      clienteNome: `Cliente ${i + 1}`,
      veiculoPlaca: 'MTG0001',
      status: 'RASCUNHO',
      consultorId: 99,
      consultorNome: 'Admin',
    }));
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: vinteECinco, isLoading: false } as never);
    const { rerender } = renderPage();

    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText(/^Cliente 21 —/)).toBeInTheDocument();

    // Uma exclusão (ou o filtro de carteira) derruba a lista pra 1 item só —
    // sem o clamp, a página 2 guardada em estado mostraria "nenhum encontrado"
    // em vez de voltar pra uma página que existe.
    vi.mocked(useTodosOrcamentos).mockReturnValue({
      data: [vinteECinco[0]],
      isLoading: false,
    } as never);
    rerender(
      <MemoryRouter>
        <OrcamentosPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/^Cliente 1 —/)).toBeInTheDocument();
    expect(screen.queryByText('Nenhum orçamento cadastrado')).not.toBeInTheDocument();
  });
});

describe('OrcamentosPage — busca, etapas e rejeição', () => {
  const lista = [
    { id: 1, clienteNome: 'Ana Souza', veiculoPlaca: 'AAA1A11', status: 'RASCUNHO', consultorId: 10 },
    { id: 2, clienteNome: 'Bruno Lima', veiculoPlaca: 'BBB2B22', status: 'ENVIADO', consultorId: 10 },
    { id: 3, clienteNome: 'Carla Dias', veiculoPlaca: 'CCC3C33', status: 'APROVADO', consultorId: 10 },
  ];
  const rejeitarMock = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ perfil: 'Administrador', usuarioId: 1 });
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: lista, isLoading: false } as never);
    vi.mocked(useDeleteOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useEnviarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useAprovarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useRejeitarOrcamento).mockReturnValue({ mutateAsync: rejeitarMock, isPending: false } as never);
    vi.mocked(useCriarOSAPartirDeOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });

  it('filtros de etapa mostram a contagem e recortam a lista', async () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Todos \(3\)/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Aprovado \(1\)/ }));
    expect(screen.getByText(/Carla Dias/)).toBeInTheDocument();
    expect(screen.queryByText(/Ana Souza/)).not.toBeInTheDocument();
  });

  it('busca por nome, placa ou número, sem diferenciar acento/maiúscula; sem resultado oferece limpar filtros', async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nº, cliente ou placa/), 'bbb2');
    expect(screen.getByText(/Bruno Lima/)).toBeInTheDocument();
    expect(screen.queryByText(/Ana Souza/)).not.toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText(/Buscar por nº, cliente ou placa/));
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nº, cliente ou placa/), 'zzz');
    expect(screen.getByText('Nenhum orçamento encontrado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText(/Ana Souza/)).toBeInTheDocument();
  });

  it('rejeitar pede confirmação antes de chamar a API', async () => {
    renderPage();
    await userEvent.click(screen.getByTitle('Rejeitar'));
    expect(rejeitarMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Rejeitar o orçamento #2/)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rejeitar' }));
    await waitFor(() => expect(rejeitarMock).toHaveBeenCalledWith(2));
  });

  it('sem nenhum orçamento, o estado vazio traz o botão de criar o primeiro', () => {
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: [], isLoading: false } as never);
    renderPage();
    expect(screen.getByText('Crie o primeiro orçamento para começar a cotar.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Novo orçamento/ }).length).toBeGreaterThanOrEqual(2);
  });
});

describe('OrcamentosPage — busca não casa campos vazios', () => {
  it('digitar "und" não acha orçamentos só porque o interessado/placa estão vazios', async () => {
    vi.clearAllMocks();
    useAuthStore.setState({ perfil: 'Administrador', usuarioId: 1 });
    vi.mocked(useTodosOrcamentos).mockReturnValue({
      data: [{ id: 1, clienteNome: 'Ana Souza', status: 'RASCUNHO', consultorId: 10 }],
      isLoading: false,
    } as never);
    vi.mocked(useDeleteOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useEnviarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useAprovarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useRejeitarOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCriarOSAPartirDeOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nº, cliente ou placa/), 'und');
    expect(screen.getByText('Nenhum orçamento encontrado')).toBeInTheDocument();
  });
});
