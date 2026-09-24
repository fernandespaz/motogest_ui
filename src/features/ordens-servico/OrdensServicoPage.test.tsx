import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useAuthStore } from '@/store/authStore';
import { OrdensServicoPage } from './OrdensServicoPage';

vi.mock('@/hooks/useOrdensServico', () => ({ useOrdensServico: vi.fn() }));
vi.mock('@/hooks/useUsuarios', () => ({ useUsuarios: vi.fn() }));
vi.mock('@/hooks/useVeiculos', () => ({ useVeiculos: vi.fn(() => ({ data: { content: [] } })) }));
vi.mock('@/hooks/useModelosVeiculo', () => ({
  useModelosVeiculo: vi.fn(() => ({ data: { content: [] } })),
  useCreateModeloVeiculo: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const data = {
  content: [{ id: 42, numero: 'OS-000042', clienteNome: 'Frota Rápida', veiculoPlaca: 'MTG0019', status: 'APROVADA' }],
  pageNumber: 0,
  totalPages: 1,
  totalElements: 1,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <OrdensServicoPage />
    </MemoryRouter>,
  );
}

describe('OrdensServicoPage row navigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(useOrdensServico).mockReturnValue({ data, isLoading: false } as never);
    vi.mocked(useUsuarios).mockReturnValue({ data: [] } as never);
  });

  // Este é o ponto central da correção: o Mecânico também acessa essa lista
  // geral (pra achar a OS de um colega), e antes clicar numa linha levava pro
  // formulário completo do Consultor (mesmo problema do botão "Detalhes" que
  // foi removido de Minhas OS). Sem esse teste, um refactor de isMecanico() ou
  // uma reversão acidental dessa linha reabriria o buraco silenciosamente.
  it('routes a Mecânico to the read-only /minhas-os/:id screen, not the editable Consultor form', async () => {
    useAuthStore.setState({ perfil: 'Mecânico' });
    renderPage();

    await userEvent.click(screen.getByText('OS-000042'));

    expect(mockNavigate).toHaveBeenCalledWith('/minhas-os/42');
  });

  it('routes a Consultor/Admin to the full editable OS form', async () => {
    useAuthStore.setState({ perfil: 'Consultor Técnico' });
    renderPage();

    await userEvent.click(screen.getByText('OS-000042'));

    expect(mockNavigate).toHaveBeenCalledWith('/ordens-servico/42');
  });

  // Com mais de um consultor na oficina, a lista precisa deixar claro de
  // quem é cada OS sem precisar abrir uma por uma — a tabela só tinha a
  // coluna de Técnico, nunca a de Consultor.
  it('shows the consultor alongside the técnico for each row', () => {
    useAuthStore.setState({ perfil: 'Consultor Técnico' });
    vi.mocked(useOrdensServico).mockReturnValue({
      data: {
        ...data,
        content: [{ ...data.content[0], consultorNome: 'Bruno Consultor', usuarioResponsavelNome: 'Marcos Mecânico' }],
      },
      isLoading: false,
    } as never);
    renderPage();

    expect(screen.getByText('Consultor')).toBeInTheDocument();
    expect(screen.getByText('Bruno Consultor')).toBeInTheDocument();
    expect(screen.getByText('Marcos Mecânico')).toBeInTheDocument();
  });

  it('falls back to a dash when a row has no consultor on record', () => {
    useAuthStore.setState({ perfil: 'Consultor Técnico' });
    renderPage();

    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });
});

describe('OrdensServicoPage filtros', () => {
  beforeEach(() => {
    useAuthStore.setState({ perfil: 'Consultor Técnico' });
    vi.mocked(useOrdensServico).mockReturnValue({ data, isLoading: false } as never);
    vi.mocked(useUsuarios).mockReturnValue({ data: [] } as never);
  });

  it('filters by a single click on a status chip, using the same status param as before', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Em andamento' }));

    expect(useOrdensServico).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'EM_ANDAMENTO', page: 0 }),
    );
  });

  it('clears the status filter when "Todos" is clicked back', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Pausada' }));
    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));

    expect(useOrdensServico).toHaveBeenLastCalledWith(expect.objectContaining({ status: undefined }));
  });

  it('filters by the less-common statuses through "Mais status"', async () => {
    renderPage();

    await userEvent.selectOptions(screen.getByDisplayValue('Mais status…'), 'CANCELADA');

    expect(useOrdensServico).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'CANCELADA' }));
  });

  it('does not show the técnico filter when there are no mecânicos to filter by', () => {
    renderPage();
    expect(screen.queryByText('Técnico: Todos')).not.toBeInTheDocument();
  });

  it('filters by técnico using the usuarioResponsavelId param the API already supports', async () => {
    vi.mocked(useUsuarios).mockReturnValue({
      data: [
        { id: 7, nome: 'Marcos Mecânico', perfilNome: 'Mecânico' },
        { id: 8, nome: 'Carla Consultora', perfilNome: 'Consultor Técnico' },
      ],
    } as never);
    renderPage();

    expect(screen.queryByRole('option', { name: 'Carla Consultora' })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByDisplayValue('Técnico: Todos'), '7');

    expect(useOrdensServico).toHaveBeenLastCalledWith(expect.objectContaining({ usuarioResponsavelId: 7 }));
  });

  it('lets the user pick how many rows load per page', async () => {
    renderPage();

    await userEvent.selectOptions(screen.getByLabelText('Itens por página'), '50');

    expect(useOrdensServico).toHaveBeenLastCalledWith(expect.objectContaining({ size: 50, page: 0 }));
  });
});
