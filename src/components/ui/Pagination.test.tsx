import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing when there is only one page and no page-size control', () => {
    const { container } = render(<Pagination page={0} totalPages={1} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the record count when given', () => {
    render(<Pagination page={1} totalPages={5} totalElements={42} onChange={vi.fn()} />);
    expect(screen.getByText('42 registros')).toBeInTheDocument();
  });

  it('marks the current page number and disables the edge navigation buttons', () => {
    render(<Pagination page={0} totalPages={2} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima página' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
  });

  it('calls onChange with the adjacent page when navigating', async () => {
    const onChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(onChange).toHaveBeenCalledWith(2);

    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('calls onChange with the exact page clicked in the numbered list', async () => {
    const onChange = vi.fn();
    render(<Pagination page={0} totalPages={3} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('collapses a long page list with ellipsis around the current page', () => {
    render(<Pagination page={10} totalPages={20} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '11' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '5' })).not.toBeInTheDocument();
  });

  it('does not render an "itens por página" control unless both pageSize props are given', () => {
    render(<Pagination page={0} totalPages={3} onChange={vi.fn()} />);
    expect(screen.queryByText('Itens por página')).not.toBeInTheDocument();
  });

  it('lets the user change the page size when the control is wired up', async () => {
    const onPageSizeChange = vi.fn();
    render(<Pagination page={0} totalPages={3} onChange={vi.fn()} pageSize={20} onPageSizeChange={onPageSizeChange} />);

    await userEvent.selectOptions(screen.getByLabelText('Itens por página'), '50');
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('still renders the page-size control even with a single page', () => {
    render(<Pagination page={0} totalPages={1} onChange={vi.fn()} pageSize={20} onPageSizeChange={vi.fn()} />);
    expect(screen.getByLabelText('Itens por página')).toBeInTheDocument();
  });
});
