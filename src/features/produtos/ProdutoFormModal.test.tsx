import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateProduto, useUpdateProduto } from '@/hooks/useProdutos';
import { toast } from '@/store/toastStore';
import { ProdutoFormModal } from './ProdutoFormModal';

vi.mock('@/hooks/useProdutos', () => ({
  useCreateProduto: vi.fn(),
  useUpdateProduto: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('ProdutoFormModal', () => {
  let createMutateAsync: ReturnType<typeof vi.fn>;
  let updateMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    updateMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
    vi.mocked(useCreateProduto).mockReturnValue({ mutateAsync: createMutateAsync, isPending: false } as never);
    vi.mocked(useUpdateProduto).mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false } as never);
  });

  it('renders empty for a new produto, without the "ativo" toggle', () => {
    render(<ProdutoFormModal open onClose={vi.fn()} produto={null} />);
    expect(screen.getByText('Novo produto')).toBeInTheDocument();
    expect(screen.queryByLabelText('Produto ativo')).not.toBeInTheDocument();
  });

  it('prefills the form and shows the "ativo" toggle when editing', () => {
    render(
      <ProdutoFormModal
        open
        onClose={vi.fn()}
        produto={{ id: 1, codigo: 'OL-001', nome: 'Óleo Motor', precoVenda: 32, estoqueMinimo: 10, ativo: true } as never}
      />,
    );
    expect(screen.getByText('Editar produto')).toBeInTheDocument();
    expect(screen.getByDisplayValue('OL-001')).toBeInTheDocument();
    expect(screen.getByLabelText('Produto ativo')).toBeInTheDocument();
  });

  it('shows validation errors for the required fields', async () => {
    render(<ProdutoFormModal open onClose={vi.fn()} produto={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o código')).toBeInTheDocument();
    expect(screen.getByText('Informe o nome')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('creates a new produto with the filled fields', async () => {
    const onClose = vi.fn();
    render(<ProdutoFormModal open onClose={onClose} produto={null} />);

    await userEvent.type(screen.getByLabelText(/^Código/), 'PN-010');
    await userEvent.type(screen.getByLabelText(/^Nome/), 'Filtro de Óleo');
    await userEvent.type(screen.getByLabelText(/Preço de venda/), '25');
    await userEvent.type(screen.getByLabelText(/Estoque mínimo/), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'PN-010', nome: 'Filtro de Óleo', precoVenda: 25, estoqueMinimo: 5 }),
    );
    expect(toast.success).toHaveBeenCalledWith('Produto cadastrado.');
    expect(onClose).toHaveBeenCalled();
  });

  it('updates an existing produto by id', async () => {
    render(
      <ProdutoFormModal
        open
        onClose={vi.fn()}
        produto={{ id: 9, codigo: 'OL-001', nome: 'Óleo Motor', precoVenda: 32, estoqueMinimo: 10 } as never}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, payload: expect.objectContaining({ codigo: 'OL-001' }) }),
    );
    expect(toast.success).toHaveBeenCalledWith('Produto atualizado.');
  });

  it('toasts an error when saving fails', async () => {
    createMutateAsync.mockRejectedValueOnce(new Error('código duplicado'));
    render(<ProdutoFormModal open onClose={vi.fn()} produto={null} />);

    await userEvent.type(screen.getByLabelText(/^Código/), 'PN-010');
    await userEvent.type(screen.getByLabelText(/^Nome/), 'Filtro de Óleo');
    await userEvent.type(screen.getByLabelText(/Preço de venda/), '25');
    await userEvent.type(screen.getByLabelText(/Estoque mínimo/), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('código duplicado'));
  });
});
