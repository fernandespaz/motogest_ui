import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePerfis, useDeletePerfil } from '@/hooks/usePerfis';
import { toast } from '@/store/toastStore';
import { PerfisPage } from './PerfisPage';

vi.mock('@/hooks/usePerfis', () => ({
  usePerfis: vi.fn(),
  useDeletePerfil: vi.fn(),
  useCreatePerfil: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdatePerfil: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  usePermissoesDisponiveis: vi.fn(() => ({ data: [] })),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const perfis = [
  { id: 1, nome: 'Administrador', descricao: 'Acesso total', permissoes: [{ codigo: 'CLIENTE_READ' }] },
  { id: 2, nome: 'Mecânico', descricao: null, permissoes: [] },
];

describe('PerfisPage', () => {
  let deleteMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(usePerfis).mockReturnValue({ data: perfis, isLoading: false } as never);
    deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeletePerfil).mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false } as never);
  });

  it('lists perfis with their descrição and permission count', () => {
    render(<PerfisPage />);
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('Acesso total')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('falls back to an em-dash when descrição is missing', () => {
    render(<PerfisPage />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('opens the create modal from "Novo perfil"', async () => {
    render(<PerfisPage />);
    await userEvent.click(screen.getByRole('button', { name: /Novo perfil/ }));
    expect(screen.getByText('Novo perfil de acesso')).toBeInTheDocument();
  });

  it('opens the edit modal when a row is clicked', async () => {
    render(<PerfisPage />);
    await userEvent.click(screen.getByText('Administrador'));
    expect(screen.getByText('Editar perfil de acesso')).toBeInTheDocument();
  });

  it('confirms and deletes a perfil', async () => {
    render(<PerfisPage />);
    const row = screen.getByText('Mecânico').closest('tr')!;
    await userEvent.click(row.querySelectorAll('button')[1]);
    expect(screen.getByText('Remover perfil')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));

    expect(deleteMutateAsync).toHaveBeenCalledWith(2);
    expect(toast.success).toHaveBeenCalledWith('Perfil removido.');
  });

  it('toasts an error when the delete fails', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new Error('perfil em uso'));
    render(<PerfisPage />);
    const row = screen.getByText('Mecânico').closest('tr')!;
    await userEvent.click(row.querySelectorAll('button')[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));

    expect(toast.error).toHaveBeenCalledWith('perfil em uso');
  });

  it('closes the modal via Cancelar', async () => {
    render(<PerfisPage />);
    await userEvent.click(screen.getByRole('button', { name: /Novo perfil/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitForElementToBeRemoved(() => screen.queryByText('Novo perfil de acesso'));
  });

  it('shows the empty state when there are no perfis', () => {
    vi.mocked(usePerfis).mockReturnValue({ data: [], isLoading: false } as never);
    render(<PerfisPage />);
    expect(screen.getByText('Nenhum perfil cadastrado')).toBeInTheDocument();
  });
});
