import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormSection } from './FormSection';

describe('FormSection', () => {
  it('renders the title, the optional action and its children', () => {
    render(
      <FormSection title="Endereço" action={<button>Adicionar</button>}>
        <p>conteúdo</p>
      </FormSection>,
    );
    expect(screen.getByRole('heading', { name: 'Endereço' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });
});
