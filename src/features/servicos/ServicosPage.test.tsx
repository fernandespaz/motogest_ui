import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodosServicos, useDeleteServico } from '@/hooks/useServicos';
import { toast } from '@/store/toastStore';
import { ServicosPage } from './ServicosPage';

vi.mock('@/hooks/useServicos', () => ({
  useTodosServicos: vi.fn(),
  useDeleteServico: vi.fn(),
  useCreateServico: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateServico: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const servicos = [{ id: 1, nome: 'Troca de Óleo', preco: 120, duracaoMinutos: 30, ativo: true }];

describe('ServicosPage', () => {
  let deleteMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(useTodosServicos).mockReturnValue({ data: servicos, isLoading: false } as never);
    deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeleteServico).mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false } as never);
  });

  it('lists servicos with their formatted price and status', () => {
    render(<ServicosPage />);
    expect(screen.getByText('Troca de Óleo')).toBeInTheDocument();
    expect(screen.getByText('R$ 120,00')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('opens the create modal from "Novo serviço"', async () => {
    render(<ServicosPage />);
    await userEvent.click(screen.getByRole('button', { name: /Novo serviço/ }));
    expect(screen.getByText('Novo serviço', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens the edit modal when a row is clicked', async () => {
    render(<ServicosPage />);
    await userEvent.click(screen.getByText('Troca de Óleo'));
    expect(screen.getByText('Editar serviço')).toBeInTheDocument();
  });

  it('confirms and deletes a serviço, toasting success', async () => {
    render(<ServicosPage />);
    const row = screen.getByText('Troca de Óleo').closest('tr')!;
    const trashButton = row.querySelectorAll('button')[1];
    await userEvent.click(trashButton);

    expect(screen.getByText('Remover serviço')).toBeInTheDocument();
    // "Remover" agora também é o nome acessível do ícone de ação da linha
    // (IconActionButton) — o botão de confirmação do diálogo é o último a
    // aparecer no DOM.
    const confirmButtons = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(deleteMutateAsync).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('Serviço removido.');
  });

  it('shows the empty state when there are no servicos', () => {
    vi.mocked(useTodosServicos).mockReturnValue({ data: [], isLoading: false } as never);
    render(<ServicosPage />);
    expect(screen.getByText('Nenhum serviço cadastrado')).toBeInTheDocument();
  });

  it('opens the edit modal from the row’s pencil button, without triggering the row-click handler too', async () => {
    render(<ServicosPage />);
    const row = screen.getByText('Troca de Óleo').closest('tr')!;
    const editButton = row.querySelectorAll('button')[0];

    await userEvent.click(editButton);

    expect(screen.getByText('Editar serviço')).toBeInTheDocument();
  });

  it('toasts an error and keeps the confirm dialog data when the delete fails', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new Error('em uso por uma OS'));
    render(<ServicosPage />);
    const row = screen.getByText('Troca de Óleo').closest('tr')!;
    await userEvent.click(row.querySelectorAll('button')[1]);
    const confirmButtons = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(toast.error).toHaveBeenCalledWith('em uso por uma OS');
    expect(screen.getByText('Remover serviço')).toBeInTheDocument();
  });

  it('closes the create/edit modal via its own Cancelar', async () => {
    render(<ServicosPage />);
    await userEvent.click(screen.getByRole('button', { name: /Novo serviço/ }));
    expect(screen.getByText('Novo serviço', { selector: 'h2' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Novo serviço', { selector: 'h2' }));
  });

  it('dismisses the delete confirmation via Cancelar', async () => {
    render(<ServicosPage />);
    const row = screen.getByText('Troca de Óleo').closest('tr')!;
    await userEvent.click(row.querySelectorAll('button')[1]);
    expect(screen.getByText('Remover serviço')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Remover serviço'));
  });

  // GET /servicos não tem filtro de busca no backend (só pageable) — a busca
  // e a paginação abaixo são inteiramente locais, sobre o catálogo inteiro já
  // carregado por useTodosServicos (ver comentário na própria página).
  it('paginates a full 21-item catalog fetched all at once', async () => {
    const muitos = Array.from({ length: 21 }, (_, i) => ({
      id: i + 1,
      nome: `Serviço ${i + 1}`,
      preco: 100,
      duracaoMinutos: 30,
      ativo: true,
    }));
    vi.mocked(useTodosServicos).mockReturnValue({ data: muitos, isLoading: false } as never);
    render(<ServicosPage />);

    expect(screen.getByText('21 registros')).toBeInTheDocument();
    expect(screen.getAllByText(/^Serviço \d+$/)).toHaveLength(20);
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(screen.getByText('Serviço 21')).toBeInTheDocument();
  });

  it('filters by nome and resets to the first page', async () => {
    const varios = [
      { id: 1, nome: 'Troca de Óleo', preco: 120, duracaoMinutos: 30, ativo: true },
      { id: 2, nome: 'Alinhamento', preco: 80, duracaoMinutos: 20, ativo: true },
    ];
    vi.mocked(useTodosServicos).mockReturnValue({ data: varios, isLoading: false } as never);
    render(<ServicosPage />);

    await userEvent.type(screen.getByPlaceholderText('Buscar serviço por nome...'), 'óleo');

    expect(screen.getByText('Troca de Óleo')).toBeInTheDocument();
    expect(screen.queryByText('Alinhamento')).not.toBeInTheDocument();
  });
});
