import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { useVeiculo } from '@/hooks/useVeiculos';
import { useFaturarOrdemServico } from '@/hooks/useFinanceiro';
import { buildOrdemServicoPdfBlob } from '@/features/ordens-servico/ordemServicoPdf';
import { openPdfInNewTab } from '@/lib/downloadBlob';
import { toast } from '@/store/toastStore';
import { FaturarOSModal } from './FaturarOSModal';

vi.mock('@/hooks/useOrdensServico', () => ({ useOrdensServico: vi.fn() }));
vi.mock('@/hooks/useVeiculos', () => ({ useVeiculo: vi.fn() }));
vi.mock('@/hooks/useFinanceiro', () => ({ useFaturarOrdemServico: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/ordens-servico/ordemServicoPdf', () => ({ buildOrdemServicoPdfBlob: vi.fn() }));
vi.mock('@/lib/downloadBlob', () => ({ openPdfInNewTab: vi.fn() }));

const osConcluida = {
  id: 42,
  numero: 'OS-000042',
  status: 'CONCLUIDA' as const,
  clienteNome: 'Diego Fernandes',
  clienteDocumento: '12345678901',
  consultorNome: 'Ana Consultora',
  veiculoId: 7,
  veiculoPlaca: 'MTG0001',
  dataAbertura: '2026-09-20T09:00:00',
  valorTotal: 250,
};

function mockListaVazia() {
  return { data: { content: [] }, isFetching: false } as never;
}

describe('FaturarOSModal', () => {
  beforeEach(() => {
    vi.mocked(useVeiculo).mockReturnValue({ data: undefined, isLoading: false } as never);
    // Comportamento padrão: abre a aba e de fato invoca o callback (que faz o
    // faturamento e monta o PDF) — testes que querem simular a aba bloqueada
    // ou a geração do PDF falhando sobrescrevem isso por caso.
    vi.mocked(openPdfInNewTab).mockImplementation(async (fetchBlob) => {
      await fetchBlob();
    });
  });

  it('não busca nada antes de o CPF/CNPJ ser informado e a busca disparada', () => {
    vi.mocked(useOrdensServico).mockReturnValue(mockListaVazia());
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // Só CONCLUIDA é buscada aqui — ENTREGUE nunca é faturável (já é sempre
  // Faturada antes, ver statusOptionsPara em OrdemServicoFormPage).
  it('busca as OS Concluída do documento informado e lista o resultado', async () => {
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('CPF/CNPJ do cliente'), '12345678901');
    await userEvent.click(screen.getByRole('button', { name: /Buscar/ }));

    expect(screen.getByText('OS-000042')).toBeInTheDocument();
    expect(screen.getByText('Diego Fernandes')).toBeInTheDocument();
    expect(useOrdensServico).toHaveBeenCalledWith(
      expect.objectContaining({ clienteDocumento: '12345678901', status: 'CONCLUIDA' }),
      expect.objectContaining({ enabled: true }),
    );
  });

  // Uma busca que falha (ex.: perfil Caixa sem ORDEM_SERVICO_READ) não pode
  // reforçar a mensagem de "cliente sem OS" — o toast global já avisa do erro
  // real, mas o estado vazio da tabela precisa dizer algo diferente.
  it('diferencia "busca falhou" de "cliente sem OS faturável" no estado vazio', async () => {
    vi.mocked(useOrdensServico).mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
    } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('CPF/CNPJ do cliente'), '12345678901');
    await userEvent.click(screen.getByRole('button', { name: /Buscar/ }));

    expect(screen.getByText('Não foi possível buscar as OS deste cliente')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma OS concluída encontrada para este documento')).not.toBeInTheDocument();
  });

  it('mostra o estado vazio quando não há OS faturável para o documento', async () => {
    vi.mocked(useOrdensServico).mockReturnValue(mockListaVazia());
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('CPF/CNPJ do cliente'), '12345678901');
    await userEvent.click(screen.getByRole('button', { name: /Buscar/ }));

    expect(screen.getByText('Nenhuma OS concluída encontrada para este documento')).toBeInTheDocument();
  });

  it('não consulta status ENTREGUE — só CONCLUIDA é considerada faturável', async () => {
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('CPF/CNPJ do cliente'), '12345678901');
    await userEvent.click(screen.getByRole('button', { name: /Buscar/ }));

    expect(useOrdensServico).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ENTREGUE' }),
      expect.anything(),
    );
  });

  it('seleciona uma OS e confirma o faturamento com a forma de pagamento escolhida', async () => {
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    const mutateAsync = vi.fn().mockResolvedValue({ valor: 250, caixaSessaoIdentificador: 'CX-0001' });
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('CPF/CNPJ do cliente'), '12345678901');
    await userEvent.click(screen.getByRole('button', { name: /Buscar/ }));
    await userEvent.click(screen.getByText('OS-000042'));
    await userEvent.click(screen.getByRole('button', { name: /Faturar OS/ }));
    await userEvent.selectOptions(screen.getByLabelText('Forma de pagamento'), 'CARTAO');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar faturamento' }));

    expect(mutateAsync).toHaveBeenCalledWith({ ordemServicoId: 42, payload: { formaPagamento: 'CARTAO' } });
  });

  // Clicar na linha só seleciona (destaca) — não pode disparar direto pra
  // etapa de confirmação num clique acidental numa ação que move dinheiro.
  it('só destaca a linha ao clicar, sem avançar pra confirmação automaticamente', async () => {
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('CPF/CNPJ do cliente'), '12345678901');
    await userEvent.click(screen.getByRole('button', { name: /Buscar/ }));
    await userEvent.click(screen.getByText('OS-000042'));

    expect(screen.queryByLabelText('Forma de pagamento')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Faturar OS/ })).toBeEnabled();
  });

  it('mantém "Faturar OS" desabilitado até uma linha ser selecionada', async () => {
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('CPF/CNPJ do cliente'), '12345678901');
    await userEvent.click(screen.getByRole('button', { name: /Buscar/ }));

    expect(screen.getByRole('button', { name: /Faturar OS/ })).toBeDisabled();
  });

  async function irParaConfirmacao() {
    await userEvent.type(screen.getByLabelText('CPF/CNPJ do cliente'), '12345678901');
    await userEvent.click(screen.getByRole('button', { name: /Buscar/ }));
    await userEvent.click(screen.getByText('OS-000042'));
    await userEvent.click(screen.getByRole('button', { name: /Faturar OS/ }));
  }

  it('shows CPF, consultor and entrada date on the confirmation summary', async () => {
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await irParaConfirmacao();

    expect(screen.getByText('123.456.789-01')).toBeInTheDocument();
    expect(screen.getByText('Ana Consultora')).toBeInTheDocument();
    expect(screen.getByText('20/09/2026')).toBeInTheDocument();
  });

  it('shows the vehicle make/model alongside the plate once it loads', async () => {
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.mocked(useVeiculo).mockReturnValue({ data: { marca: 'Honda', modelo: 'Civic' }, isLoading: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await irParaConfirmacao();

    expect(screen.getByText('Honda Civic — MTG0001')).toBeInTheDocument();
  });

  it('falls back to just the plate while the vehicle detail has not loaded yet', async () => {
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await irParaConfirmacao();

    expect(screen.getByText('MTG0001')).toBeInTheDocument();
  });

  // O recibo agora abre sozinho, junto da confirmação — não existe mais um
  // botão separado de "Imprimir Recibo" (ver comentário em FaturarOSModal).
  it('opens the receipt automatically once faturamento is confirmed, marked as a paid receipt', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      valor: 250,
      caixaSessaoIdentificador: 'CX-0001',
      recebidoEm: '2026-09-27T10:00:00',
    });
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await irParaConfirmacao();
    await userEvent.selectOptions(screen.getByLabelText('Forma de pagamento'), 'PIX');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar faturamento/ }));

    expect(mutateAsync).toHaveBeenCalledWith({ ordemServicoId: 42, payload: { formaPagamento: 'PIX' } });
    expect(openPdfInNewTab).toHaveBeenCalledWith(expect.any(Function), 'recibo-OS-000042.pdf');
    expect(buildOrdemServicoPdfBlob).toHaveBeenCalledWith(osConcluida, {
      tipoDocumento: 'Recibo de Pagamento',
      pagamento: {
        formaPagamento: 'Pix',
        dataPagamento: expect.any(String),
        caixaSessaoIdentificador: 'CX-0001',
      },
    });
  });

  it('shows a loading state while the payment and the receipt are being processed', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ valor: 250, caixaSessaoIdentificador: 'CX-0001' });
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync, isPending: false } as never);
    let liberar: () => void = () => {};
    vi.mocked(openPdfInNewTab).mockImplementation(
      () =>
        new Promise((resolve) => {
          liberar = () => resolve(undefined);
        }),
    );
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await irParaConfirmacao();
    await userEvent.click(screen.getByRole('button', { name: /Confirmar faturamento/ }));

    expect(screen.getByText('Gerando recibo de pagamento...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
    liberar();
  });

  it('toasts the backend error and never opens a receipt when faturar itself fails', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Nenhuma sessão de caixa aberta.'));
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await irParaConfirmacao();
    await userEvent.click(screen.getByRole('button', { name: /Confirmar faturamento/ }));

    expect(toast.error).toHaveBeenCalledWith('Nenhuma sessão de caixa aberta.');
    expect(buildOrdemServicoPdfBlob).not.toHaveBeenCalled();
  });

  // Se o pagamento já foi registrado no caixa e só o recibo falhar depois
  // (aba bloqueada, erro ao montar o PDF), isso não pode ser reportado como
  // se o faturamento tivesse falhado — o dinheiro já está lançado.
  it('distinguishes a receipt failure from a billing failure once the payment already succeeded', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ valor: 250, caixaSessaoIdentificador: 'CX-0001' });
    vi.mocked(useOrdensServico).mockReturnValue({ data: { content: [osConcluida] }, isFetching: false } as never);
    vi.mocked(useFaturarOrdemServico).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(openPdfInNewTab).mockImplementation(async (fetchBlob) => {
      await fetchBlob();
      throw new Error('janela bloqueada');
    });
    render(<FaturarOSModal open onClose={vi.fn()} />);

    await irParaConfirmacao();
    await userEvent.click(screen.getByRole('button', { name: /Confirmar faturamento/ }));

    expect(mutateAsync).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      'Faturamento concluído, mas não foi possível abrir o recibo para impressão.',
    );
  });
});
