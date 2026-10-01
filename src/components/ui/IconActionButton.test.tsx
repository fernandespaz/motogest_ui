import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Trash } from '@phosphor-icons/react';
import { IconActionButton } from './IconActionButton';

describe('IconActionButton', () => {
  it('uses the label as both title and aria-label, so an icon-only action still has an accessible name', () => {
    render(<IconActionButton icon={Trash} label="Remover" onClick={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Remover' });
    expect(button).toHaveAttribute('title', 'Remover');
  });

  it('responds to a click', async () => {
    const onClick = vi.fn();
    render(<IconActionButton icon={Trash} label="Remover" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('defaults to type="button", never submitting an ancestor form by accident', () => {
    render(<IconActionButton icon={Trash} label="Remover" onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Remover' })).toHaveAttribute('type', 'button');
  });

  it.each(['neutral', 'brand', 'success', 'danger'] as const)('renders the %s tone without crashing', (tone) => {
    render(<IconActionButton icon={Trash} label="Ação" tone={tone} onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Ação' })).toBeInTheDocument();
  });

  it('disables itself and ignores pointer events when disabled', () => {
    render(<IconActionButton icon={Trash} label="Remover" disabled onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Remover' })).toBeDisabled();
  });
});
