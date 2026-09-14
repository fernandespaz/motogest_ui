import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs, TabPanel } from './Tabs';

const tabs = [
  { key: 'dados', label: 'Dados' },
  { key: 'itens', label: 'Itens' },
];

describe('Tabs', () => {
  it('renders every tab label', () => {
    render(<Tabs tabs={tabs} active="dados" onChange={vi.fn()} />);
    expect(screen.getByText('Dados')).toBeInTheDocument();
    expect(screen.getByText('Itens')).toBeInTheDocument();
  });

  it('calls onChange with the clicked tab key', async () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="dados" onChange={onChange} />);

    await userEvent.click(screen.getByText('Itens'));
    expect(onChange).toHaveBeenCalledWith('itens');
  });

  // Tabs é usado dentro de <form> (ex.: as abas Serviços/Peças de ItemsEditor,
  // que vive dentro do form de Orçamento/OS) — sem type="button" explícito, um
  // <button> sem tipo é type="submit" por padrão, e clicar na aba disparava o
  // submit do formulário inteiro (salvava e navegava pra longe da tela).
  it('never submits an ancestor form when a tab is clicked', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Tabs tabs={tabs} active="dados" onChange={vi.fn()} />
      </form>,
    );

    await userEvent.click(screen.getByText('Itens'));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('TabPanel', () => {
  it('renders children when not hidden', () => {
    render(<TabPanel hidden={false}>Conteúdo</TabPanel>);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('renders nothing when hidden', () => {
    const { container } = render(<TabPanel hidden>Conteúdo</TabPanel>);
    expect(container).toBeEmptyDOMElement();
  });
});
