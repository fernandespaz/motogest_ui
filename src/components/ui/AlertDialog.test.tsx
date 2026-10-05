import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AlertDialog } from './AlertDialog';

describe('AlertDialog', () => {
  it('shows title, message and extra content, and closes from the acknowledge button', async () => {
    const onClose = vi.fn();
    render(
      <AlertDialog open tone="danger" title="Nota rejeitada" message="E0715: código inválido" onClose={onClose}>
        <p>detalhe extra</p>
      </AlertDialog>,
    );

    expect(screen.getByRole('alertdialog', { name: 'Nota rejeitada' })).toBeInTheDocument();
    expect(screen.getByText('E0715: código inválido')).toBeInTheDocument();
    expect(screen.getByText('detalhe extra')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    render(<AlertDialog open={false} title="Oculto" onClose={vi.fn()} />);
    expect(screen.queryByText('Oculto')).not.toBeInTheDocument();
  });
});
