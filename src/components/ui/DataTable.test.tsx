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

  // Usado por telas onde selecionar uma linha e confirmar a ação são etapas
  // separadas (ex.: FaturarOSModal) — o destaque precisa ser só visual, sem
  // afetar `onRowClick`, que continua dependendo inteiramente do call site.
  it('highlights only the row isRowSelected marks as selected, without changing onRowClick', async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
        isRowSelected={(r) => r.id === 2}
      />,
    );

    expect(screen.getByText('Carlos').closest('tr')).not.toHaveClass('bg-brand-50');
    expect(screen.getByText('Fernanda').closest('tr')).toHaveClass('bg-brand-50');

    await userEvent.click(screen.getByText('Carlos'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('linha clicável abre também por teclado (Enter/Espaço), mas Enter num botão dentro da linha não a abre', async () => {
    const onRowClick = vi.fn();
    const comAcao: Column<Row>[] = [...columns, { header: '', render: () => <button type="button" onClick={(e) => e.stopPropagation()}>Remover</button> }];
    render(<DataTable columns={comAcao} rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick} />);

    const linha = screen.getByText('Carlos').closest('tr')!;
    expect(linha).toHaveAttribute('tabindex', '0');
    linha.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(' ');
    expect(onRowClick).toHaveBeenCalledTimes(2);

    screen.getAllByRole('button', { name: 'Remover' })[0].focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('linha sem onRowClick não entra na ordem de tabulação; coluna sem título ganha nome "Ações" para leitor de tela', () => {
    const comAcao: Column<Row>[] = [...columns, { header: '', render: () => null }];
    render(<DataTable columns={comAcao} rows={rows} rowKey={(r) => r.id} />);
    expect(screen.getByText('Carlos').closest('tr')).not.toHaveAttribute('tabindex');
    expect(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument();
  });

  it('has no selection highlight at all when isRowSelected is not passed', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />);

    expect(screen.getByText('Carlos').closest('tr')).not.toHaveClass('bg-brand-50');
  });
});
