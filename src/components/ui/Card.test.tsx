import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardHeader, CardBody } from './Card';

describe('Card', () => {
  it('renders its children inside the card shell', () => {
    render(<Card>Conteúdo</Card>);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });
});

describe('CardHeader', () => {
  it('renders the title only when subtitle/action are omitted', () => {
    render(<CardHeader title="Clientes" />);
    expect(screen.getByText('Clientes')).toBeInTheDocument();
  });

  it('renders the subtitle and action when provided', () => {
    render(<CardHeader title="Clientes" subtitle="12 cadastrados" action={<button>Novo</button>} />);
    expect(screen.getByText('12 cadastrados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument();
  });
});

describe('CardBody', () => {
  it('renders its children', () => {
    render(<CardBody>Detalhes</CardBody>);
    expect(screen.getByText('Detalhes')).toBeInTheDocument();
  });
});
