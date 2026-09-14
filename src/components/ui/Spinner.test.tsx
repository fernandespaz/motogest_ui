import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner, PageSpinner } from './Spinner';

describe('Spinner', () => {
  it('renders a spinning icon', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('PageSpinner', () => {
  it('renders the default label', () => {
    render(<PageSpinner />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<PageSpinner label="Buscando clientes..." />);
    expect(screen.getByText('Buscando clientes...')).toBeInTheDocument();
  });
});
