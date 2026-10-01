import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { useFaturarOrdemServico } from '@/hooks/useFinanceiro';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { formatCurrency } from '@/lib/formatters';
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
vi.mock('@/hooks/useFinanceiro', () => ({ useFaturarOrdemServico: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
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
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
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

  // FATURADO é o status novo que o backend passou a aceitar depois que uma OS
  // é faturada no caixa — trava a edição igual a Concluída/Cancelada/Entregue,
  // nunca deveria voltar a ficar editável só porque já foi paga.
  it('locks the whole form once the OS is Faturada', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { id: 9, numero: 'OS-000009', status: 'FATURADO', itens: [] },
      isLoading: false,
    } as never);
    renderPage('9');

    expect(screen.getByText('Esta OS não está mais em um status editável — os dados ficam bloqueados a partir daqui.')).toBeInTheDocument();
  });

  // OrdemServicoResponse só devolve veiculoId+veiculoPlaca (sem chassi) — o
  // chassi vem de cruzar com a lista de veículos do cliente (useVeiculosDoCliente,
  // já carregada pro combobox de Veículo), a mesma fonte que o combobox usa.
  it('shows the selected vehicle’s chassi once its data loads', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { id: 9, numero: 'OS-000009', status: 'APROVADA', clienteId: 5, veiculoId: 12, itens: [] },
      isLoading: false,
    } as never);
    vi.mocked(useVeiculosDoCliente).mockReturnValue({
      data: [{ id: 12, placa: 'MTG0001', chassi: '9BWZZZ377VT004251' }],
    } as never);
    renderPage('9');

    expect(screen.getByText('9BWZZZ377VT004251')).toBeInTheDocument();
  });

  it('does not render the chassi field before a vehicle is selected', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { id: 9, numero: 'OS-000009', status: 'ABERTA', itens: [] },
      isLoading: false,
    } as never);
    renderPage('9');

    expect(screen.queryByText('Chassi')).not.toBeInTheDocument();
  });
});

describe('OrdemServicoFormPage — Faturar no Caixa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ nome: 'Ana Consultora', perfil: 'Consultor Técnico', usuarioId: 1 });
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

  const osConcluida = {
    id: 9,
    numero: 'OS-000009',
    status: 'CONCLUIDA' as const,
    valorTotal: 350,
    itens: [],
  };

  it('shows "Faturar no Caixa" for a concluded OS when the profile can operate a caixa', () => {
    useAuthStore.setState({ hasPermission: (codigo: string) => codigo === 'CAIXA_OPERAR' });
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useOrdemServico).mockReturnValue({ data: osConcluida, isLoading: false } as never);
    renderPage('9');

    expect(screen.getByRole('button', { name: /Faturar no Caixa/ })).toBeInTheDocument();
  });

  it('hides "Faturar no Caixa" without CAIXA_OPERAR, even for a concluded OS', () => {
    useAuthStore.setState({ hasPermission: () => false });
    vi.mocked(useOrdemServico).mockReturnValue({ data: osConcluida, isLoading: false } as never);
    renderPage('9');

    expect(screen.queryByRole('button', { name: /Faturar no Caixa/ })).not.toBeInTheDocument();
  });

  it('hides "Faturar no Caixa" for an OS that is not yet Concluída/Entregue', () => {
    useAuthStore.setState({ hasPermission: () => true });
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { ...osConcluida, status: 'EM_ANDAMENTO' },
      isLoading: false,
    } as never);
    renderPage('9');

    expect(screen.queryByRole('button', { name: /Faturar no Caixa/ })).not.toBeInTheDocument();
  });

  // Fecha a lacuna que existia antes do status FATURADO existir: sem um
  // sinal real de "já faturada" na própria OS, a única defesa contra faturar
  // de novo era o backend rejeitar com 4xx — agora o botão nem aparece.
  it('hides "Faturar no Caixa" once the OS is already Faturada', () => {
    useAuthStore.setState({ hasPermission: () => true });
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { ...osConcluida, status: 'FATURADO' },
      isLoading: false,
    } as never);
    renderPage('9');

    expect(screen.queryByRole('button', { name: /Faturar no Caixa/ })).not.toBeInTheDocument();
  });

  it('confirms the faturamento with the chosen payment method and toasts the result', async () => {
    useAuthStore.setState({ hasPermission: () => true });
    const mutateAsync = vi.fn().mockResolvedValue({ valor: 350, caixaSessaoIdentificador: 'CX-0001' });
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useOrdemServico).mockReturnValue({ data: osConcluida, isLoading: false } as never);
    renderPage('9');

    await userEvent.click(screen.getByRole('button', { name: /Faturar no Caixa/ }));
    await userEvent.selectOptions(screen.getByLabelText('Forma de pagamento'), 'PIX');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar faturamento' }));

    expect(mutateAsync).toHaveBeenCalledWith({ ordemServicoId: 9, payload: { formaPagamento: 'PIX' } });
    expect(toast.success).toHaveBeenCalledWith(`OS faturada — ${formatCurrency(350)} lançados no caixa CX-0001.`);
  });

  it('toasts the backend error when there is no open caixa session to bill into', async () => {
    useAuthStore.setState({ hasPermission: () => true });
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Nenhuma sessão de caixa aberta.'));
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useOrdemServico).mockReturnValue({ data: osConcluida, isLoading: false } as never);
    renderPage('9');

    await userEvent.click(screen.getByRole('button', { name: /Faturar no Caixa/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar faturamento' }));

    expect(toast.error).toHaveBeenCalledWith('Nenhuma sessão de caixa aberta.');
  });
});

describe('OrdemServicoFormPage — sequência Concluída → Faturado → Entregue', () => {
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
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useClientes).mockReturnValue({ data: { content: [] }, isFetching: false } as never);
    vi.mocked(useVeiculosDoCliente).mockReturnValue({ data: [] } as never);
    vi.mocked(useUsuarios).mockReturnValue({ data: mecanicos } as never);
  });

  // Regra de negócio: o veículo só é liberado pro cliente depois de pago — o
  // backend já rejeita ENTREGUE vindo de qualquer status que não seja
  // FATURADO, então o seletor não pode nem oferecer essa opção fora dali.
  it('does not offer Entregue as a manual status option while the OS is only Concluída', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { id: 9, numero: 'OS-000009', status: 'CONCLUIDA', itens: [] },
      isLoading: false,
    } as never);
    renderPage('9');

    const select = screen.getByDisplayValue('Concluída') as HTMLSelectElement;
    const opcoes = Array.from(select.options).map((o) => o.value);
    expect(opcoes).not.toContain('ENTREGUE');
  });

  it('offers Entregue as a manual status option once the OS is Faturada', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { id: 9, numero: 'OS-000009', status: 'FATURADO', itens: [] },
      isLoading: false,
    } as never);
    renderPage('9');

    const select = screen.getByDisplayValue('Faturada') as HTMLSelectElement;
    const opcoes = Array.from(select.options).map((o) => o.value);
    expect(opcoes).toContain('ENTREGUE');
  });

  // Uma OS Entregue só existe porque já passou por Faturado antes — faturar
  // de novo nunca é a ação certa a partir daqui.
  it('hides "Faturar no Caixa" for an OS that is already Entregue', () => {
    vi.mocked(useOrdemServico).mockReturnValue({
      data: { id: 9, numero: 'OS-000009', status: 'ENTREGUE', valorTotal: 350, itens: [] },
      isLoading: false,
    } as never);
    renderPage('9');

    expect(screen.queryByRole('button', { name: /Faturar no Caixa/ })).not.toBeInTheDocument();
  });
});
