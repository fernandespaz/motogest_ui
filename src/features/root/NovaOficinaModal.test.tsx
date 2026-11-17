import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCriarOficinaAdmin } from '@/hooks/useOficinasAdmin';
import { toast } from '@/store/toastStore';
import { NovaOficinaModal } from './NovaOficinaModal';

vi.mock('@/hooks/useOficinasAdmin', () => ({ useCriarOficinaAdmin: vi.fn() }));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

async function preencherEEnviar() {
  await userEvent.type(screen.getByLabelText(/^Razão social/), 'Ram Tec LTDA');
  await userEvent.type(screen.getByLabelText(/^CNPJ/), '25937653000122');
  await userEvent.type(screen.getByLabelText(/^E-mail da oficina/), 'contato@ramtec.com.br');
  await userEvent.type(screen.getByLabelText(/^Nome\s*\*?$/), 'Diego');
  await userEvent.type(screen.getByLabelText(/^E-mail do administrador/), 'diego@ramtec.com.br');
  await userEvent.type(screen.getByLabelText(/^Senha/), 'Senha@123');
  await userEvent.type(screen.getByLabelText(/^Confirmar senha/), 'Senha@123');
  await userEvent.click(screen.getByRole('button', { name: 'Cadastrar oficina' }));
}

describe('NovaOficinaModal — códigos gerados pelo sistema', () => {
  const criar = vi.fn();

  beforeEach(() => {
    criar.mockReset().mockResolvedValue({
      razaoSocial: 'Ram Tec LTDA',
      nomeFantasia: 'Ram Tec',
      codigoAcesso: '4829163',
      adminCodigo: '7351948',
    });
    vi.mocked(useCriarOficinaAdmin).mockReturnValue({ mutateAsync: criar, isPending: false } as never);
    vi.mocked(toast.success).mockClear();
  });

  it('depois de cadastrar, mostra o código da oficina e o do administrador, sem fechar', async () => {
    const onClose = vi.fn();
    render(<NovaOficinaModal open onClose={onClose} adminToken="token" />);

    await preencherEEnviar();

    expect(await screen.findByText('Oficina cadastrada')).toBeInTheDocument();
    expect(screen.getByTestId('codigo-Código da oficina')).toHaveTextContent('4829163');
    expect(screen.getByTestId('codigo-Código do administrador')).toHaveTextContent('7351948');
    expect(screen.getByText(/não podem ser alterados/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('o formulário não pede nem envia código nenhum: quem gera é o sistema', async () => {
    render(<NovaOficinaModal open onClose={vi.fn()} adminToken="token" />);

    await preencherEEnviar();

    await waitFor(() => expect(criar).toHaveBeenCalled());
    const enviado = criar.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(enviado)).not.toContain('codigoAcesso');
    expect(Object.keys(enviado)).not.toContain('codigo');
  });

  it('o botão Concluir fecha o diálogo; reabrir volta ao formulário limpo', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<NovaOficinaModal open onClose={onClose} adminToken="token" />);
    await preencherEEnviar();
    await userEvent.click(await screen.findByRole('button', { name: 'Concluir' }));
    expect(onClose).toHaveBeenCalled();

    rerender(<NovaOficinaModal open={false} onClose={onClose} adminToken="token" />);
    rerender(<NovaOficinaModal open onClose={onClose} adminToken="token" />);

    expect(await screen.findByText('Nova oficina')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Razão social/)).toHaveValue('');
  });
});
