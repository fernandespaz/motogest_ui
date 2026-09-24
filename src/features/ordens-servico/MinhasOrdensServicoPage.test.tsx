import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useOrdensServico,
  useTimerStartOS,
  useTimerPauseOS,
  useTimerResumeOS,
  useAtualizarStatusOS,
} from '@/hooks/useOrdensServico';
import { useAuthStore } from '@/store/authStore';
import { MinhasOrdensServicoPage } from './MinhasOrdensServicoPage';

vi.mock('@/hooks/useOrdensServico', () => ({
  useOrdensServico: vi.fn(),
  useTimerStartOS: vi.fn(),
  useTimerPauseOS: vi.fn(),
  useTimerResumeOS: vi.fn(),
  useAtualizarStatusOS: vi.fn(),
}));
// A miniatura real depende de useVeiculos/useModelosVeiculo (rede) — aqui só
// interessa confirmar ONDE ela é renderizada nesta tela, não sua lógica de
// resolução (que já tem cobertura própria).
vi.mock('@/features/shared/ModeloVeiculoField', () => ({
  ModeloVeiculoThumb: ({ base64 }: { base64?: string | null }) => (
    <div data-testid="veiculo-thumb">{base64 ? 'com-imagem' : 'sem-imagem'}</div>
  ),
  useImagensPorVeiculoId: () => new Map(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const osAguardando = {
  id: 1,
  numero: 'OS-000001',
  status: 'APROVADA',
  clienteNome: 'Diego Fernandes Paz',
  veiculoPlaca: 'PAS-12345',
  veiculoId: 10,
  dataAbertura: '2026-09-23T00:13:00Z',
  observacoes: 'Revisão completa',
  itens: [{ id: 1, tipoItem: 'SERVICO', descricao: 'Revisão Completa', quantidade: 1, valorUnitario: 100, valorTotal: 100 }],
  tempoVendidoMinutos: 120,
  tempoConsumidoMinutos: 0,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <MinhasOrdensServicoPage />
    </MemoryRouter>,
  );
}

describe('MinhasOrdensServicoPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(useOrdensServico).mockImplementation(({ status }: any) =>
      ({
        data: { content: status === 'APROVADA' ? [osAguardando] : [], pageNumber: 0, totalPages: 1, totalElements: status === 'APROVADA' ? 1 : 0 },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      }) as never,
    );
    vi.mocked(useTimerStartOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useTimerPauseOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useTimerResumeOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useAtualizarStatusOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    useAuthStore.setState({ nome: 'Marcos Mecânico', usuarioId: 3 });
  });

  // "Sair" já existe no Sidebar (desktop) e na gaveta "Mais" do MobileNav —
  // duplicá-lo aqui foi o bug reportado (dois "Sair" visíveis ao mesmo tempo).
  it('does not render its own "Sair" action in the header', () => {
    renderPage();
    expect(screen.queryByLabelText('Sair')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sair/i })).not.toBeInTheDocument();
  });

  it('renders the vehicle thumbnail both in the desktop corner slot and as the mobile/tablet hero image', () => {
    renderPage();
    expect(screen.getAllByTestId('veiculo-thumb')).toHaveLength(2);
  });

  it('navigates Checklist and Fotos to the OS detail page, Fotos pre-selecting the fotos tab', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Checklist' }));
    expect(mockNavigate).toHaveBeenCalledWith('/minhas-os/1');

    await userEvent.click(screen.getByRole('button', { name: 'Fotos' }));
    expect(mockNavigate).toHaveBeenCalledWith('/minhas-os/1?tab=fotos');
  });
});
