import { render, screen } from '@testing-library/react';
import { Package } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title with the default icon', () => {
    const { container } = render(<EmptyState title="Nenhum registro" />);
    expect(screen.getByText('Nenhum registro')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the description and a custom icon when provided', () => {
    render(<EmptyState icon={Package} title="Nenhum produto" description="Cadastre o primeiro produto." />);
    expect(screen.getByText('Nenhum produto')).toBeInTheDocument();
    expect(screen.getByText('Cadastre o primeiro produto.')).toBeInTheDocument();
  });

  it('renders an action slot when provided', () => {
    render(<EmptyState title="Nenhum registro" action={<button>Adicionar</button>} />);
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });
});
