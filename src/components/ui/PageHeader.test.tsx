import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders only the title when subtitle/action are omitted', () => {
    render(<PageHeader title="Clientes" />);
    expect(screen.getByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
  });

  it('renders the subtitle and action when provided', () => {
    render(<PageHeader title="Clientes" subtitle="Gerencie sua carteira" action={<button>Novo cliente</button>} />);
    expect(screen.getByText('Gerencie sua carteira')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo cliente' })).toBeInTheDocument();
  });
});
