import { render, screen } from '@testing-library/react';
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
import { OrcamentosPage } from './OrcamentosPage';

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
