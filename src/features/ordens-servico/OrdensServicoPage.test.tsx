import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useAuthStore } from '@/store/authStore';
import { OrdensServicoPage } from './OrdensServicoPage';

vi.mock('@/hooks/useOrdensServico', () => ({ useOrdensServico: vi.fn() }));

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
});
