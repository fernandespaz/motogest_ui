import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConcluirCadastroOrcamento } from '@/hooks/useOrcamentos';
import { toast } from '@/store/toastStore';
import type { OrcamentoResponse } from '@/api/types';
import { ConcluirCadastroModal } from './ConcluirCadastroModal';

vi.mock('@/hooks/useOrcamentos', () => ({ useConcluirCadastroOrcamento: vi.fn() }));
vi.mock('@/hooks/useClientes', () => ({
  useClientes: vi.fn(() => ({ data: { content: [] } })),
  useVeiculosDoCliente: vi.fn(() => ({ data: [] })),
}));
// Os campos do veículo incluem a busca por placa e o catálogo de modelos: aqui a consulta está indisponível.
vi.mock('@/hooks/usePlacas', () => {
  const mutacao = () => ({ mutateAsync: vi.fn(), isPending: false, data: undefined, reset: vi.fn() });
  return { useCarteiraPlacas: () => ({ data: undefined }), useConsultarPlaca: mutacao, useConsultarChassi: mutacao };
});
vi.mock('@/features/shared/ModeloVeiculoField', () => ({ ModeloVeiculoField: () => null }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/store/authStore', () => ({ useAuthStore: (sel: (s: unknown) => unknown) => sel({ hasPermission: () => true }) }));

const orcamento = {
  id: 42,
  status: 'RASCUNHO',
  interessadoNome: 'Joao Interessado',
  interessadoTelefone: '(11) 99999-1111',
  veiculoPlaca: 'jkl4m56',
  veiculoDescricao: 'Honda CG 160',
  veiculoCategoria: 'B',
} as OrcamentoResponse;

describe('ConcluirCadastroModal', () => {
  const mutateAsync = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue({ ...orcamento, clienteId: 1, veiculoId: 2 });
    vi.mocked(useConcluirCadastroOrcamento).mockReturnValue({ mutateAsync, isPending: false } as never);
  });

  it('abre com o que já foi digitado no rascunho e pede só o documento que falta', async () => {
    render(<ConcluirCadastroModal open onClose={onClose} orcamento={orcamento} />);
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Joao Interessado');
    expect(screen.getByLabelText(/^Placa/)).toHaveValue('JKL4M56');
    expect(screen.getByLabelText(/^Categoria/)).toHaveValue('B');

    await userEvent.click(screen.getByRole('button', { name: 'Concluir cadastro' }));
    expect(await screen.findByText('CPF deve ter 11 dígitos')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('envia cliente e veículo novos num único pedido e fecha', async () => {
    render(<ConcluirCadastroModal open onClose={onClose} orcamento={orcamento} />);
    await userEvent.type(screen.getByLabelText(/^CPF/), '52998224725');
    await userEvent.click(screen.getByRole('button', { name: 'Concluir cadastro' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      id: 42,
      payload: {
        cliente: expect.objectContaining({ nome: 'Joao Interessado', documento: '52998224725', tipoPessoa: 'PF' }),
        veiculo: expect.objectContaining({ placa: 'JKL4M56', categoria: 'B' }),
      },
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it('mostra o erro do servidor e mantém o painel aberto', async () => {
    mutateAsync.mockRejectedValue({ response: { data: { message: 'Ja existe um veiculo cadastrado com esta placa' } } });
    render(<ConcluirCadastroModal open onClose={onClose} orcamento={orcamento} />);
    await userEvent.type(screen.getByLabelText(/^CPF/), '52998224725');
    await userEvent.click(screen.getByRole('button', { name: 'Concluir cadastro' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
