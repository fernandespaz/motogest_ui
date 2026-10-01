import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFecharCaixaSessao } from '@/hooks/useFinanceiro';
import { FecharCaixaModal } from './FecharCaixaModal';
import type { CaixaSessaoResponse } from '@/api/types';

vi.mock('@/hooks/useFinanceiro', () => ({ useFecharCaixaSessao: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sessao: CaixaSessaoResponse = {
  id: 7,
  identificador: 'CX-0007',
  turno: 'Tarde',
  status: 'ABERTO',
  saldoAtual: { dinheiro: 100, cartao: 50, pix: 0, transferencia: 0, total: 150 },
};

describe('FecharCaixaModal', () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mutateAsync = vi.fn().mockResolvedValue({ id: 7, status: 'FECHADO' });
    vi.mocked(useFecharCaixaSessao).mockReturnValue({ mutateAsync, isPending: false } as never);
  });

  it('preenche os campos de conferência com o saldo calculado pelo sistema', () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Dinheiro (R$)')).toHaveValue(100);
    expect(screen.getByLabelText('Cartão (R$)')).toHaveValue(50);
  });

  it('fecha sem exigir justificativa quando o valor contado bate com o calculado', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Fechar caixa' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      id: 7,
      payload: expect.objectContaining({
        saldoFinalInformadoDinheiro: 100,
        saldoFinalInformadoCartao: 50,
        saldoFinalInformadoPix: 0,
        saldoFinalInformadoTransferencia: 0,
      }),
    });
  });

  it('bloqueia o envio e pede justificativa quando o valor contado diverge do calculado', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    const campoDinheiro = screen.getByLabelText('Dinheiro (R$)');
    await userEvent.clear(campoDinheiro);
    await userEvent.type(campoDinheiro, '80');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar caixa' }));

    expect(
      await screen.findByText('O valor informado diverge do saldo calculado pelo sistema — justifique a divergência.'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('permite o envio da divergência assim que a justificativa é preenchida', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    const campoDinheiro = screen.getByLabelText('Dinheiro (R$)');
    await userEvent.clear(campoDinheiro);
    await userEvent.type(campoDinheiro, '80');
    await userEvent.type(
      screen.getByLabelText(/Justificativa da divergência/),
      'Troco emprestado pro turno seguinte',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fechar caixa' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      id: 7,
      payload: expect.objectContaining({
        saldoFinalInformadoDinheiro: 80,
        justificativaDivergencia: 'Troco emprestado pro turno seguinte',
      }),
    });
  });

  it('mostra a divergência total em tempo real conforme o usuário digita', async () => {
    render(<FecharCaixaModal open sessao={sessao} onClose={vi.fn()} />);

    const campoDinheiro = screen.getByLabelText('Dinheiro (R$)');
    await userEvent.clear(campoDinheiro);
    await userEvent.type(campoDinheiro, '70');

    expect(screen.getByText('-R$ 30,00')).toBeInTheDocument();
  });
});
