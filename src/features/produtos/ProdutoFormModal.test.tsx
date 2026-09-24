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

const CODIGO_GERADO_RE = /^\d{8}$/;

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

  it('auto-generates a short numeric read-only código for a new produto', () => {
    render(<ProdutoFormModal open onClose={vi.fn()} produto={null} />);
    const codigoInput = screen.getByLabelText(/^Código/) as HTMLInputElement;
    expect(codigoInput).toHaveAttribute('readonly');
    expect(codigoInput.value).toMatch(CODIGO_GERADO_RE);
  });

  it('keeps código read-only when editing, preserving the existing value', () => {
    render(
      <ProdutoFormModal
        open
        onClose={vi.fn()}
        produto={{ id: 1, codigo: 'OL-001', nome: 'Óleo Motor', precoVenda: 32, estoqueMinimo: 10, ativo: true } as never}
      />,
    );
    const codigoInput = screen.getByDisplayValue('OL-001') as HTMLInputElement;
    expect(codigoInput).toHaveAttribute('readonly');
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

  it('shows a validation error for the required nome field', async () => {
    render(<ProdutoFormModal open onClose={vi.fn()} produto={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('creates a new produto with an auto-generated numeric código and the filled fields', async () => {
    const onClose = vi.fn();
    render(<ProdutoFormModal open onClose={onClose} produto={null} />);

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Filtro de Óleo');
    await userEvent.selectOptions(screen.getByLabelText('Unidade de medida'), 'PC');
    await userEvent.type(screen.getByLabelText(/Preço de venda/), '25');
    await userEvent.type(screen.getByLabelText(/Estoque mínimo/), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: expect.stringMatching(CODIGO_GERADO_RE),
        nome: 'Filtro de Óleo',
        unidadeMedida: 'PC',
        precoVenda: 25,
        estoqueMinimo: 5,
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Produto cadastrado.');
    expect(onClose).toHaveBeenCalled();
    // margemLucro é só um auxiliar de UI para calcular precoVenda — nunca vai no payload.
    expect(createMutateAsync.mock.calls[0][0]).not.toHaveProperty('margemLucro');
    // Sem categoria selecionada, o "" do select não pode ir como valor do enum.
    expect(createMutateAsync.mock.calls[0][0].categoria).toBeUndefined();
  });

  it('sends the selected categoria', async () => {
    render(<ProdutoFormModal open onClose={vi.fn()} produto={null} />);

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Filtro de Óleo');
    await userEvent.type(screen.getByLabelText(/Preço de venda/), '25');
    await userEvent.type(screen.getByLabelText(/Estoque mínimo/), '5');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'FILTROS');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'FILTROS' }));
  });

  it('calculates preço de venda from preço de custo and margem de lucro', async () => {
    render(<ProdutoFormModal open onClose={vi.fn()} produto={null} />);

    await userEvent.type(screen.getByLabelText(/Preço de custo/), '100');
    await userEvent.type(screen.getByLabelText(/Margem de lucro/), '20');

    await waitFor(() => expect(screen.getByLabelText(/Preço de venda/)).toHaveValue(120));
  });

  it('offers the existing value as an extra option when a legacy unidadeMedida is not in the dropdown list', () => {
    render(
      <ProdutoFormModal
        open
        onClose={vi.fn()}
        produto={{ id: 1, codigo: 'OL-001', nome: 'Óleo Motor', unidadeMedida: 'BALDE-20L', precoVenda: 32, estoqueMinimo: 10 } as never}
      />,
    );
    expect(screen.getByLabelText('Unidade de medida')).toHaveValue('BALDE-20L');
  });

  it('prefills the categoria select when editing', () => {
    render(
      <ProdutoFormModal
        open
        onClose={vi.fn()}
        produto={{ id: 1, codigo: 'OL-001', nome: 'Óleo Motor', precoVenda: 32, estoqueMinimo: 10, categoria: 'FREIOS' } as never}
      />,
    );
    expect(screen.getByLabelText('Categoria')).toHaveValue('FREIOS');
  });

  it('does not rewrite precoVenda just from opening an existing produto with custo and venda already set', async () => {
    render(
      <ProdutoFormModal
        open
        onClose={vi.fn()}
        produto={
          { id: 9, codigo: 'OL-001', nome: 'Óleo Motor', precoCusto: 19.9, precoVenda: 29.9, estoqueMinimo: 10 } as never
        }
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, payload: expect.objectContaining({ precoVenda: 29.9 }) }),
    );
  });

  it('recalculates precoVenda when the user edits margem de lucro while editing an existing produto', async () => {
    render(
      <ProdutoFormModal
        open
        onClose={vi.fn()}
        produto={
          { id: 9, codigo: 'OL-001', nome: 'Óleo Motor', precoCusto: 100, precoVenda: 120, estoqueMinimo: 10 } as never
        }
      />,
    );

    const margemInput = screen.getByLabelText(/Margem de lucro/);
    await userEvent.clear(margemInput);
    await userEvent.type(margemInput, '50');

    await waitFor(() => expect(screen.getByLabelText(/Preço de venda/)).toHaveValue(150));
  });

  it('updates an existing produto by id, keeping its código', async () => {
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

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Filtro de Óleo');
    await userEvent.type(screen.getByLabelText(/Preço de venda/), '25');
    await userEvent.type(screen.getByLabelText(/Estoque mínimo/), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('código duplicado'));
  });
});
