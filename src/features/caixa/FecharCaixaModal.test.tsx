import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFecharCaixaSessao } from '@/hooks/useFinanceiro';
import { toast } from '@/store/toastStore';
import { baixarExportacaoCaixa } from '@/features/financeiro/caixaExport';
import { FecharCaixaModal } from './FecharCaixaModal';
import type { CaixaSessaoResponse } from '@/api/types';

vi.mock('@/hooks/useFinanceiro', () => ({ useFecharCaixaSessao: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/financeiro/caixaExport', () => ({ baixarExportacaoCaixa: vi.fn() }));
vi.mock('@/api/endpoints/caixa', () => ({ caixaApi: { sessoes: { exportar: vi.fn() } } }));

const sessao: CaixaSessaoResponse = {
  id: 7,
  identificador: 'CX-0007',
  turno: 'Tarde',
  status: 'ABERTO',
  saldoAtual: { dinheiro: 100, cartao: 50, pix: 0, transferencia: 0, total: 150 },
};

async function contar(valores: { dinheiro: string; cartao: string; pix: string; transferencia: string }) {
  for (const [label, v] of [
    ['Dinheiro (R$)', valores.dinheiro],
    ['Cartão (R$)', valores.cartao],
    ['Pix (R$)', valores.pix],
    ['Transferência (R$)', valores.transferencia],
  ] as const) {
    if (v) await userEvent.type(screen.getByLabelText(label), v);
  }
}

describe('FecharCaixaModal', () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync = vi.fn().mockResolvedValue({ id: 7, status: 'FECHADO' });
    vi.mocked(useFecharCaixaSessao).mockReturnValue({ mutateAsync, isPending: false } as never);
  });

  it('contagem cega: campos vazios e sem mostrar o saldo do sistema', () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Dinheiro (R$)')).toHaveValue(null);
    expect(screen.queryByText(/Sistema:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$ 100,00/)).not.toBeInTheDocument();
  });

  it('campo em branco não vale zero: exige informar o valor contado', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    expect((await screen.findAllByText('Informe o valor contado')).length).toBe(4);
    expect(screen.queryByRole('button', { name: 'Confirmar fechamento' })).not.toBeInTheDocument();
  });

  it('fecha sem justificativa quando o contado bate com o calculado', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await contar({ dinheiro: '100', cartao: '50', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    expect(await screen.findByRole('table', { name: /Conferência do caixa/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Justificativa da divergência/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar fechamento' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 7,
        payload: expect.objectContaining({
          saldoFinalInformadoDinheiro: 100,
          saldoFinalInformadoCartao: 50,
          saldoFinalInformadoPix: 0,
          saldoFinalInformadoTransferencia: 0,
        }),
      }),
    );
  });

  it('na revisão mostra a diferença por extenso (Faltou/Sobrou) e exige justificativa', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await contar({ dinheiro: '70', cartao: '50', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    expect(await screen.findAllByText('Faltou R$ 30,00')).not.toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar fechamento' }));

    expect(
      await screen.findByText('O valor informado diverge do saldo calculado pelo sistema — justifique a divergência.'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('envia a divergência quando a justificativa é preenchida e depois oferece o comprovante', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await contar({ dinheiro: '80', cartao: '50', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    await userEvent.type(await screen.findByLabelText(/Justificativa da divergência/), 'Troco emprestado');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar fechamento' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 7,
        payload: expect.objectContaining({
          saldoFinalInformadoDinheiro: 80,
          justificativaDivergencia: 'Troco emprestado',
        }),
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Caixa fechado.');

    await userEvent.click(await screen.findByRole('button', { name: 'Baixar comprovante (PDF)' }));
    expect(baixarExportacaoCaixa).toHaveBeenCalledWith(expect.any(Function), 'caixa-CX-0007', 'PDF');
  });

  it('"Voltar à contagem" mantém os valores já digitados', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await contar({ dinheiro: '70', cartao: '50', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Voltar à contagem' }));

    expect(await screen.findByLabelText('Dinheiro (R$)')).toHaveValue(70);
  });

  it('não envia justificativa antiga se o usuário corrige a contagem e a divergência some', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await contar({ dinheiro: '70', cartao: '50', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    await userEvent.type(await screen.findByLabelText(/Justificativa da divergência/), 'texto antigo');
    await userEvent.click(screen.getByRole('button', { name: 'Voltar à contagem' }));
    const dinheiro = await screen.findByLabelText('Dinheiro (R$)');
    await userEvent.clear(dinheiro);
    await userEvent.type(dinheiro, '100');
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar fechamento' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 7,
        payload: expect.objectContaining({ justificativaDivergencia: '' }),
      }),
    );
  });

  it('ao avançar de passo o foco vai para o texto do novo passo', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await contar({ dinheiro: '100', cartao: '50', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    await waitFor(() => expect(screen.getByText(/Passo 2 de 2/)).toHaveFocus());
  });

  it('mostra "Sobrou" quando o contado passa do calculado', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await contar({ dinheiro: '100', cartao: '60', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    expect((await screen.findAllByText('Sobrou R$ 10,00')).length).toBeGreaterThan(0);
  });

  it('se o comprovante falhar, avisa e libera o botão de novo', async () => {
    vi.mocked(baixarExportacaoCaixa).mockRejectedValueOnce(new Error('falhou'));
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await contar({ dinheiro: '100', cartao: '50', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar fechamento' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Baixar comprovante (PDF)' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Baixar comprovante (PDF)' })).toBeEnabled();
  });

  it('ao reabrir depois de concluído volta à contagem com campos vazios', async () => {
    const { rerender } = render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);
    await contar({ dinheiro: '100', cartao: '50', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar fechamento' }));
    await screen.findByRole('button', { name: 'Concluir' });

    rerender(<FecharCaixaModal open={false} sessao={sessao} onClose={vi.fn()} />);
    rerender(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    expect(await screen.findByLabelText('Dinheiro (R$)')).toHaveValue(null);
  });

  it('"Concluir" fecha o modal', async () => {
    const onClose = vi.fn();
    render(<FecharCaixaModal open sessao={sessao} onClose={onClose} />);

    await contar({ dinheiro: '100', cartao: '50', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar fechamento' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Concluir' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('se o backend recusar, continua na revisão e avisa', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('falhou'));
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await contar({ dinheiro: '100', cartao: '50', pix: '0', transferencia: '0' });
    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar fechamento' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Confirmar fechamento' })).toBeInTheDocument();
  });
});
