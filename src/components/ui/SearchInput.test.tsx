import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('uses the default placeholder and hides the clear button when empty', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
    expect(screen.queryByLabelText('Limpar busca')).not.toBeInTheDocument();
  });

  it('accepts a custom placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Buscar por número..." />);
    expect(screen.getByPlaceholderText('Buscar por número...')).toBeInTheDocument();
  });

  it('calls onChange as the user types', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('shows a clear button once there is a value, and it resets to empty', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="Carlos" onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Limpar busca'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
