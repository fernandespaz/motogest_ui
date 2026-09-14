import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders the title, optional description, and default/custom confirm label', () => {
    render(
      <ConfirmDialog
        open
        title="Excluir cliente?"
        description="Essa ação não pode ser desfeita."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Excluir cliente?')).toBeInTheDocument();
    expect(screen.getByText('Essa ação não pode ser desfeita.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });

  it('calls onConfirm and onCancel from their respective buttons', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="Excluir cliente?" confirmLabel="Excluir" onConfirm={onConfirm} onCancel={onCancel} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onConfirm).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables Cancelar and shows a spinner on Confirmar while loading', () => {
    render(<ConfirmDialog open title="Excluir cliente?" loading onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
