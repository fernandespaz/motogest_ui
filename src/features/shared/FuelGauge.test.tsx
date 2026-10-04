import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FuelGauge } from './FuelGauge';

describe('FuelGauge', () => {
  it('reports the clicked level and shows the current one', () => {
    const onChange = vi.fn();
    render(<FuelGauge value={50} onChange={onChange} />);
    expect(screen.getByRole('radio', { name: '1/2' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: '3/4' }));
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('selects with the keyboard', () => {
    const onChange = vi.fn();
    render(<FuelGauge value={25} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: '1/4' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it('ignores clicks when disabled and says so when nothing is set', () => {
    const onChange = vi.fn();
    render(<FuelGauge value={undefined} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('radio', { name: 'Cheio' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Não informado')).toBeInTheDocument();
  });
});
