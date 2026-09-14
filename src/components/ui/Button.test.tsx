import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children and responds to a click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows a spinner and disables itself while loading', () => {
    render(<Button loading>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('respects an explicit disabled prop', () => {
    render(<Button disabled>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it.each(['primary', 'secondary', 'ghost', 'danger', 'outline'] as const)(
    'renders the %s variant without crashing',
    (variant) => {
      render(<Button variant={variant}>Ação</Button>);
      expect(screen.getByRole('button', { name: 'Ação' })).toBeInTheDocument();
    },
  );

  it.each(['sm', 'md', 'lg'] as const)('renders the %s size without crashing', (size) => {
    render(<Button size={size}>Ação</Button>);
    expect(screen.getByRole('button', { name: 'Ação' })).toBeInTheDocument();
  });

  it('applies fullWidth styling when requested', () => {
    render(<Button fullWidth>Ação</Button>);
    expect(screen.getByRole('button', { name: 'Ação' }).className).toContain('w-full');
  });
});
