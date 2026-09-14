import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Package } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type Column } from './DataTable';

interface Row {
  id: number;
  nome: string;
}

const columns: Column<Row>[] = [
  { header: 'Nome', render: (r) => r.nome },
  { header: 'Detalhe', render: (r) => `#${r.id}`, hideBelow: 'md' },
];

const rows: Row[] = [
  { id: 1, nome: 'Carlos' },
  { id: 2, nome: 'Fernanda' },
];

describe('DataTable', () => {
  it('shows a loading spinner while loading, before checking for empty rows', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} loading />);
    expect(screen.getByText('Carregando registros...')).toBeInTheDocument();
  });

  it('shows the default empty state when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} />);
    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
  });

  it('shows a custom empty state (icon, title, description, action)', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        emptyIcon={Package}
        emptyTitle="Nenhum produto"
        emptyDescription="Cadastre o primeiro."
        emptyAction={<button>Adicionar</button>}
      />,
    );
    expect(screen.getByText('Nenhum produto')).toBeInTheDocument();
    expect(screen.getByText('Cadastre o primeiro.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });

  it('renders a header and a row per item, with each column’s render output', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />);

    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('calls onRowClick with the clicked row', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick} />);

    await userEvent.click(screen.getByText('Carlos'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});
