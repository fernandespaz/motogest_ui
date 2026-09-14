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
