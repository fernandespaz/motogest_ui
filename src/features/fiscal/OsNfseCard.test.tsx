import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAtualizarNfse,
  useBaixarXmlNfse,
  useCancelarNfse,
  useConfiguracaoFiscal,
  useEmitirNfse,
  useNotaFiscal,
  useNotasFiscais,
} from '@/hooks/useFiscal';
import { useAuthStore } from '@/store/authStore';
import { OsNfseCard } from './OsNfseCard';

vi.mock('@/hooks/useFiscal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useFiscal')>();
  return {
    ...actual,
    useConfiguracaoFiscal: vi.fn(),
    useNotasFiscais: vi.fn(),
    useNotaFiscal: vi.fn(),
    useEmitirNfse: vi.fn(),
    useAtualizarNfse: vi.fn(),
    useBaixarXmlNfse: vi.fn(),
    useCancelarNfse: vi.fn(),
  };
});

const configPronta = {
  configurada: true,
  emissaoHabilitada: true,
  ambiente: 'HOMOLOGACAO',
  pendencias: [],
  prontaParaEmitir: true,
  provedorDisponivel: true,
};

function renderCard(props: Partial<React.ComponentProps<typeof OsNfseCard>> = {}) {
  return render(
    <MemoryRouter>
      <OsNfseCard ordemServicoId={345} status="FATURADO" {...props} />
    </MemoryRouter>,
  );
}

function mockNotas(content: unknown[]) {
  vi.mocked(useNotasFiscais).mockReturnValue({ data: { content }, isLoading: false, refetch: vi.fn() } as never);
}

describe('OsNfseCard', () => {
  const emitir = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ hasPermission: (c: string) => ['FISCAL_EMITIR', 'FISCAL_CANCELAR'].includes(c) });
    vi.mocked(useConfiguracaoFiscal).mockReturnValue({ data: configPronta, isLoading: false } as never);
    mockNotas([]);
    vi.mocked(useEmitirNfse).mockReturnValue({ mutateAsync: emitir, isPending: false } as never);
    vi.mocked(useAtualizarNfse).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useBaixarXmlNfse).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useCancelarNfse).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useNotaFiscal).mockReturnValue({ data: undefined, isLoading: true } as never);
  });

  it('renders nothing without FISCAL_EMITIR', () => {
    useAuthStore.setState({ hasPermission: () => false });
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an OS that is not yet Faturada/Entregue', () => {
    const { container } = renderCard({ status: 'CONCLUIDA' });
    expect(container).toBeEmptyDOMElement();
  });

  it('confirms before emitting, then reports an authorized note in a central dialog', async () => {
    emitir.mockResolvedValueOnce({ id: 12, status: 'AUTORIZADA', numero: '55', ambiente: 'HOMOLOGACAO' });
    renderCard();

    await userEvent.click(screen.getByRole('button', { name: /Emitir NFS-e/ }));
    expect(emitir).not.toHaveBeenCalled();
    expect(screen.getByText('Emitir NFS-e?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Emitir nota' }));
    await waitFor(() => expect(emitir).toHaveBeenCalledWith(345));
    expect(await screen.findByRole('alertdialog', { name: 'NFS-e autorizada' })).toBeInTheDocument();
  });

  it('shows the backend message in an error dialog when emission fails (422)', async () => {
    emitir.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: 'O cliente não possui CPF/CNPJ valido' } },
    });
    renderCard();

    await userEvent.click(screen.getByRole('button', { name: /Emitir NFS-e/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Emitir nota' }));

    expect(await screen.findByRole('alertdialog', { name: 'Não foi possível emitir a NFS-e' })).toBeInTheDocument();
    expect(screen.getByText(/CPF\/CNPJ/)).toBeInTheDocument();
  });

  it('warns about a client without a valid document and does not call the API', async () => {
    renderCard({ clienteDocumento: '123' });

    await userEvent.click(screen.getByRole('button', { name: /Emitir NFS-e/ }));

    expect(screen.getByRole('alertdialog', { name: 'Cliente sem CPF/CNPJ válido' })).toBeInTheDocument();
    expect(emitir).not.toHaveBeenCalled();
  });

  it('for a PROCESSANDO note offers "Atualizar status" and never offers to emit again', () => {
    mockNotas([{ id: 12, status: 'PROCESSANDO', ordemServicoId: 345, valorServicos: 250 }]);
    renderCard();

    expect(screen.getByRole('button', { name: /Atualizar status/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Emitir/ })).not.toBeInTheDocument();
  });

  it('for an AUTORIZADA note shows XML and cancel actions (with FISCAL_CANCELAR) instead of the emit button', () => {
    mockNotas([{ id: 12, status: 'AUTORIZADA', numero: '55', possuiXml: true, valorServicos: 250 }]);
    renderCard();

    expect(screen.getByRole('button', { name: /Baixar XML/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar nota/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Emitir/ })).not.toBeInTheDocument();
  });

  it('hides the cancel action without FISCAL_CANCELAR', () => {
    useAuthStore.setState({ hasPermission: (c: string) => c === 'FISCAL_EMITIR' });
    mockNotas([{ id: 12, status: 'AUTORIZADA', possuiXml: true }]);
    renderCard();

    expect(screen.queryByRole('button', { name: /Cancelar nota/ })).not.toBeInTheDocument();
  });

  it('after a REJEITADA attempt, shows the reason and offers "Emitir novamente"', () => {
    mockNotas([{ id: 12, status: 'REJEITADA', mensagem: 'E0715: Codigo de tributacao invalido' }]);
    renderCard();

    expect(screen.getByText('E0715: Codigo de tributacao invalido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Emitir novamente/ })).toBeInTheDocument();
  });

  it('points to the fiscal configuration when the oficina is not ready to emit', () => {
    useAuthStore.setState({ hasPermission: (c: string) => ['FISCAL_EMITIR', 'FISCAL_CONFIGURAR'].includes(c) });
    vi.mocked(useConfiguracaoFiscal).mockReturnValue({
      data: { ...configPronta, prontaParaEmitir: false, pendencias: ['Regime tributario nao informado'] },
      isLoading: false,
    } as never);
    renderCard();

    expect(screen.queryByRole('button', { name: /Emitir/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir configuração fiscal' })).toHaveAttribute('href', '/fiscal');
  });

  it('says emission is unavailable when the server has no provider', () => {
    vi.mocked(useConfiguracaoFiscal).mockReturnValue({
      data: { ...configPronta, provedorDisponivel: false, prontaParaEmitir: false },
      isLoading: false,
    } as never);
    renderCard();

    expect(screen.getByText('Emissão de NFS-e indisponível neste ambiente.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Emitir/ })).not.toBeInTheDocument();
  });
});
