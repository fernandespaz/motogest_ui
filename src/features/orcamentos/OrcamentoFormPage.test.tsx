import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateOrcamento, useOrcamento, useUpdateOrcamento } from '@/hooks/useOrcamentos';
import { useClientes, useVeiculosDoCliente } from '@/hooks/useClientes';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { OrcamentoFormPage } from './OrcamentoFormPage';

vi.mock('@/hooks/useOrcamentos', () => ({
  useOrcamento: vi.fn(),
  useCreateOrcamento: vi.fn(),
  useUpdateOrcamento: vi.fn(),
}));
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
vi.mock('@/features/shared/ModeloVeiculoField', () => ({
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
