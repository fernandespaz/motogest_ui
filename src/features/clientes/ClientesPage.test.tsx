import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/test/queryClientWrapper';
import { useClientes, useDeleteCliente } from '@/hooks/useClientes';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useTodosOrcamentos } from '@/hooks/useOrcamentos';
import { ClientesPage } from './ClientesPage';

function renderPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <ClientesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

vi.mock('@/hooks/useClientes', () => ({
  useClientes: vi.fn(),
  useDeleteCliente: vi.fn(),
  useCreateCliente: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateCliente: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  clientesKeys: { all: ['clientes'] },
}));
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('@/hooks/useOrdensServico', () => ({ useOrdensServico: vi.fn() }));
vi.mock('@/hooks/useOrcamentos', () => ({ useTodosOrcamentos: vi.fn() }));
vi.mock('@/hooks/useVeiculos', () => ({ useDeleteVeiculo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })) }));
vi.mock('@/hooks/useCepLookup', () => ({ useCepLookup: vi.fn(() => ({ buscando: false, buscar: vi.fn() })) }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const clientes = {
  content: [
    {
      id: 1,
      nome: 'Carlos Eduardo',
      documento: '12345678901',
      tipoPessoa: 'PF',
      telefone: '11912345678',
      ativo: true,
      veiculos: [{ id: 10, placa: 'MTG0001' }],
    },
    { id: 2, nome: 'Fernanda LTDA', documento: '98765432000188', tipoPessoa: 'PJ', email: 'contato@fernanda.com', ativo: false, veiculos: [] },
  ],
  pageNumber: 0,
  totalPages: 1,
  totalElements: 2,
};

describe('ClientesPage', () => {
  let deleteMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ hasPermission: () => false } as never);
    vi.mocked(useOrdensServico).mockReturnValue({ data: undefined } as never);
    vi.mocked(useTodosOrcamentos).mockReturnValue({ data: undefined } as never);
    vi.mocked(useClientes).mockReturnValue({ data: clientes, isLoading: false, isFetching: false } as never);
    deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeleteCliente).mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false } as never);
  });

  it('lists clientes with document, contato, veículos and status', () => {
    renderPage();
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-01')).toBeInTheDocument();
    expect(screen.getByText('(11) 91234-5678')).toBeInTheDocument();
    expect(screen.getByText('MTG0001')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('shows "Nenhum" for a cliente without any veículos', () => {
    renderPage();
    expect(screen.getByText('Nenhum')).toBeInTheDocument();
  });

  it('shows the pluralized total count in the subtitle', () => {
    renderPage();
    expect(screen.getByText('2 clientes cadastrados, com os veículos vinculados')).toBeInTheDocument();
  });

  it('resets to the first page when the search term changes', async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome, CPF\/CNPJ ou placa/), 'Carlos');

    expect(vi.mocked(useClientes).mock.calls.at(-1)?.[0]).toMatchObject({ page: 0, busca: 'Carlos' });
  });

  it('busca sem resultado mostra o estado vazio na própria lista (sem diálogo) e "Ver todos os clientes" volta à lista', async () => {
    vi.mocked(useClientes).mockReturnValue({
      data: { content: [], pageNumber: 0, totalPages: 0, totalElements: 0 },
      isLoading: false,
      isFetching: false,
    } as never);
    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome, CPF\/CNPJ ou placa/), 'xyz');

    expect(await screen.findByText('Nenhum cliente encontrado')).toBeInTheDocument();
    expect(screen.getByText(/Nada encontrado para "xyz"/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // o subtítulo não pode dizer "0 clientes cadastrados" só porque a busca não achou nada
    expect(screen.getByText('0 resultados para "xyz"')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver todos os clientes' }));
    expect(screen.getByPlaceholderText(/Buscar por nome, CPF\/CNPJ ou placa/)).toHaveValue('');
  });

  it('não repete colunas "Tipo"/"Status" para todo cliente: só marca Jurídica e Inativo, e o telefone não quebra', () => {
    renderPage();
    expect(screen.queryByRole('columnheader', { name: 'Tipo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument();
    expect(screen.getByText('Jurídica')).toBeInTheDocument();
    expect(screen.queryByText('Física')).not.toBeInTheDocument();
    expect(screen.queryByText('Ativo')).not.toBeInTheDocument();
    expect(screen.getByText('(11) 91234-5678')).toHaveClass('whitespace-nowrap');
  });

  it('opens the create modal from "Novo cliente"', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Novo cliente/ }));
    expect(screen.getByText('Novo cliente', { selector: 'h2' })).toBeInTheDocument();
  });

  it('clique na linha abre o PERFIL (leitura), não o formulário; "Editar cadastro" abre o formulário', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Carlos Eduardo'));
    const perfil = screen.getByRole('dialog', { name: 'Carlos Eduardo' });
    expect(within(perfil).getByText('Veículos (1)')).toBeInTheDocument();
    expect(screen.queryByText('Editar cliente')).not.toBeInTheDocument();

    await userEvent.click(within(perfil).getByRole('button', { name: /Editar cadastro/ }));
    expect(await screen.findByText('Editar cliente')).toBeInTheDocument();
  });

  it('o ícone de editar da linha continua abrindo o formulário direto', async () => {
    renderPage();
    await userEvent.click(screen.getAllByLabelText('Editar')[0]);
    expect(screen.getByText('Editar cliente')).toBeInTheDocument();
  });

  it('perfil: ligar/WhatsApp como links; ações de orçar e agendar só com permissão', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Carlos Eduardo'));
    const perfil = screen.getByRole('dialog', { name: 'Carlos Eduardo' });
    expect(within(perfil).getByRole('link', { name: /Ligar/ })).toHaveAttribute('href', 'tel:+5511912345678');
    expect(within(perfil).getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/5511912345678');
    expect(within(perfil).queryByRole('button', { name: /Novo orçamento/ })).not.toBeInTheDocument();
    expect(within(perfil).queryByRole('button', { name: /Agendar/ })).not.toBeInTheDocument();
  });

  it('telefone fora do padrão não gera link de ligar/WhatsApp', async () => {
    vi.mocked(useClientes).mockReturnValue({
      data: { ...clientes, content: [{ ...clientes.content[0], telefone: '12345' }] },
      isLoading: false,
      isFetching: false,
    } as never);
    renderPage();
    await userEvent.click(screen.getByText('Carlos Eduardo'));
    const perfil = screen.getByRole('dialog', { name: 'Carlos Eduardo' });
    expect(within(perfil).queryByRole('link', { name: /Ligar/ })).not.toBeInTheDocument();
    expect(within(perfil).queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it('perfil com permissão: "Novo orçamento" e "Orçar" (por veículo) levam ao orçamento com cliente/veículo; "Agendar" à agenda', async () => {
    useAuthStore.setState({ hasPermission: (c: string) => ['ORCAMENTO_WRITE', 'AGENDA_WRITE'].includes(c) } as never);
    renderPage();
    await userEvent.click(screen.getByText('Carlos Eduardo'));
    const perfil = screen.getByRole('dialog', { name: 'Carlos Eduardo' });

    await userEvent.click(within(perfil).getByRole('button', { name: /Novo orçamento/ }));
    expect(mockNavigate).toHaveBeenLastCalledWith('/orcamentos/novo?clienteId=1&clienteNome=Carlos+Eduardo');

    await userEvent.click(within(perfil).getByRole('button', { name: 'Orçar' }));
    expect(mockNavigate).toHaveBeenLastCalledWith('/orcamentos/novo?clienteId=1&clienteNome=Carlos+Eduardo&veiculoId=10');

    await userEvent.click(within(perfil).getByRole('button', { name: /Agendar/ }));
    expect(mockNavigate).toHaveBeenLastCalledWith('/agenda?novoParaCliente=1');
  });

  it('perfil com leitura de OS e orçamentos: resumo e histórico do cliente (orçamentos filtrados pelo id)', async () => {
    useAuthStore.setState({ hasPermission: (c: string) => ['ORDEM_SERVICO_READ', 'ORCAMENTO_READ'].includes(c) } as never);
    vi.mocked(useOrdensServico).mockReturnValue({
      data: {
        content: [
          { id: 7, numero: 'OS-7', status: 'EM_ANDAMENTO', valorTotal: 300, dataAbertura: '2026-11-20T10:00:00', veiculoPlaca: 'MTG0001' },
          { id: 6, numero: 'OS-6', status: 'ENTREGUE', valorTotal: 100, dataAbertura: '2026-10-02T10:00:00', veiculoPlaca: 'MTG0001' },
        ],
      },
    } as never);
    vi.mocked(useTodosOrcamentos).mockReturnValue({
      data: [
        { id: 31, clienteId: 1, status: 'ENVIADO', valorTotal: 500, veiculoPlaca: 'MTG0001' },
        { id: 32, clienteId: 2, status: 'RASCUNHO', valorTotal: 900, veiculoPlaca: 'OUT0002' },
      ],
    } as never);
    renderPage();
    await userEvent.click(screen.getByText('Carlos Eduardo'));
    const perfil = screen.getByRole('dialog', { name: 'Carlos Eduardo' });

    const resumo = within(perfil).getByRole('region', { name: 'Resumo' });
    expect(within(resumo).getByText('OS em aberto').nextElementSibling).toHaveTextContent('1');
    expect(within(resumo).getByText('Orçamentos em aberto').nextElementSibling).toHaveTextContent('1');
    expect(within(resumo).getByText('Última visita').nextElementSibling).toHaveTextContent('20/11/2026');
    expect(within(perfil).getByRole('link', { name: /OS-7/ })).toHaveAttribute('href', '/ordens-servico/7');
    expect(within(perfil).getByRole('link', { name: /#31/ })).toHaveAttribute('href', '/orcamentos/31');
    expect(within(perfil).queryByText('#32')).not.toBeInTheDocument();
  });

  it('confirms and deletes a cliente', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Carlos Eduardo'));
    await userEvent.click(screen.getByRole('button', { name: /Remover cliente/ }));
    const confirmButtons = await screen.findAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(deleteMutateAsync).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('Cliente removido.');
  });

  it('toasts an error when the delete fails', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new Error('cliente possui OS vinculada'));
    renderPage();
    await userEvent.click(screen.getByText('Carlos Eduardo'));
    await userEvent.click(screen.getByRole('button', { name: /Remover cliente/ }));
    const confirmButtons = await screen.findAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(toast.error).toHaveBeenCalledWith('cliente possui OS vinculada');
  });

  it('closes the create/edit modal via Cancelar', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Novo cliente/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Novo cliente', { selector: 'h2' }));
  });

  it('shows the empty state when there are no clientes', () => {
    vi.mocked(useClientes).mockReturnValue({
      data: { content: [], pageNumber: 0, totalPages: 0, totalElements: 0 },
      isLoading: false,
      isFetching: false,
    } as never);
    renderPage();
    expect(screen.getByText('Nenhum cliente cadastrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cadastrar primeiro cliente/ })).toBeInTheDocument();
  });
});
