import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateOrcamento, useOrcamento, useUpdateOrcamento } from '@/hooks/useOrcamentos';
import { useClientes, useVeiculosDoCliente } from '@/hooks/useClientes';
import { useAgendamento } from '@/hooks/useAgenda';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { OrcamentoFormPage } from './OrcamentoFormPage';

vi.mock('@/hooks/useOrcamentos', () => ({
  useOrcamento: vi.fn(),
  useCreateOrcamento: vi.fn(),
  useUpdateOrcamento: vi.fn(),
  useConcluirCadastroOrcamento: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/hooks/useAgenda', () => ({ useAgendamento: vi.fn(() => ({ data: undefined })) }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('@/hooks/useClientes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useClientes')>();
  return { ...actual, useClientes: vi.fn(), useVeiculosDoCliente: vi.fn() };
});
// Complexo o bastante (catálogo, estoque, hora técnica) pra ter suíte própria
// — aqui só interessa que o formulário ao redor dele renderiza certo.
vi.mock('@/features/shared/ItemsEditor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/shared/ItemsEditor')>();
  return { ...actual, ItemsEditor: () => <div data-testid="items-editor" /> };
});
vi.mock('@/features/shared/HoraTecnicaReferencia', () => ({ HoraTecnicaReferencia: () => null }));
// three.js não roda no jsdom (sem WebGL) e o import real deixaria cada render da página lento.
vi.mock('@/features/vistoria/VistoriaViewer', () => ({ default: () => <div data-testid="viewer" /> }));
// A seção do veículo avulso usa a consulta de placa (carteira, cobrança): aqui ela está sempre indisponível.
vi.mock('@/hooks/usePlacas', () => {
  const mutacao = () => ({ mutateAsync: vi.fn(), isPending: false, data: undefined, reset: vi.fn() });
  return {
    useCarteiraPlacas: () => ({ data: undefined }),
    useConsultarPlaca: mutacao,
    useConsultarChassi: mutacao,
  };
});
vi.mock('@/features/shared/ModeloVeiculoField', () => ({
  ModeloVeiculoField: () => null,
  ModeloVeiculoThumb: () => null,
  useModeloVeiculoImagem: () => undefined,
}));

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/orcamentos/novo" element={<OrcamentoFormPage />} />
        <Route path="/orcamentos/:id" element={<OrcamentoFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrcamentoFormPage — campo Consultor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    useAuthStore.setState({ nome: 'Ana Consultora', perfil: 'Consultor Técnico', usuarioId: 10, hasPermission: () => true });
    vi.mocked(useCreateOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useClientes).mockReturnValue({ data: { content: [] }, isFetching: false } as never);
    vi.mocked(useVeiculosDoCliente).mockReturnValue({ data: [] } as never);
  });

  // O backend atribui o consultor pelo token de quem cria (OrcamentoRequest
  // não tem esse campo, ver openapi.json) — não dá pra mandar o usuário
  // escolher/editar. Mostra quem está logado agora como um preview de quem
  // vai ficar registrado como consultor ao salvar. Fica no subtítulo da
  // página (não na grade de campos) — colocá-lo como mais um campo do grid
  // ao lado de inputs de verdade bagunçava o pareamento das outras colunas.
  it('shows the logged-in user as the consultor for a brand-new orçamento', () => {
    vi.mocked(useOrcamento).mockReturnValue({ data: undefined, isLoading: false } as never);
    renderPage('/orcamentos/novo');

    expect(screen.getByText('Consultor: Ana Consultora')).toBeInTheDocument();
  });

  // Editando, mostra quem de fato criou o orçamento (dado do backend) — pode
  // ser outra pessoa além de quem está editando agora.
  it('shows the orçamento’s actual consultor when editing, even if a different user is logged in', () => {
    vi.mocked(useOrcamento).mockReturnValue({
      data: { id: 5, status: 'RASCUNHO', consultorNome: 'Bruno Consultor', itens: [] },
      isLoading: false,
    } as never);
    renderPage('/orcamentos/5');

    expect(screen.getByText(/^Consultor: Bruno Consultor/)).toBeInTheDocument();
    expect(screen.queryByText(/Ana Consultora/)).not.toBeInTheDocument();
  });

  it('falls back to an em dash when the orçamento has no consultor on record', () => {
    vi.mocked(useOrcamento).mockReturnValue({
      data: { id: 5, status: 'RASCUNHO', consultorNome: undefined, itens: [] },
      isLoading: false,
    } as never);
    renderPage('/orcamentos/5');

    expect(screen.getByText('Consultor: —')).toBeInTheDocument();
  });
});

describe('OrcamentoFormPage — carteira do consultor (bloqueio por URL direta)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.mocked(useCreateOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useClientes).mockReturnValue({ data: { content: [] }, isFetching: false } as never);
    vi.mocked(useVeiculosDoCliente).mockReturnValue({ data: [] } as never);
  });

  // A lista já esconde o orçamento de outro consultor, mas isso não impede
  // colar o id direto na URL — este é o segundo passo do mesmo recorte de
  // UX (ver comentário em OrcamentosPage: sem controle de acesso real no
  // backend pra ORCAMENTO_READ, isso continua sendo contornável fora da UI).
  it('redirects a Consultor away from a colleague’s orçamento opened by id', () => {
    useAuthStore.setState({ nome: 'Ana Consultora', perfil: 'Consultor Técnico', usuarioId: 10, hasPermission: () => true });
    vi.mocked(useOrcamento).mockReturnValue({
      data: { id: 5, status: 'RASCUNHO', consultorId: 20, consultorNome: 'Bruno Consultor', itens: [] },
      isLoading: false,
    } as never);

    renderPage('/orcamentos/5');

    expect(mockNavigate).toHaveBeenCalledWith('/orcamentos', { replace: true });
    expect(toast.error).toHaveBeenCalledWith('Este orçamento pertence a outro consultor.');
  });

  it('does not redirect a Consultor away from their own orçamento', () => {
    useAuthStore.setState({ nome: 'Ana Consultora', perfil: 'Consultor Técnico', usuarioId: 10, hasPermission: () => true });
    vi.mocked(useOrcamento).mockReturnValue({
      data: { id: 5, status: 'RASCUNHO', consultorId: 10, consultorNome: 'Ana Consultora', itens: [] },
      isLoading: false,
    } as never);

    renderPage('/orcamentos/5');

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('never redirects an Administrador away from any orçamento', () => {
    useAuthStore.setState({ nome: 'Admin', perfil: 'Administrador', usuarioId: 99, hasPermission: () => true });
    vi.mocked(useOrcamento).mockReturnValue({
      data: { id: 5, status: 'RASCUNHO', consultorId: 20, consultorNome: 'Bruno Consultor', itens: [] },
      isLoading: false,
    } as never);

    renderPage('/orcamentos/5');

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('OrcamentoFormPage — avarias da vistoria de entrada', () => {
  const orcamentoComAvaria = {
    id: 5,
    status: 'RASCUNHO',
    clienteId: 1,
    veiculoId: 2,
    validadeDias: 7,
    itens: [{ id: 1, tipoItem: 'SERVICO', descricao: 'Troca de óleo', quantidade: 1, valorUnitario: 50 }],
    avarias: [
      { id: 9, zona: 'CAPO', tipo: 'AMASSADO', descricao: 'amassado fundo', vista: 'TOPO', posicao: { x: 0, y: 0.9, z: 1.2 } },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ nome: 'Admin', perfil: 'Administrador', usuarioId: 1, hasPermission: () => true });
    vi.mocked(useCreateOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useClientes).mockReturnValue({ data: { content: [] }, isFetching: false } as never);
    vi.mocked(useVeiculosDoCliente).mockReturnValue({ data: [] } as never);
  });

  it('carrega as avarias do orçamento salvo na lista da vistoria', async () => {
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({ data: orcamentoComAvaria, isLoading: false } as never);
    renderPage('/orcamentos/5');

    await waitFor(() => expect(screen.getByLabelText('Região da avaria 1')).toHaveValue('CAPO'));
    expect(screen.getByLabelText('Tipo da avaria 1')).toHaveValue('AMASSADO');
    expect(screen.getByLabelText('Detalhes da avaria 1')).toHaveValue('amassado fundo');
  });

  // Schema presente não prova persistência (prohibited-actions #5): isto garante ao menos que o payload sai completo.
  it('envia as avarias (sem id) no payload ao salvar', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({ data: orcamentoComAvaria, isLoading: false } as never);
    renderPage('/orcamentos/5');
    await waitFor(() => expect(screen.getByLabelText('Região da avaria 1')).toHaveValue('CAPO'));

    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    const { payload } = mutateAsync.mock.calls[0][0];
    expect(payload.avarias).toEqual([
      { zona: 'CAPO', tipo: 'AMASSADO', descricao: 'amassado fundo', vista: 'TOPO', posicao: { x: 0, y: 0.9, z: 1.2 }, fotoId: undefined },
    ]);
    expect(payload.avarias[0]).not.toHaveProperty('id');
  });

  // O backend grava agendamento = null quando o PUT não traz agendamentoId: editar o orçamento não pode desfazer o vínculo com a Agenda.
  it('preserva o vínculo com o agendamento ao salvar alterações', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({ data: { ...orcamentoComAvaria, agendamentoId: 77 }, isLoading: false } as never);
    renderPage('/orcamentos/5');
    await waitFor(() => expect(screen.getByLabelText('Região da avaria 1')).toHaveValue('CAPO'));

    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0].payload.agendamentoId).toBe(77);
  });

  // Orçamento "ainda não cadastrado": a resposta não traz clienteId/veiculoId, só os dados avulsos.
  const orcamentoSemCadastro = {
    id: 8,
    status: 'RASCUNHO',
    clienteNome: 'Maria Interessada',
    validadeDias: 7,
    interessadoNome: 'Maria Interessada',
    interessadoTelefone: '(11) 98888-7777',
    veiculoCategoria: 'B',
    veiculoDescricao: 'Honda CG 160',
    itens: [{ id: 1, tipoItem: 'SERVICO', descricao: 'Troca de óleo', quantidade: 1, valorUnitario: 50 }],
  };

  it('abre um orçamento sem cadastro no modo "ainda não cadastrado" e salva só os dados do interessado (backend dá 422 se vier cliente junto)', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({ data: orcamentoSemCadastro, isLoading: false } as never);
    renderPage('/orcamentos/8');

    await waitFor(() => expect(screen.getByLabelText(/Nome do cliente/)).toHaveValue('Maria Interessada'));
    expect(screen.getByLabelText(/^Categoria/)).toHaveValue('B');
    expect(screen.queryByText('Buscar por nome ou CPF/CNPJ...')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    const { payload } = mutateAsync.mock.calls[0][0];
    expect(payload).toMatchObject({ interessadoNome: 'Maria Interessada', veiculoCategoria: 'B', veiculoDescricao: 'Honda CG 160' });
    expect(payload.clienteId).toBeUndefined();
    expect(payload.veiculoId).toBeUndefined();
    expect(payload).not.toHaveProperty('modo');
  });

  it('sem cadastro, o veículo tem os mesmos campos do cadastro (placa em destaque, marca, modelo, anos, cor, chassi) e vão ao backend', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({
      data: { ...orcamentoSemCadastro, veiculoPlaca: 'abc1d23', veiculoMarca: 'Honda', veiculoModelo: 'CG 160', veiculoAnoFabricacao: 2019, veiculoCor: 'Preta', veiculoChassi: '9C2KC1670KR000001' },
      isLoading: false,
    } as never);
    renderPage('/orcamentos/8');

    expect(await screen.findByLabelText('Placa')).toHaveValue('abc1d23');
    for (const rotulo of [/^Marca/, /^Modelo/, /^Cor/, /^Chassi/, /^Ano de fabricação/, /^Ano do modelo/]) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument();
    }
    expect(screen.getByLabelText(/^Marca/)).toHaveValue('Honda');
    expect(screen.getByLabelText(/^Chassi/)).toHaveValue('9C2KC1670KR000001');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    const { payload } = mutateAsync.mock.calls[0][0];
    expect(payload).toMatchObject({
      veiculoMarca: 'Honda',
      veiculoModelo: 'CG 160',
      veiculoAnoFabricacao: 2019,
      veiculoCor: 'Preta',
      veiculoChassi: '9C2KC1670KR000001',
      veiculoDescricao: 'Honda CG 160',
    });
  });

  it('não salva sem cadastro se faltar o nome ou a categoria do veículo', async () => {
    const mutateAsync = vi.fn();
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({
      data: { ...orcamentoSemCadastro, interessadoNome: '', veiculoCategoria: undefined },
      isLoading: false,
    } as never);
    renderPage('/orcamentos/8');
    await waitFor(() => expect(screen.getByLabelText(/Nome do cliente/)).toBeInTheDocument());

    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Informe o nome do cliente')).toBeInTheDocument();
    expect(screen.getByText('Informe a categoria do veículo')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('ao escolher "Cliente cadastrado" num orçamento sem cadastro mostra os campos de vínculo e preserva o que foi digitado', async () => {
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({ data: orcamentoSemCadastro, isLoading: false } as never);
    renderPage('/orcamentos/8');
    await waitFor(() => expect(screen.getByLabelText(/Nome do cliente/)).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Cliente cadastrado/ }));
    expect(screen.queryByLabelText(/Nome do cliente/)).not.toBeInTheDocument();
    expect(screen.getByText('Escolha o cliente e o veículo cadastrados e salve — os itens do orçamento são mantidos.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ainda não cadastrado/ }));
    expect(screen.getByLabelText(/Nome do cliente/)).toHaveValue('Maria Interessada');
  });

  it('rascunho salvo sem cadastro oferece "Concluir cadastro" e abre o painel já preenchido', async () => {
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({ data: orcamentoSemCadastro, isLoading: false } as never);
    renderPage('/orcamentos/8');

    await userEvent.setup().click(await screen.findByRole('button', { name: /Concluir cadastro/ }));
    expect(await screen.findByRole('heading', { name: 'Concluir cadastro' })).toBeInTheDocument();
  });

  it('sem permissão de escrever cliente e veículo, não oferece "Concluir cadastro"', async () => {
    useAuthStore.setState({ hasPermission: (p: string) => p !== 'CLIENTE_WRITE' } as never);
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({ data: orcamentoSemCadastro, isLoading: false } as never);
    renderPage('/orcamentos/8');

    await waitFor(() => expect(screen.getByLabelText(/Nome do cliente/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Concluir cadastro/ })).not.toBeInTheDocument();
  });

  it('vindo da Agenda (?agendamentoId=) pré-preenche cliente/veículo, mostra a origem e envia o vínculo', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 9 });
    vi.mocked(useCreateOrcamento).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({ data: undefined, isLoading: false } as never);
    vi.mocked(useAgendamento).mockReturnValue({
      data: { id: 7, clienteId: 1, clienteNome: 'Ana', veiculoId: 2, veiculoPlaca: 'ABC1D23', dataHora: '2026-10-20T10:00:00', servicos: [{ id: 1, nome: 'Troca de óleo' }] },
    } as never);
    renderPage('/orcamentos/novo?agendamentoId=7');

    expect(await screen.findByText(/Orçamento do agendamento de .* ABC1D23/)).toBeInTheDocument();
    expect(screen.getByText(/Serviços agendados: Troca de óleo/)).toBeInTheDocument();
    expect(useAgendamento).toHaveBeenCalledWith(7);
  });

  it('vindo do perfil do cliente (?clienteId=&clienteNome=&veiculoId=) já abre com cliente e veículo escolhidos', async () => {
    vi.mocked(useOrcamento).mockReturnValue({ data: undefined, isLoading: false } as never);
    vi.mocked(useAgendamento).mockReturnValue({ data: undefined } as never);
    vi.mocked(useVeiculosDoCliente).mockReturnValue({ data: [{ id: 9, placa: 'ABC1D23', marca: 'VW', modelo: 'Gol' }] } as never);
    renderPage('/orcamentos/novo?clienteId=5&clienteNome=Ana%20Souza&veiculoId=9');

    // o cliente chega pelo parâmetro (a lista paginada não precisa trazê-lo) e o veículo dele é consultado
    expect(await screen.findByDisplayValue('Ana Souza')).toBeInTheDocument();
    expect(useVeiculosDoCliente).toHaveBeenCalledWith(5);
    expect(screen.getByDisplayValue('ABC1D23')).toBeInTheDocument();
  });

  it('em orçamento que já saiu de rascunho, a vistoria fica só para consulta', async () => {
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useOrcamento).mockReturnValue({ data: { ...orcamentoComAvaria, status: 'ENVIADO' }, isLoading: false } as never);
    renderPage('/orcamentos/5');

    await waitFor(() => expect(screen.getByLabelText('Região da avaria 1')).toBeDisabled());
    expect(screen.queryByRole('button', { name: /Adicionar manual/ })).not.toBeInTheDocument();
  });
});
