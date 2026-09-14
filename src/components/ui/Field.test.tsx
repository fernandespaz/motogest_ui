import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Search } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { FieldWrapper, Input, Textarea, Select, Checkbox } from './Field';

describe('FieldWrapper', () => {
  it('renders the label with a required marker', () => {
    render(
      <FieldWrapper label="Nome" required>
        <input />
      </FieldWrapper>,
    );
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('prefers the error message over the hint when both are given', () => {
    render(
      <FieldWrapper label="Nome" error="Campo obrigatório" hint="Nome completo do cliente">
        <input />
      </FieldWrapper>,
    );
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
    expect(screen.queryByText('Nome completo do cliente')).not.toBeInTheDocument();
  });

  it('shows the hint when there is no error', () => {
    render(
      <FieldWrapper label="Nome" hint="Nome completo do cliente">
        <input />
      </FieldWrapper>,
    );
    expect(screen.getByText('Nome completo do cliente')).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('renders with a label and forwards typed input', async () => {
    render(<Input label="Nome" onChange={vi.fn()} />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Carlos');
    expect(input).toHaveValue('Carlos');
  });

  it('renders a leading icon when given', () => {
    const { container } = render(<Input icon={Search} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the dark variant without crashing', () => {
    render(<Input label="Nome" variant="dark" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

describe('Textarea', () => {
  it('renders with a label and error message', () => {
    render(<Textarea label="Observações" error="Muito curto" />);
    expect(screen.getByText('Observações')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('Muito curto')).toBeInTheDocument();
  });
});

describe('Select', () => {
  it('renders its options', () => {
    render(
      <Select label="Status">
        <option value="ABERTA">Aberta</option>
        <option value="CONCLUIDA">Concluída</option>
      </Select>,
    );
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Concluída' })).toBeInTheDocument();
  });
});

describe('Checkbox', () => {
  it('renders its label and toggles when clicked', async () => {
    render(<Checkbox label="Ativo" onChange={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Ativo' });
    expect(checkbox).not.toBeChecked();

    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
