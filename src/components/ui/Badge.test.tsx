import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Aprovado</Badge>);
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
  });

  it.each(['neutral', 'brand', 'success', 'warning', 'danger'] as const)(
    'renders the %s tone without crashing',
    (tone) => {
      render(<Badge tone={tone}>Status</Badge>);
      expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    },
  );
});
