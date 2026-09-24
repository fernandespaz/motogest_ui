import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCreateOrdemServico,
  useOrdemServico,
  useUpdateOrdemServico,
  useAtualizarStatusOS,
  useEnviarOS,
  useTimerStartOS,
  useTimerPauseOS,
  useTimerResumeOS,
} from '@/hooks/useOrdensServico';
import { useClientes, useVeiculosDoCliente } from '@/hooks/useClientes';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useAuthStore } from '@/store/authStore';
import { OrdemServicoFormPage } from './OrdemServicoFormPage';

vi.mock('@/hooks/useOrdensServico', () => ({
  useOrdemServico: vi.fn(),
  useCreateOrdemServico: vi.fn(),
  useUpdateOrdemServico: vi.fn(),
  useAtualizarStatusOS: vi.fn(),
  useEnviarOS: vi.fn(),
  useTimerStartOS: vi.fn(),
  useTimerPauseOS: vi.fn(),
  useTimerResumeOS: vi.fn(),
}));
vi.mock('@/hooks/useClientes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useClientes')>();
  return { ...actual, useClientes: vi.fn(), useVeiculosDoCliente: vi.fn() };
});
vi.mock('@/hooks/useUsuarios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useUsuarios')>();
  return { ...actual, useUsuarios: vi.fn() };
});
vi.mock('@/features/shared/ItemsEditor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/shared/ItemsEditor')>();
  return { ...actual, ItemsEditor: () => <div data-testid="items-editor" /> };
});
vi.mock('@/features/shared/HoraTecnicaReferencia', () => ({ HoraTecnicaReferencia: () => null }));

const mecanicos = [
  { id: 3, nome: 'Marcos Mecânico', perfilNome: 'Mecânico' },
  { id: 4, nome: 'Paula Mecânica', perfilNome: 'Mecânico' },
];

function renderPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/ordens-servico/${id}`]}>
      <Routes>
        <Route path="/ordens-servico/:id" element={<OrdemServicoFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrdemServicoFormPage — rastreabilidade do consultor e trava do técnico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ nome: 'Ana Consultora', perfil: 'Consultor Técnico', usuarioId: 1, hasPermission: () => true });
    vi.mocked(useCreateOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useUpdateOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useAtualizarStatusOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useEnviarOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useTimerStartOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useTimerPauseOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useTimerResumeOS).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useClientes).mockReturnValue({ data: { content: [] }, isFetching: false } as never);
    vi.mocked(useVeiculosDoCliente).mockReturnValue({ data: [] } as never);
    vi.mocked(useUsuarios).mockReturnValue({ data: mecanicos } as never);
  });

  // Não é um campo do request (o backend atribui a partir do orçamento de
  // origem, ver OrdemServicoRequest em openapi.json) — rastreabilidade pro
  // fechamento de mês: quem converteu o orçamento que virou esta OS. Fica no
  // subtítulo da página, não na grade de campos ao lado dos inputs de verdade.
  it('shows the OS’s consultor in the page subtitle, for month-end billing traceability', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { id: 9, numero: 'OS-000009', status: 'APROVADA', consultorNome: 'Bruno Consultor', itens: [] },
      isLoading: false,
    } as never);
    renderPage('9');

    expect(screen.getByText('Consultor: Bruno Consultor')).toBeInTheDocument();
  });

  it('falls back to an em dash when the OS has no consultor on record', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { id: 9, numero: 'OS-000009', status: 'APROVADA', consultorNome: undefined, itens: [] },
      isLoading: false,
    } as never);
    renderPage('9');

    expect(screen.getByText('Consultor: —')).toBeInTheDocument();
  });

  it('allows reassigning "Técnico Resp." before work starts (Aprovada)', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: {
        id: 9,
        numero: 'OS-000009',
        status: 'APROVADA',
        usuarioResponsavelId: 3,
        usuarioResponsavelNome: 'Marcos Mecânico',
        itens: [],
      },
      isLoading: false,
    } as never);
    renderPage('9');

    expect(screen.getByLabelText('Técnico Resp.')).toBeEnabled();
  });

  // O ponto central: uma vez que o cronômetro rodou (Em Andamento), o técnico
  // não pode mais ser trocado — evita inconsistência de faturamento e
  // horas/produtividade creditadas ao técnico errado. O backend já rejeita o
  // PUT inteiro nesse status (ver STATUS_BLOQUEIA_EDICAO); esta trava garante
  // que a UI nem deixa tentar.
  it('locks "Técnico Resp." (and the whole form) once the OS is Em Andamento', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: {
        id: 9,
        numero: 'OS-000009',
        status: 'EM_ANDAMENTO',
        usuarioResponsavelId: 3,
        usuarioResponsavelNome: 'Marcos Mecânico',
        itens: [],
      },
      isLoading: false,
    } as never);
    renderPage('9');

    expect(screen.getByLabelText('Técnico Resp.')).toBeDisabled();
  });

  it('also locks "Técnico Resp." while Pausada or Aguardando Peça', () => {
    for (const status of ['PAUSADA', 'AGUARDANDO_PECA'] as const) {
      vi.mocked(useOrdemServico).mockReturnValue({
        data: { id: 9, numero: 'OS-000009', status, usuarioResponsavelId: 3, usuarioResponsavelNome: 'Marcos Mecânico', itens: [] },
        isLoading: false,
      } as never);
      const { unmount } = renderPage('9');
      expect(screen.getByLabelText('Técnico Resp.')).toBeDisabled();
      unmount();
    }
  });
});
