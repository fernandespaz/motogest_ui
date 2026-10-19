import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

const options = [
  { value: 'PF' as const, label: 'Pessoa física' },
  { value: 'PJ' as const, label: 'Pessoa jurídica' },
];

describe('SegmentedControl', () => {
  it('marks the current option as checked and exposes the group by its label', () => {
    render(<SegmentedControl label="Tipo de pessoa" value="PF" onChange={vi.fn()} options={options} />);
    expect(screen.getByRole('radiogroup', { name: 'Tipo de pessoa' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Pessoa física' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Pessoa jurídica' })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the clicked option value', async () => {
    const onChange = vi.fn();
    render(<SegmentedControl value="PF" onChange={onChange} options={options} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Pessoa jurídica' }));
    expect(onChange).toHaveBeenCalledWith('PJ');
  });
});
