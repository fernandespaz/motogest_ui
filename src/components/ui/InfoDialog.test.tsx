import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InfoDialog } from './InfoDialog';

describe('InfoDialog', () => {
  it('renders the title and optional description', () => {
    render(<InfoDialog open title="Tudo certo!" description="Sua ação foi concluída." onClose={vi.fn()} />);
    expect(screen.getByText('Tudo certo!')).toBeInTheDocument();
    expect(screen.getByText('Sua ação foi concluída.')).toBeInTheDocument();
  });

  it('calls onClose from the "Entendi" button', async () => {
    const onClose = vi.fn();
    render(<InfoDialog open title="Tudo certo!" onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onClose).toHaveBeenCalled();
  });
});
