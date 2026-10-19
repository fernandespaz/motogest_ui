import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DonutChart } from './DonutChart';

describe('DonutChart', () => {
  it('shows the total in the center and every segment in the legend, with an accessible summary', () => {
    render(
      <DonutChart
        centerLabel="OS ativas"
        segments={[
          { label: 'Em execução', value: 4, tone: 'brand' },
          { label: 'Para faturar', value: 2, tone: 'warning' },
        ]}
      />,
    );

    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Em execução')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Em execução: 4, Para faturar: 2/ })).toBeInTheDocument();
  });

  it('shows the empty label when every value is zero', () => {
    render(<DonutChart emptyLabel="Nada por aqui" segments={[{ label: 'A', value: 0, tone: 'muted' }]} />);
    expect(screen.getByText('Nada por aqui')).toBeInTheDocument();
  });

  it('prefers a custom display text and center value when given', () => {
    render(
      <DonutChart
        centerValue="R$ 300,00"
        segments={[{ label: 'A receber', value: 500, tone: 'success', display: 'R$ 500,00 · 3' }]}
      />,
    );
    expect(screen.getByText('R$ 300,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 500,00 · 3')).toBeInTheDocument();
  });
});
