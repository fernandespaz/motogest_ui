import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSolicitarDesconto } from '@/hooks/useDescontos';
import { toast } from '@/store/toastStore';
import { SolicitarDescontoModal } from './SolicitarDescontoModal';

vi.mock('@/hooks/useDescontos', () => ({ useSolicitarDesconto: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const baseProps = {
  open: true,
  onClose: vi.fn(),
  origemTipo: 'ORCAMENTO' as const,
  origemId: 1,
  itemId: 9,
  itemDescricao: 'Troca de Óleo',
  valorUnitarioAtual: 100,
};

describe('SolicitarDescontoModal', () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useSolicitarDesconto).mockReturnValue({ mutateAsync, isPending: false } as never);
  });

  it('shows the item and its current valor unitário', () => {
    render(<SolicitarDescontoModal {...baseProps} />);
    expect(screen.getByText('Troca de Óleo')).toBeInTheDocument();
    expect(screen.getByText('Valor unitário atual: R$ 100,00')).toBeInTheDocument();
  });

  it('disables "Solicitar" until a positive value is entered', async () => {
    render(<SolicitarDescontoModal {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Solicitar' })).toBeDisabled();

    await userEvent.type(screen.getByRole('spinbutton'), '10');
    expect(screen.getByRole('button', { name: 'Solicitar' })).not.toBeDisabled();
  });

  it('previews the resulting valor unitário in percentual mode', async () => {
    render(<SolicitarDescontoModal {...baseProps} />);
    await userEvent.type(screen.getByRole('spinbutton'), '10');

    expect(screen.getByText('Valor unitário após aprovação: R$ 90,00')).toBeInTheDocument();
  });

  it('switches to "valor" mode, clearing the previous input and relabeling the field', async () => {
    render(<SolicitarDescontoModal {...baseProps} />);
    await userEvent.type(screen.getByRole('spinbutton'), '10');

    await userEvent.selectOptions(screen.getByRole('combobox'), 'Novo valor unitário');

    expect(screen.getByRole('spinbutton')).toHaveValue(null);
    expect(screen.getByText('Valor unitário solicitado')).toBeInTheDocument();
  });

  it('previews the typed value directly in "valor" mode', async () => {
    render(<SolicitarDescontoModal {...baseProps} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Novo valor unitário');
    await userEvent.type(screen.getByRole('spinbutton'), '75');

    expect(screen.getByText('Valor unitário após aprovação: R$ 75,00')).toBeInTheDocument();
  });

  it('submits the percentual request, toasts success, and resets/closes', async () => {
    const onClose = vi.fn();
    render(<SolicitarDescontoModal {...baseProps} onClose={onClose} />);
    await userEvent.type(screen.getByRole('spinbutton'), '10');

    await userEvent.click(screen.getByRole('button', { name: 'Solicitar' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      origemTipo: 'ORCAMENTO',
      origemId: 1,
      itemId: 9,
      percentualDesconto: 10,
      valorUnitarioSolicitado: undefined,
    });
    expect(toast.success).toHaveBeenCalledWith('Desconto solicitado — aguardando aprovação.');
    expect(onClose).toHaveBeenCalled();
  });

  it('submits a valor-mode request with the numeric field populated instead', async () => {
    render(<SolicitarDescontoModal {...baseProps} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Novo valor unitário');
    await userEvent.type(screen.getByRole('spinbutton'), '80');

    await userEvent.click(screen.getByRole('button', { name: 'Solicitar' }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ percentualDesconto: undefined, valorUnitarioSolicitado: 80 }),
    );
  });

  it('toasts an error and keeps the modal open when the request fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('falhou'));
    const onClose = vi.fn();
    render(<SolicitarDescontoModal {...baseProps} onClose={onClose} />);
    await userEvent.type(screen.getByRole('spinbutton'), '10');

    await userEvent.click(screen.getByRole('button', { name: 'Solicitar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('falhou'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets the form and closes on Cancelar', async () => {
    const onClose = vi.fn();
    render(<SolicitarDescontoModal {...baseProps} onClose={onClose} />);
    await userEvent.type(screen.getByRole('spinbutton'), '10');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
  });
});
