import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAtualizarOficina,
  useEnviarLogoOficina,
  useOficinaAtual,
  useOficinaLogoSrc,
  useRemoverLogoOficina,
} from '@/hooks/useOficina';
import { toast } from '@/store/toastStore';
import { OficinaDadosTab } from './OficinaDadosTab';

vi.mock('@/hooks/useOficina', () => ({
  useOficinaAtual: vi.fn(),
  useAtualizarOficina: vi.fn(),
  useOficinaLogoSrc: vi.fn(),
  useEnviarLogoOficina: vi.fn(),
  useRemoverLogoOficina: vi.fn(),
}));
vi.mock('@/store/toastStore', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mutacao = { mutateAsync: vi.fn(), isPending: false };

describe('OficinaDadosTab — código de acesso', () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(useOficinaAtual).mockReturnValue({
      isLoading: false,
      data: { razaoSocial: 'Ram Tec', nomeFantasia: 'Ram Tec', email: 'a@b.com', cnpj: '25937653000122', codigoAcesso: 'RAMTEC' },
    } as never);
    vi.mocked(useAtualizarOficina).mockReturnValue(mutacao as never);
    vi.mocked(useOficinaLogoSrc).mockReturnValue(undefined);
    vi.mocked(useEnviarLogoOficina).mockReturnValue(mutacao as never);
    vi.mocked(useRemoverLogoOficina).mockReturnValue(mutacao as never);
  });

  it('mostra o código gerado só para leitura, até pedir para alterar', async () => {
    render(<OficinaDadosTab />);

    const campo = screen.getByLabelText(/Código de acesso/);
    expect(campo).toHaveValue('RAMTEC');
    expect(campo).toHaveAttribute('readonly');

    await userEvent.click(screen.getByRole('button', { name: 'Alterar' }));
    expect(screen.getByLabelText(/Código de acesso/)).not.toHaveAttribute('readonly');
    expect(screen.getByText(/o link antigo deixa de valer/)).toBeInTheDocument();
  });

  it('copia o link de acesso com a oficina preenchida', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
    render(<OficinaDadosTab />);

    await userEvent.click(screen.getByRole('button', { name: /Copiar link/ }));

    expect(escrever).toHaveBeenCalledWith(`${window.location.origin}/login?oficina=RAMTEC`);
    expect(toast.success).toHaveBeenCalledWith('Link de acesso copiado.');
  });
});
