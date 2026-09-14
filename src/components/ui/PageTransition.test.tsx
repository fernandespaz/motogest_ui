import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageTransition } from './PageTransition';

describe('PageTransition', () => {
  it('renders its children', () => {
    render(
      <PageTransition>
        <div>Conteúdo da página</div>
      </PageTransition>,
    );
    expect(screen.getByText('Conteúdo da página')).toBeInTheDocument();
  });
});
