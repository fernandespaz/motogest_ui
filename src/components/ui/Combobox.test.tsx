import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Combobox, type ComboboxOption } from './Combobox';

const options: ComboboxOption[] = [
  { value: 1, label: 'Carlos Eduardo', sublabel: '123.456.789-01' },
  { value: 2, label: 'Fernanda Souza' },
];

function Controlled(props: Partial<React.ComponentProps<typeof Combobox>> = {}) {
  const [value, setValue] = useState<number | undefined>(props.value);
  const [query, setQuery] = useState('');
  return (
    <Combobox
      label="Cliente"
      value={value}
      onChange={(v) => setValue(v || undefined)}
      query={query}
      onQueryChange={setQuery}
      options={options}
      {...props}
    />
  );
}

describe('Combobox', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<Controlled placeholder="Buscar cliente..." />);
    expect(screen.getByPlaceholderText('Buscar cliente...')).toBeInTheDocument();
  });

  it('opens the option list on focus and lists every option with its sublabel', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('textbox'));

    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-01')).toBeInTheDocument();
    expect(screen.getByText('Fernanda Souza')).toBeInTheDocument();
  });

  it('calls onQueryChange as the user types while open', async () => {
    const onQueryChange = vi.fn();
    render(<Controlled onQueryChange={onQueryChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.type(input, 'Fer');

    expect(onQueryChange).toHaveBeenCalledWith('F');
  });

  it('selects an option on click, closing the list and showing its label', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('textbox'));
    await userEvent.click(screen.getByText('Fernanda Souza'));

    expect(screen.getByRole('textbox')).toHaveValue('Fernanda Souza');
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();
  });

  it('shows a clear button once something is selected, and clears it on click', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('textbox'));
    await userEvent.click(screen.getByText('Carlos Eduardo'));

    const clearButton = screen.getByLabelText('Limpar seleção');
    await userEvent.click(clearButton);

    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.queryByLabelText('Limpar seleção')).not.toBeInTheDocument();
  });

  it('shows the empty-results label when there are no options', async () => {
    render(<Controlled options={[]} emptyLabel="Nenhum cliente encontrado." />);
    await userEvent.click(screen.getByRole('textbox'));
    expect(screen.getByText('Nenhum cliente encontrado.')).toBeInTheDocument();
  });

  it('shows a loading message instead of the empty label while loading', async () => {
    render(<Controlled options={[]} loading />);
    await userEvent.click(screen.getByRole('textbox'));
    expect(screen.getByText('Buscando...')).toBeInTheDocument();
  });

  it('navigates and selects with the keyboard (ArrowDown, Enter)', async () => {
    render(<Controlled />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(input).toHaveValue('Fernanda Souza');
  });

  it('opens on ArrowDown when closed, and closes on Escape', async () => {
    render(<Controlled />);
    const input = screen.getByRole('textbox');
    input.focus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();

    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();
  });

  it('closes the list when clicking outside the combobox', async () => {
    render(
      <div>
        <Controlled />
        <button>Fora</button>
      </div>,
    );
    await userEvent.click(screen.getByRole('textbox'));
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();
  });

  it('does not open the list when disabled', async () => {
    render(<Controlled disabled />);
    await userEvent.click(screen.getByRole('textbox'));
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();
  });
});
