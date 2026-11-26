import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormContext } from 'react-hook-form';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateOrcamento, useOrcamento, useUpdateOrcamento } from '@/hooks/useOrcamentos';
import { useClientes, useVeiculosDoCliente } from '@/hooks/useClientes';
import { useAgendamento } from '@/hooks/useAgenda';
import { useAuthStore } from '@/store/authStore';
import { OrcamentoFormPage } from './OrcamentoFormPage';

vi.mock('@/hooks/useOrcamentos', () => ({
  useOrcamento: vi.fn(),
  useCreateOrcamento: vi.fn(),
  useUpdateOrcamento: vi.fn(),
  useConcluirCadastroOrcamento: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/hooks/useAgenda', () => ({ useAgendamento: vi.fn(() => ({ data: undefined })) }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});
vi.mock('@/hooks/useClientes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useClientes')>();
  return { ...actual, useClientes: vi.fn(), useVeiculosDoCliente: vi.fn() };
});
// Editor de itens de mentira: um botão que inclui um item (o editor real tem suíte própria).
vi.mock('@/features/shared/ItemsEditor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/shared/ItemsEditor')>();
  function ItemsEditorFalso() {
    const { setValue } = useFormContext();
    return (
      <button
        type="button"
        onClick={() =>
          setValue('itens', [{ tipoItem: 'SERVICO', descricao: 'Troca de óleo', quantidade: 1, valorUnitario: 50 }], { shouldDirty: true })
        }
      >
        Incluir item
      </button>
    );
  }
  return { ...actual, ItemsEditor: ItemsEditorFalso };
});
vi.mock('@/features/shared/HoraTecnicaReferencia', () => ({ HoraTecnicaReferencia: () => null }));
vi.mock('@/features/vistoria/VistoriaViewer', () => ({ default: () => <div data-testid="viewer" /> }));
vi.mock('@/hooks/usePlacas', () => {
  const mutacao = () => ({ mutateAsync: vi.fn(), isPending: false, data: undefined, reset: vi.fn() });
  return { useCarteiraPlacas: () => ({ data: undefined }), useConsultarPlaca: mutacao, useConsultarChassi: mutacao };
});
vi.mock('@/features/shared/ModeloVeiculoField', () => ({
  ModeloVeiculoField: () => null,
  ModeloVeiculoThumb: () => null,
  useModeloVeiculoImagem: () => undefined,
}));

function arvore(path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/orcamentos/novo" element={<OrcamentoFormPage />} />
        <Route path="/orcamentos/:id" element={<OrcamentoFormPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderPage(path: string) {
  const resultado = render(arvore(path));
  return { ...resultado, rerenderizar: () => resultado.rerender(arvore(path)) };
}

const CLIENTE_E_VEICULO = '/orcamentos/novo?clienteId=1&clienteNome=Ana&veiculoId=2';
const respostaCriada = {
  id: 77,
  status: 'RASCUNHO',
  clienteId: 1,
  veiculoId: 2,
  validadeDias: 7,
  itens: [{ id: 501, tipoItem: 'SERVICO', descricao: 'Troca de óleo', quantidade: 1, valorUnitario: 50 }],
};

describe('OrcamentoFormPage — salvamento automático do rascunho', () => {
  const criar = vi.fn();
  const atualizar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    criar.mockResolvedValue(respostaCriada);
    atualizar.mockResolvedValue(respostaCriada);
    useAuthStore.setState({ nome: 'Ana', perfil: 'Administrador', usuarioId: 1, hasPermission: () => true });
    vi.mocked(useCreateOrcamento).mockReturnValue({ mutateAsync: criar, isPending: false } as never);
    vi.mocked(useUpdateOrcamento).mockReturnValue({ mutateAsync: atualizar, isPending: false } as never);
    vi.mocked(useClientes).mockReturnValue({ data: { content: [] }, isFetching: false } as never);
    vi.mocked(useVeiculosDoCliente).mockReturnValue({ data: [{ id: 2, placa: 'ABC1D23', categoria: 'A' }] } as never);
    vi.mocked(useAgendamento).mockReturnValue({ data: undefined } as never);
  });

  it('com cliente, veículo e um item, cria o rascunho sozinho depois de um instante e mostra a hora do salvamento', async () => {
    vi.mocked(useOrcamento).mockReturnValue({ data: undefined, isLoading: false } as never);
    renderPage(CLIENTE_E_VEICULO);
    expect(screen.getByTestId('status-salvamento')).toHaveTextContent('O rascunho é salvo sozinho');

    await userEvent.click(screen.getByRole('button', { name: 'Incluir item' }));
    expect(screen.getByTestId('status-salvamento')).toHaveTextContent('Alterações ainda não salvas');
    expect(criar).not.toHaveBeenCalled(); // espera parar de editar

    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1), { timeout: 6000 });
    expect(criar.mock.calls[0][0]).toMatchObject({ clienteId: 1, veiculoId: 2, itens: [expect.objectContaining({ descricao: 'Troca de óleo' })] });
    await waitFor(() => expect(screen.getByTestId('status-salvamento')).toHaveTextContent(/Salvo automaticamente às \d{2}:\d{2}/));
    // depois de criado, o botão passa a "Salvar alterações" (o registro já existe)
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
  }, 15000);

  it('sem cliente/veículo/itens completos NÃO salva e explica o que falta', async () => {
    vi.mocked(useOrcamento).mockReturnValue({ data: undefined, isLoading: false } as never);
    renderPage('/orcamentos/novo');
    await userEvent.click(screen.getByRole('button', { name: 'Incluir item' }));

    await waitFor(() => expect(screen.getByTestId('status-salvamento')).toHaveTextContent('Escolha cliente, veículo e ao menos 1 item'), {
      timeout: 6000,
    });
    expect(criar).not.toHaveBeenCalled();
  }, 15000);

  it('depois de criado pelo autosave, o clique em "Salvar" atualiza o mesmo orçamento (não cria outro)', async () => {
    vi.mocked(useOrcamento).mockReturnValue({ data: undefined, isLoading: false } as never);
    renderPage(CLIENTE_E_VEICULO);
    await userEvent.click(screen.getByRole('button', { name: 'Incluir item' }));
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1), { timeout: 6000 });
    await screen.findByRole('button', { name: 'Salvar alterações' });

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(atualizar).toHaveBeenCalledWith(expect.objectContaining({ id: 77 })));
    expect(criar).toHaveBeenCalledTimes(1);
  }, 15000);

  it('orçamento salvo: editar uma observação atualiza o registro sozinho; sem edição, nada é enviado', async () => {
    vi.mocked(useOrcamento).mockReturnValue({
      data: { id: 5, status: 'RASCUNHO', clienteId: 1, veiculoId: 2, validadeDias: 7, itens: respostaCriada.itens },
      isLoading: false,
    } as never);
    renderPage('/orcamentos/5');
    await screen.findByRole('button', { name: 'Incluir item' });
    expect(atualizar).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Observações'), 'Cliente pediu urgência');
    await waitFor(() => expect(atualizar).toHaveBeenCalledTimes(1), { timeout: 6000 });
    expect(atualizar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, payload: expect.objectContaining({ observacoes: 'Cliente pediu urgência' }) }),
    );
  }, 15000);

  it('orçamento que já saiu de rascunho não tem salvamento automático nem o aviso dele', async () => {
    vi.mocked(useOrcamento).mockReturnValue({
      data: { id: 5, status: 'ENVIADO', clienteId: 1, veiculoId: 2, validadeDias: 7, itens: respostaCriada.itens },
      isLoading: false,
    } as never);
    renderPage('/orcamentos/5');
    await screen.findByRole('button', { name: 'Incluir item' }).catch(() => undefined);
    expect(screen.queryByTestId('status-salvamento')).not.toBeInTheDocument();
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('se o salvamento falha, avisa sem derrubar a tela e o botão manual continua disponível', async () => {
    criar.mockRejectedValueOnce(new Error('indisponível'));
    vi.mocked(useOrcamento).mockReturnValue({ data: undefined, isLoading: false } as never);
    renderPage(CLIENTE_E_VEICULO);
    await userEvent.click(screen.getByRole('button', { name: 'Incluir item' }));

    await waitFor(() => expect(screen.getByTestId('status-salvamento')).toHaveTextContent('Não foi possível salvar automaticamente'), {
      timeout: 6000,
    });
    expect(screen.getByRole('button', { name: 'Criar rascunho' })).toBeInTheDocument();
  }, 15000);

  it('clicar em "Criar rascunho" enquanto o autosave ainda está criando espera por ele e ATUALIZA o mesmo orçamento (não cria dois)', async () => {
    let concluirCriacao: (v: unknown) => void = () => {};
    criar.mockImplementationOnce(() => new Promise((resolve) => (concluirCriacao = resolve)));
    vi.mocked(useOrcamento).mockReturnValue({ data: undefined, isLoading: false } as never);
    renderPage(CLIENTE_E_VEICULO);
    await userEvent.click(screen.getByRole('button', { name: 'Incluir item' }));
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1), { timeout: 6000 }); // autosave com a criação em voo

    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    expect(criar).toHaveBeenCalledTimes(1); // o clique espera, não cria outro
    expect(atualizar).not.toHaveBeenCalled();

    concluirCriacao(respostaCriada);
    await waitFor(() => expect(atualizar).toHaveBeenCalledWith(expect.objectContaining({ id: 77 })));
    expect(criar).toHaveBeenCalledTimes(1);
  }, 15000);

  const orcamentoSalvo = (observacoes: string) => ({
    data: { id: 5, status: 'RASCUNHO', clienteId: 1, veiculoId: 2, validadeDias: 7, observacoes, itens: respostaCriada.itens },
    isLoading: false,
  });

  it('mudança vinda de fora (ex.: desconto aprovado) é reaplicada quando o consultor não tem nada pendente', async () => {
    vi.mocked(useOrcamento).mockReturnValue(orcamentoSalvo('original') as never);
    const { rerenderizar } = renderPage('/orcamentos/5');
    await waitFor(() => expect(screen.getByLabelText('Observações')).toHaveValue('original'));

    vi.mocked(useOrcamento).mockReturnValue(orcamentoSalvo('alterada no servidor') as never);
    rerenderizar();
    await waitFor(() => expect(screen.getByLabelText('Observações')).toHaveValue('alterada no servidor'));
    expect(atualizar).not.toHaveBeenCalled(); // aplicar o que veio do servidor não é "alteração a salvar"
  });

  it('mas NUNCA sobrescreve o que o consultor digitou e ainda não foi salvo', async () => {
    vi.mocked(useOrcamento).mockReturnValue(orcamentoSalvo('original') as never);
    const { rerenderizar } = renderPage('/orcamentos/5');
    await waitFor(() => expect(screen.getByLabelText('Observações')).toHaveValue('original'));
    await userEvent.type(screen.getByLabelText('Observações'), ' + meu texto');

    vi.mocked(useOrcamento).mockReturnValue(orcamentoSalvo('alterada no servidor') as never);
    rerenderizar();
    expect(screen.getByLabelText('Observações')).toHaveValue('original + meu texto');
  }, 15000);

  it('quando o backend recusa o autosave (ex.: desconto pendente), mostra o motivo', async () => {
    atualizar.mockRejectedValueOnce({ response: { data: { message: 'Orcamento possui uma solicitacao de desconto pendente' } } });
    vi.mocked(useOrcamento).mockReturnValue(orcamentoSalvo('original') as never);
    renderPage('/orcamentos/5');
    await waitFor(() => expect(screen.getByLabelText('Observações')).toHaveValue('original'));
    await userEvent.type(screen.getByLabelText('Observações'), '!');

    await waitFor(() => expect(screen.getByTestId('status-salvamento')).toHaveTextContent('Não foi possível salvar automaticamente'), {
      timeout: 6000,
    });
  }, 15000);
});
