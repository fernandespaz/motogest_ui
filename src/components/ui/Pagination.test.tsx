import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={0} totalPages={1} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the current page and total, plus the record count when given', () => {
    render(<Pagination page={1} totalPages={5} totalElements={42} onChange={vi.fn()} />);
    expect(screen.getByText('Página 2 de 5 · 42 registros')).toBeInTheDocument();
  });

  it('disables "Anterior" on the first page and "Próxima" on the last', () => {
    render(<Pagination page={0} totalPages={2} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Próxima/ })).not.toBeDisabled();
  });

  it('calls onChange with the adjacent page when navigating', async () => {
    const onChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /Próxima/ }));
    expect(onChange).toHaveBeenCalledWith(2);

    await userEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
